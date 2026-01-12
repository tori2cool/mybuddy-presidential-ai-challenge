from __future__ import annotations
# backend/app/flashcard_seed.py
import asyncio
import json
import logging
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db import get_engine
from app.models import AgeRange, Flashcard, Interest, Subject, SubjectAgeRange
from app.services.ai_flashcard_generator import FlashcardGenerator

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
    # Focused logging to confirm canonical seed files are being updated.
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
            # If something malformed slips in, keep it (so you notice), but don't dedupe it.
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


def _count_valid_matching_rows(
    rows: Iterable[dict[str, Any]],
    *,
    subject_name: str,
    age_range_name: str,
    difficulty: str,
) -> int:
    """
    Count rows that are (1) valid MCQ rows and (2) match the given
    subject/age_range/difficulty.

    Matching is case-insensitive and trims whitespace to be tolerant of seed edits.
    """
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
            .on_conflict_do_nothing(
                index_elements=["subject_id", "question", "difficulty_code", "age_range_id"]
            )
        )
        await conn.execute(stmt)
        logger.info("Flashcards: attempted %s inserts (ON CONFLICT DO NOTHING).", len(rows))
        return len(rows)


async def _fetch_subjects_age_ranges_interests() -> tuple[list[tuple[str, str]], list[str], list[str]]:
    """
    Returns:
    - subjects: list of (subject_code, subject_name)
    - age_ranges: list of age range names
    - interests: list of allowed interest names

    NOTE: This does *not* apply SubjectAgeRange constraints. Callers that need
    allowed (subject, age_range) pairs should query SubjectAgeRange.
    """
    engine = get_engine()
    async with engine.begin() as conn:
        subjects = (await conn.execute(select(Subject.code, Subject.name).order_by(Subject.name))).all()
        age_ranges = (await conn.execute(select(AgeRange.name).order_by(AgeRange.min_age))).scalars().all()
        interests = (
            await conn.execute(select(Interest.name).where(Interest.is_active == True).order_by(Interest.name))
        ).scalars().all()

    return list(subjects), list(age_ranges), list(interests)


async def _generate_one(
    gen: FlashcardGenerator,
    spec: GenSpec,
    allowed_interests: list[str],
    *,
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
                age_range=spec.age_range_name,
                difficulty=spec.difficulty,
                interests=allowed_interests,
                count=spec.count,
                requested_difficulty=spec.difficulty,
                enforce_exact_count=True,
            )
            # Convert model output to seed row format (what your seed script expects)
            seed_rows: list[dict[str, Any]] = []
            for c in cards:
                seed_rows.append(
                    {
                        "subject": spec.subject_name,
                        "age_range": spec.age_range_name,
                        "difficulty": spec.difficulty,
                        "question": c["question"],
                        "choices": c["choices"],
                        "correct_index": c["correct_index"],
                        "explanations": c["explanations"],
                        "tags": c.get("tags") or ["auto"],
                    }
                )
            return seed_rows
        except Exception as exc:
            last_err = exc
            logger.warning(
                "Flashcard gen failed (attempt %s/%s) subject=%r age_range=%r: %s",
                attempt,
                max_attempts,
                spec.subject_name,
                spec.age_range_name,
                exc,
            )
            if attempt < max_attempts:
                await asyncio.sleep(delay)
                delay *= 2

    raise RuntimeError(
        f"Failed after {max_attempts} attempts: subject={spec.subject_name!r} age_range={spec.age_range_name!r}"
    ) from last_err


async def generate_all_easy_flashcards(*, per_pair: int = 5) -> None:
    """
    Main entry point:
    - for each allowed Subject × AgeRange (via SubjectAgeRange) at difficulty='easy':
      - load existing canonical seed file backend/app/seed_data/flashcards/<subject_code>.json
      - count VALID rows for that subject+age_range+difficulty
      - if count >= per_pair: skip OpenAI
      - else generate only the missing number
      - append, dedupe, and write back to same canonical file

    SubjectAgeRange is the source of truth for which (subject, age_range) pairs are valid.
    """
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    _ensure_dir(FLASHCARDS_DIR)

    subjects, age_ranges, interests = await _fetch_subjects_age_ranges_interests()
    if not subjects or not age_ranges:
        raise RuntimeError("No subjects or age ranges found in DB. Seed baseline first.")

    # Build allowed pairs from SubjectAgeRange (subject_code -> set(age_range_name))
    engine = get_engine()
    async with engine.begin() as conn:
        sar_rows = (
            await conn.execute(
                select(Subject.code, AgeRange.name)
                .select_from(SubjectAgeRange)
                .join(Subject, Subject.id == SubjectAgeRange.subject_id)
                .join(AgeRange, AgeRange.id == SubjectAgeRange.age_range_id)
            )
        ).all()

    if not sar_rows:
        logger.warning("No SubjectAgeRange rows found; no flashcards will be generated.")
        return

    allowed_by_subject_code: dict[str, set[str]] = defaultdict(set)
    for subject_code, age_range_name in sar_rows:
        allowed_by_subject_code[str(subject_code)].add(str(age_range_name))

    # Preserve deterministic ordering based on the subjects/age_ranges ordering above
    allowed_pairs: list[tuple[str, str, str]] = []  # (subject_code, subject_name, age_range_name)
    for subject_code, subject_name in subjects:
        allowed_ages = allowed_by_subject_code.get(subject_code, set())
        if not allowed_ages:
            continue
        for age_range_name in age_ranges:
            if age_range_name in allowed_ages:
                allowed_pairs.append((subject_code, subject_name, age_range_name))

    if not allowed_pairs:
        logger.warning("No allowed subject/age_range pairs found to generate.")
        return

    gen = FlashcardGenerator()

    # Concurrency control (avoid unnecessary concurrent calls)
    sem = asyncio.Semaphore(3)

    results_by_subject_code: dict[str, list[dict[str, Any]]] = defaultdict(list)

    async def worker(subject_code: str, subject_name: str, age_range_name: str) -> None:
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
        # Log summary of loaded canonical file without including any card text.
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

        async with sem:
            new_rows = await _generate_one(gen, spec, interests)

        results_by_subject_code[subject_code].extend(new_rows)

        # Focused logging: how many new rows we accumulated per canonical file.
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

    await asyncio.gather(*(worker(code, name, a) for (code, name, a) in allowed_pairs))

    if not results_by_subject_code:
        logger.info("No seed files to write (nothing generated; results_by_subject_code empty).")

    # Write per-subject JSON files (append + dedupe)
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
        _write_json_list(out_path, combined)
        logger.info("Wrote %s total rows to %s", len(combined), out_path.resolve())

        # Per subject file total
        logger.info("Seed file total for %s: %s rows", subject_code, len(combined))

    logger.info("Done. Seed files updated under: %s", FLASHCARDS_DIR)
