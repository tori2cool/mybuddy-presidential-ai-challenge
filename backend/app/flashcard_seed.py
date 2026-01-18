from __future__ import annotations

# backend/app/flashcard_seed.py
import asyncio
import hashlib
import json
import logging
import random
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

import redis
from openai import AsyncOpenAI

from app.config import settings
from app.db import get_engine
from app.models import AgeRange, Flashcard, Subject, SubjectAgeRange
from app.services.ai_flashcard_generator import FlashcardGenerator
from app.services.topic_catalog import get_or_create_topic_catalog, select_topics_for_batch

logger = logging.getLogger(__name__)

# Where your seed loader reads from:
# backend/app/seed_data/flashcards/*.json
SEED_DATA_DIR = Path(__file__).resolve().parent / "seed_data"
FLASHCARDS_DIR = SEED_DATA_DIR / "flashcards"


@dataclass(frozen=True)
class GenSpec:
    subject_name: str
    age_range_name: str
    difficulty: str = "easy"
    count: int = 5


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _subject_seed_path(subject_code: str) -> Path:
    """
    Canonical seed file path for a subject.

    Requirement from seed loader: backend/app/seed_data/flashcards/<subject_code>.json
    (e.g. math.json, science.json, reading.json, history.json)
    """
    return FLASHCARDS_DIR / f"{subject_code}.json"


def _read_existing(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path} must contain a JSON list")
    return data  # type: ignore[return-value]


def _write_json_list(path: Path, rows: list[dict[str, Any]]) -> None:
    logger.info("Writing seed JSON: %s rows -> %s", len(rows), path.resolve())
    with path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    try:
        size = path.stat().st_size
    except OSError:
        size = None

    if size is None:
        logger.info("Wrote seed JSON: %s rows -> %s", len(rows), path.resolve())
    else:
        logger.info("Wrote seed JSON: %s rows -> %s (%s bytes)", len(rows), path.resolve(), size)


def _dedupe(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Deduplicate by (subject, age_range, difficulty, question) case-insensitive.
    Keeps first occurrence.
    """
    seen: set[tuple[str, str, str, str]] = set()
    out: list[dict[str, Any]] = []
    for r in rows:
        subj = str(r.get("subject", "")).strip()
        age = str(r.get("age_range", "")).strip()
        diff = str(r.get("difficulty", "")).strip()
        q = str(r.get("question", "")).strip()
        key = (subj.casefold(), age.casefold(), diff.casefold(), q.casefold())
        if not subj or not age or not diff or not q:
            out.append(r)
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def _is_valid_mcq_row(row: Any) -> bool:
    """
    Validate MCQ seed row shape (does not validate subject/age_range/difficulty values).

    Required keys:
    - question: str non-empty
    - choices: list[str] length 4, non-empty
    - correct_index: int 0..3
    - explanations: list[str] length 4, non-empty
    - tags: list (strings)
    """
    if not isinstance(row, dict):
        return False

    q = row.get("question")
    if not isinstance(q, str) or not q.strip():
        return False

    choices = row.get("choices")
    if not isinstance(choices, list) or len(choices) != 4:
        return False
    for ch in choices:
        if not isinstance(ch, str) or not ch.strip():
            return False

    ci = row.get("correct_index")
    if not isinstance(ci, int) or not (0 <= ci <= 3):
        return False

    expl = row.get("explanations")
    if not isinstance(expl, list) or len(expl) != 4:
        return False
    for ex in expl:
        if not isinstance(ex, str) or not ex.strip():
            return False

    tags = row.get("tags")
    if not isinstance(tags, list):
        return False

    return True


def _stable_shuffle_seed(*parts: Any) -> int:
    joined = "||".join(str(p).strip() for p in parts if p is not None)
    digest = hashlib.sha256(joined.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big", signed=False)


def _shuffle_mcq_in_place(row: dict[str, Any], *, deterministic: bool = True) -> dict[str, Any]:
    """
    Shuffle choices+explanations together and update correct_index accordingly.

    If deterministic=True, shuffle order is stable based on question+subject+age_range+difficulty.
    """
    if not _is_valid_mcq_row(row):
        return row

    choices: list[str] = row["choices"]
    explanations: list[str] = row["explanations"]
    correct_index: int = row["correct_index"]

    correct_choice = choices[correct_index]
    correct_expl = explanations[correct_index]

    paired = list(zip(choices, explanations))

    rng = random.Random()
    if deterministic:
        rng.seed(
            _stable_shuffle_seed(
                str(row.get("subject", "")),
                str(row.get("age_range", "")),
                str(row.get("difficulty", "")),
                str(row.get("question", "")),
            )
        )
    else:
        rng.seed()

    for _ in range(6):
        rng.shuffle(paired)
        new_choices = [c for (c, _e) in paired]
        if new_choices[0] != correct_choice:
            break

    new_choices, new_explanations = zip(*paired)
    new_choices = list(new_choices)
    new_explanations = list(new_explanations)

    new_correct_index = new_choices.index(correct_choice)

    if new_explanations[new_correct_index] != correct_expl:
        try:
            idx = [(c, e) for (c, e) in zip(new_choices, new_explanations)].index((correct_choice, correct_expl))
            new_correct_index = idx
        except ValueError:
            pass

    row["choices"] = new_choices
    row["explanations"] = new_explanations
    row["correct_index"] = new_correct_index
    return row


def _normalize_seed_rows(rows: list[Any]) -> list[Any]:
    """
    Apply MCQ shuffling normalization to any valid MCQ rows.
    """
    out: list[dict[str, Any]] = []
    for r in rows:
        if isinstance(r, dict) and _is_valid_mcq_row(r):
            out.append(_shuffle_mcq_in_place(r, deterministic=True))
        else:
            out.append(r)
    return out


def _count_valid_matching_rows(
    rows: Iterable[dict[str, Any]],
    *,
    subject_name: str,
    age_range_name: str,
    difficulty: str,
) -> int:
    subj_cf = subject_name.strip().casefold()
    age_cf = age_range_name.strip().casefold()
    diff_cf = difficulty.strip().casefold()

    count = 0
    for r in rows:
        if not _is_valid_mcq_row(r):
            continue
        if str(r.get("subject", "")).strip().casefold() != subj_cf:
            continue
        if str(r.get("age_range", "")).strip().casefold() != age_cf:
            continue
        if str(r.get("difficulty", "")).strip().casefold() != diff_cf:
            continue
        count += 1
    return count


def _load_flashcards_from_folder(folder: Path) -> list[dict[str, Any]]:
    if not folder.exists():
        return []
    cards: list[dict[str, Any]] = []
    for path in sorted(folder.glob("*.json")):
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError(f"{path} must contain a JSON list")
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                raise ValueError(f"{path} item[{i}] must be an object")
        cards.extend(data)  # type: ignore[arg-type]
    return cards


async def insert_flashcards_from_seed_json() -> int:
    """
    Insert seed_data/flashcards/*.json into DB.
    Safe to run repeatedly (ON CONFLICT DO NOTHING).
    Returns number of rows attempted (not necessarily inserted).
    """
    engine = get_engine()
    async with engine.begin() as conn:
        subjects = (await conn.execute(select(Subject.name, Subject.id))).all()
        age_ranges = (await conn.execute(select(AgeRange.name, AgeRange.id))).all()
        subject_name_to_id = {name: sid for (name, sid) in subjects}
        age_range_name_to_id = {name: aid for (name, aid) in age_ranges}

        seed_cards = _load_flashcards_from_folder(FLASHCARDS_DIR)
        seed_cards = _normalize_seed_rows(seed_cards)

        rows: list[dict[str, Any]] = []
        for fc in seed_cards:
            sid = subject_name_to_id.get(fc.get("subject"))
            aid = age_range_name_to_id.get(fc.get("age_range"))
            if not sid or not aid:
                logger.warning(
                    "Skipping flashcard with unknown subject=%r or age_range=%r",
                    fc.get("subject"),
                    fc.get("age_range"),
                )
                continue

            rows.append(
                {
                    "subject_id": sid,
                    "age_range_id": aid,
                    "question": fc["question"],
                    "choices": fc.get("choices"),
                    "correct_index": fc.get("correct_index"),
                    "explanations": fc.get("explanations"),
                    "difficulty_code": fc["difficulty"],
                    "tags": fc.get("tags"),
                }
            )

        if not rows:
            logger.info("No flashcard rows to insert.")
            return 0

        stmt = (
            insert(Flashcard)
            .values(rows)
            .on_conflict_do_nothing(index_elements=["subject_id", "question", "difficulty_code", "age_range_id"])
        )
        await conn.execute(stmt)
        logger.info("Flashcards: attempted %s inserts (ON CONFLICT DO NOTHING).", len(rows))
        return len(rows)


async def _fetch_subjects_age_ranges() -> tuple[
    list[tuple[str, str]],
    list[tuple[str, str, int | None, int | None]],
]:
    """
    Returns:
    - subjects: list of (subject_code, subject_name)
    - age_ranges: list of (age_range_code, age_range_name, min_age, max_age)

    NOTE: This does *not* apply SubjectAgeRange constraints. Callers that need
    allowed (subject, age_range) pairs should query SubjectAgeRange.
    """
    engine = get_engine()
    async with engine.begin() as conn:
        subjects = (await conn.execute(select(Subject.code, Subject.name).order_by(Subject.name))).all()
        age_ranges = (
            await conn.execute(
                select(AgeRange.code, AgeRange.name, AgeRange.min_age, AgeRange.max_age).order_by(AgeRange.min_age)
            )
        ).all()
    return list(subjects), list(age_ranges)


def _compact_topic_pool(selected: list[Any]) -> list[dict[str, Any]]:
    """
    Build a compact topic pool payload for the MCQ generator.

    This expects the NEW topic catalog shape:
      - topic
      - stem_templates
      - anchor_facts
      - misconceptions
      - keywords
    """
    pool: list[dict[str, Any]] = []
    for t in selected:
        # TopicItem is a dataclass in topic_catalog; we treat it duck-typed here.
        topic = getattr(t, "topic", None)
        if not isinstance(topic, str) or not topic.strip():
            continue

        stem_templates = getattr(t, "stem_templates", None)
        anchor_facts = getattr(t, "anchor_facts", None)
        misconceptions = getattr(t, "misconceptions", None)
        keywords = getattr(t, "keywords", None)

        # Keep it small but useful; MCQ generator uses these for grounding/distractors.
        pool.append(
            {
                "topic": topic.strip(),
                "stem_templates": list(stem_templates or [])[:3],
                "anchor_facts": list(anchor_facts or [])[:6],
                "misconceptions": list(misconceptions or [])[:4],
                "keywords": list(keywords or [])[:8],
            }
        )
    return pool


async def _generate_one(
    gen: FlashcardGenerator,
    spec: GenSpec,
    topic_tags: list[str],
    topic_pool: list[dict[str, Any]],
    *,
    age_range_code: str,
    max_attempts: int = 4,
) -> list[dict[str, Any]]:
    """
    Generate cards for one subject age_range with retry/backoff.
    Returns rows shaped for seed_data flashcards JSON.
    """
    delay = 1.0
    last_err: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            cards = await gen.generate_flashcards(
                subject=spec.subject_name,
                
                difficulty=spec.difficulty,
                topic_tags=topic_tags,
                topic_pool=topic_pool,
                count=spec.count,
                requested_difficulty=spec.difficulty,
                age_range_code=age_range_code,
                
                # Allow shortfalls; seed process will append what it got and a future run can fill gaps.
                enforce_exact_count=False,
            )

            seed_rows: list[dict[str, Any]] = []
            for c in cards:
                row = {
                    "subject": spec.subject_name,
                    "age_range": spec.age_range_name,
                    "difficulty": spec.difficulty,
                    "question": c["question"],
                    "choices": c["choices"],
                    "correct_index": c["correct_index"],
                    "explanations": c["explanations"],
                    "tags": c.get("tags") or [],
                }

                # Deterministic shuffle normalization (keeps seeds stable while avoiding bias)
                row = _shuffle_mcq_in_place(row, deterministic=True)
                seed_rows.append(row)

            return seed_rows

        except Exception as exc:
            # In seed runs we call the generator with enforce_exact_count=False; failures should not
            # burn retries here (generator will best-effort salvage or return []).
            logger.warning(
                "Flashcard gen failed (non-fatal; returning []) subject=%r age_range=%r: %s",
                spec.subject_name,
                spec.age_range_name,
                exc,
            )
            return []

    # Unreachable, but keeps type-checkers happy.
    return []


async def generate_all_easy_flashcards(*, per_pair: int = 5) -> None:
    """
    Main entry point:
    - for each allowed Subject × AgeRange (via SubjectAgeRange) at difficulty='easy':
      - load existing canonical seed file backend/app/seed_data/flashcards/<subject_code>.json
      - count VALID rows for that subject+age_range+difficulty
      - if count >= per_pair: skip OpenAI
      - else generate only the missing number
      - append, dedupe, normalize shuffle, and write back to same canonical file

    SubjectAgeRange is the source of truth for which (subject, age_range) pairs are valid.
    """
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    _ensure_dir(FLASHCARDS_DIR)

    subjects, age_ranges = await _fetch_subjects_age_ranges()
    if not subjects or not age_ranges:
        raise RuntimeError("No subjects or age ranges found in DB. Seed baseline first.")

    # Build allowed pairs from SubjectAgeRange (subject_code -> set(age_range_name))
    engine = get_engine()
    async with engine.begin() as conn:
        sar_rows = (
            await conn.execute(
                select(
                    Subject.code,
                    Subject.name,
                    AgeRange.code,
                    AgeRange.name,
                    AgeRange.min_age,
                    AgeRange.max_age,
                )
                .select_from(SubjectAgeRange)
                .join(Subject, Subject.id == SubjectAgeRange.subject_id)
                .join(AgeRange, AgeRange.id == SubjectAgeRange.age_range_id)
            )
        ).all()

    if not sar_rows:
        logger.warning("No SubjectAgeRange rows found; no flashcards will be generated.")
        return

    # Allowed pairs from SubjectAgeRange, indexed by subject_code for deterministic iteration.
    # Store complete age range metadata so workers do not need to re-query AgeRange.
    allowed_meta_by_subject_code: dict[str, dict[str, tuple[str, int | None, int | None]]] = defaultdict(dict)
    for subject_code, _subject_name, age_range_code, age_range_name, min_age, max_age in sar_rows:
        allowed_meta_by_subject_code[str(subject_code)][str(age_range_name)] = (
            str(age_range_code),
            (int(min_age) if min_age is not None else None),
            (int(max_age) if max_age is not None else None),
        )

    # Preserve deterministic ordering based on the subjects/age_ranges ordering above
    allowed_pairs: list[tuple[str, str, str, str, int | None, int | None]] = []
    # (subject_code, subject_name, age_range_name, age_range_code, min_age, max_age)
    for subject_code, subject_name in subjects:
        allowed_by_name = allowed_meta_by_subject_code.get(subject_code, {})
        if not allowed_by_name:
            continue
        for age_range_code, age_range_name, min_age, max_age in age_ranges:
            meta = allowed_by_name.get(age_range_name)
            if meta is None:
                continue
            ar_code, ar_min, ar_max = meta
            allowed_pairs.append((subject_code, subject_name, age_range_name, ar_code, ar_min, ar_max))

    if not allowed_pairs:
        logger.warning("No allowed subject/age_range pairs found to generate.")
        return

    gen = FlashcardGenerator()

    # Sync Redis client for topic catalog caching (redis-py is sync; topic_catalog uses asyncio.to_thread).
    redis_client = redis.Redis.from_url(settings.redis_url)

    # Cache topic catalogs in-memory per run to avoid repeated generation for the same
    # (subject, age_range, difficulty) combination.
    catalog_cache: dict[tuple[str, str, str], list[Any]] = {}

    # Concurrency control
    sem = asyncio.Semaphore(3)

    results_by_subject_code: dict[str, list[dict[str, Any]]] = defaultdict(list)

    async def worker(
        subject_code: str,
        subject_name: str,
        age_range_name: str,
        age_range_code: str | None,
        min_age: int | None,
        max_age: int | None,
    ) -> None:
        out_path = _subject_seed_path(subject_code)
        logger.info(
            "Seed out_path selected: subject_code=%s path=%s exists=%s",
            subject_code,
            out_path.resolve(),
            out_path.exists(),
        )
        if not out_path.exists():
            raise FileNotFoundError(
                f"Missing canonical flashcards seed file for subject_code={subject_code!r}: {out_path}"
            )

        existing = _read_existing(out_path)

        age_counts: dict[str, int] = defaultdict(int)
        for r in existing:
            try:
                age_counts[str(r.get("age_range", ""))] += 1
            except Exception:
                age_counts["<unknown>"] += 1

        logger.info(
            "Loaded existing seed JSON: subject_code=%s rows=%s age_range_counts=%s",
            subject_code,
            len(existing),
            dict(sorted(age_counts.items())),
        )

        existing_count = _count_valid_matching_rows(
            existing,
            subject_name=subject_name,
            age_range_name=age_range_name,
            difficulty="easy",
        )

        if existing_count >= per_pair:
            logger.info(
                "Seed skip: %s/%s difficulty=easy existing=%s generated=0 final=%s",
                subject_name,
                age_range_name,
                existing_count,
                existing_count,
            )
            return

        missing = per_pair - existing_count
        spec = GenSpec(subject_name=subject_name, age_range_name=age_range_name, difficulty="easy", count=missing)

        # Deterministic seed for topic selection for stable outputs across runs.
        # NOTE: Use age_range_code (not name) to keep consistent with the topic catalog cache keying.
        topic_seed = f"seed:{subject_code}:{subject_name}:{age_range_code}:{spec.difficulty}"

        cache_key = (subject_name, age_range_code, spec.difficulty)
        catalog = catalog_cache.get(cache_key)

        if catalog is None:
            topic_client: AsyncOpenAI | None = None
            try:
                topic_client = AsyncOpenAI(
                    api_key=settings.flashcard_api_key,
                    base_url=settings.flashcard_api_base,
                )

                helper_model = settings.topic_helper_model or gen.model

                delays = [0.0, 0.5, 1.5]
                last_exc: Exception | None = None
                for d in delays:
                    if d:
                        await asyncio.sleep(d)
                    try:
                        catalog = await get_or_create_topic_catalog(
                            redis_sync_client=redis_client,
                            openai_client=topic_client,
                            model=helper_model,
                            version=settings.topic_catalog_version,
                            subject=subject_name,
                            age_range_code=(age_range_code or "all"),
                            difficulty=spec.difficulty,
                            rotate=settings.topic_catalog_rotate,
                            count=settings.topic_catalog_count,
                            ttl_seconds=settings.topic_catalog_ttl_seconds,
                        )
                        if catalog:
                            break
                    except Exception as exc:
                        last_exc = exc
                        logger.warning(
                            "Topic catalog attempt failed (subject=%r age_range_code=%r difficulty=%r) err=%s",
                            subject_name,
                            (age_range_code or "all"),
                            spec.difficulty,
                            exc,
                        )
                        catalog = None

                if not catalog:
                    raise RuntimeError(
                        f"Failed to obtain non-empty topic catalog subject={subject_name!r} age_range_code={(age_range_code or 'all')!r} difficulty={spec.difficulty!r}"
                    ) from last_exc

                catalog_cache[cache_key] = catalog

            finally:
                if topic_client is not None:
                    close_fn = getattr(topic_client, "close", None) or getattr(topic_client, "aclose", None)
                    if close_fn is not None:
                        try:
                            res = close_fn()
                            if res is not None:
                                await res
                        except Exception:
                            logger.exception("Failed to close topic helper client")

        # Select a pool for this subject/age_range/difficulty.
        # NOTE: since the generator now requests count+EXTRA internally, give it enough topics
        # so it can keep unique tags when possible.
        desired_pool = max(int(getattr(settings, "topic_pool_size", 0) or 0), per_pair + 6, 12)
        n_pool = min(desired_pool, len(catalog))
        selected = select_topics_for_batch(catalog, count=n_pool, deterministic_seed=topic_seed)

        topic_tags = [getattr(t, "topic") for t in selected if isinstance(getattr(t, "topic", None), str)]
        topic_pool = _compact_topic_pool(selected)

        async with sem:
            new_rows = await _generate_one(
                gen,
                spec,
                topic_tags,
                topic_pool,
                age_range_code=(age_range_code or "all"),
            )

        results_by_subject_code[subject_code].extend(new_rows)

        logger.info(
            "Accumulated new rows: subject_code=%s new_total=%s",
            subject_code,
            len(results_by_subject_code[subject_code]),
        )

        final_after = existing_count + len(new_rows)
        logger.info(
            "Seed gen: %s/%s difficulty=easy existing=%s generated=%s final=%s",
            subject_name,
            age_range_name,
            existing_count,
            len(new_rows),
            final_after,
        )

    worker_results = await asyncio.gather(
        *(
            worker(code, name, a_name, a_code, a_min, a_max)
            for (code, name, a_name, a_code, a_min, a_max) in allowed_pairs
        ),
        return_exceptions=True,
    )

    failures: list[Exception] = [r for r in worker_results if isinstance(r, Exception)]
    if failures:
        logger.error("generate_all_easy_flashcards: %s/%s workers failed", len(failures), len(worker_results))
        for i, exc in enumerate(failures, start=1):
            logger.exception("generate_all_easy_flashcards worker failure %s/%s", i, len(failures), exc_info=exc)
    else:
        logger.info("generate_all_easy_flashcards: all %s workers completed successfully", len(worker_results))

    if not results_by_subject_code:
        logger.info("No seed files to write (nothing generated; results_by_subject_code empty).")

    # Write per-subject JSON files (append + dedupe + normalize)
    for subject_code, new_rows in results_by_subject_code.items():
        out_path = _subject_seed_path(subject_code)
        logger.info(
            "Preparing write: subject_code=%s new_rows=%s path=%s",
            subject_code,
            len(new_rows),
            out_path.resolve(),
        )
        existing = _read_existing(out_path)
        combined = _dedupe([*existing, *new_rows])
        combined = _normalize_seed_rows(combined)

        dist = {0: 0, 1: 0, 2: 0, 3: 0}
        for r in combined:
            if isinstance(r, dict) and _is_valid_mcq_row(r):
                dist[int(r["correct_index"])] += 1
        logger.info("correct_index distribution subject_code=%s dist=%s", subject_code, dist)

        _write_json_list(out_path, combined)
        logger.info("Wrote %s total rows to %s", len(combined), out_path.resolve())
        logger.info("Seed file total for %s: %s rows", subject_code, len(combined))

    logger.info("Done. Seed files updated under: %s", FLASHCARDS_DIR)
