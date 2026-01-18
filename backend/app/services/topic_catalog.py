from __future__ import annotations

# backend/app/services/topic_catalog.py
import json
import logging
import random
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional, Literal

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

QuestionType = Literal["vocab", "example", "cause_effect", "compare", "sequence", "geo"]


@dataclass(frozen=True)
class TopicItem:
    topic: str
    question_type: QuestionType
    learning_objective: str
    stem_templates: list[str]
    anchor_facts: list[str]
    misconceptions: list[str]
    keywords: list[str]

    # Backward-compatible aliases (older code may refer to intent/stems).
    # The canonical fields are: learning_objective + stem_templates.
    @property
    def intent(self) -> str:  # legacy
        return self.learning_objective

    @property
    def stems(self) -> list[str]:  # legacy
        return self.stem_templates


# -----------------------------
# Redis keying / rotation
# -----------------------------

def _catalog_key(
    *,
    version: str,
    subject: str,
    age_range_code: str,
    difficulty: str,
    rotate: str = "daily",  # "static" | "daily" | "weekly" | "monthly"
    now: Optional[datetime] = None,
) -> str:
    now = now or datetime.now(timezone.utc)
    bucket = "static"
    if rotate == "daily":
        bucket = now.strftime("%Y-%m-%d")
    elif rotate == "weekly":
        y, w, _ = now.isocalendar()
        bucket = f"{y}-W{w:02d}"
    elif rotate == "monthly":
        bucket = now.strftime("%Y-%m")

    return f"topic_catalog:{version}:{bucket}:{subject.strip()}:{age_range_code.strip()}:{difficulty.strip()}"


# -----------------------------
# Prompting
# -----------------------------

def build_topic_catalog_prompt(*, subject: str, age_range_code: str, difficulty: str, count: int = 30) -> str:
    """
    Prompt the model to create a compact, MCQ-ready topic catalog that supports:
      - grounding (anchor_facts)
      - distractors (misconceptions)
      - variation (stem_templates)
    """
    return "\n".join(
        [
            f"Generate exactly {count} DISTINCT curriculum-aligned topics for MULTIPLE-CHOICE questions.",
            "",
            "Constraints:",
            f"- Subject: {subject}",
            f"- Age range code: {age_range_code}",
            "  (The code is the only age-range identifier. Use it to choose appropriate vocabulary and complexity.)",
            f"- Difficulty: {difficulty}",
            "",
            "Difficulty rubric:",
            "- easy: recognition/definition, single-step, concrete examples",
            "- medium: simple cause/effect or compare two ideas, still age-appropriate",
            "- hard: multi-step reasoning, nuance, but NOT obscure trivia",
            "",
            "Rules:",
            "- Topics must be concrete and askable as ONE MCQ.",
            "- No overlap or trivial rephrasings. Vary eras/themes if applicable.",
            "- Use snake_case for `topic`.",
            "- Provide 2-4 stem_templates with placeholders allowed like {concept} or {event}.",
            "- Provide 3-6 anchor_facts. These must be true, age-appropriate, and clear.",
            "- Provide 2-4 misconceptions (common wrong ideas). These will become distractors.",
            "- Provide 4-10 keywords (short noun phrases).",
            "- question_type MUST be one of: vocab, example, cause_effect, compare, sequence, geo",
            "",
            "Quality rules:",
            "- Avoid negative phrasing in stems (no NOT / EXCEPT).",
            "- Avoid stems that are all 'What is ...?'.",
            "- Misconceptions should be plausible mistakes kids actually make.",
            "",
            "Output ONLY valid JSON in exactly this shape:",
            "{",
            '  "topics": [',
            "    {",
            '      "topic": "snake_case",',
            '      "question_type": "vocab|example|cause_effect|compare|sequence|geo",',
            '      "learning_objective": "measurable objective sentence",',
            '      "stem_templates": ["...","..."],',
            '      "anchor_facts": ["...","..."],',
            '      "misconceptions": ["...","..."],',
            '      "keywords": ["...","..."]',
            "    }",
            "  ]",
            "}",
        ]
    )


_SNAKE_CLEAN_RE = re.compile(r"[^a-z0-9_]+")


def _clean_topic_label(s: str) -> str:
    s = s.strip().lower().replace(" ", "_")
    s = _SNAKE_CLEAN_RE.sub("", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def _normalize_catalog(data: dict[str, Any]) -> list[TopicItem]:
    topics = data.get("topics")
    if not isinstance(topics, list) or not topics:
        raise ValueError("topic catalog missing/empty 'topics' array")

    allowed_qt: set[str] = {"vocab", "example", "cause_effect", "compare", "sequence", "geo"}

    seen: set[str] = set()
    out: list[TopicItem] = []

    for t in topics:
        if not isinstance(t, dict):
            continue

        topic = t.get("topic")
        qt = t.get("question_type")
        lo = t.get("learning_objective")
        stems = t.get("stem_templates")
        facts = t.get("anchor_facts")
        misc = t.get("misconceptions")
        keywords = t.get("keywords")

        if not isinstance(topic, str) or not topic.strip():
            continue
        topic = _clean_topic_label(topic)
        if not topic or topic in seen:
            continue
        seen.add(topic)

        if not isinstance(qt, str) or qt not in allowed_qt:
            continue

        if not isinstance(lo, str) or len(lo.strip()) < 12:
            continue
        lo = lo.strip()

        stems_clean = [s.strip() for s in (stems or []) if isinstance(s, str) and s.strip()]
        facts_clean = [f.strip() for f in (facts or []) if isinstance(f, str) and f.strip()]
        misc_clean = [m.strip() for m in (misc or []) if isinstance(m, str) and m.strip()]
        kw_clean = [k.strip() for k in (keywords or []) if isinstance(k, str) and k.strip()]

        # Quality gates (simple, effective)
        if len(stems_clean) < 2:
            continue
        if len(facts_clean) < 3:
            continue
        if len(misc_clean) < 2:
            continue
        if len(kw_clean) < 4:
            continue

        # Avoid low-effort “What is …” spam
        what_is_count = sum(1 for s in stems_clean[:4] if s.lower().startswith("what is"))
        if what_is_count >= 3:
            continue

        out.append(
            TopicItem(
                topic=topic,
                question_type=qt,  # type: ignore[assignment]
                learning_objective=lo,
                stem_templates=stems_clean[:4],
                anchor_facts=facts_clean[:6],
                misconceptions=misc_clean[:4],
                keywords=kw_clean[:10],
            )
        )

    if not out:
        raise ValueError("topic catalog empty after normalization")
    return out


async def get_or_create_topic_catalog(
    *,
    redis_sync_client: Any,
    openai_client: AsyncOpenAI,
    model: str,
    version: str,
    subject: str,
    age_range_code: str,
    difficulty: str,
    rotate: str = "weekly",
    count: int = 30,
    ttl_seconds: Optional[int] = None,
) -> list[TopicItem]:
    import asyncio

    key = _catalog_key(
        version=version,
        subject=subject,
        age_range_code=age_range_code,
        # NOTE: cache/prompt keying is based on age_range_code (not label/min/max) to match generator inputs.
        difficulty=difficulty,
        rotate=rotate,
    )

    cached = await asyncio.to_thread(redis_sync_client.get, key)
    if cached:
        try:
            if isinstance(cached, (bytes, bytearray)):
                cached = cached.decode("utf-8", errors="replace")
            data = json.loads(cached)
            return _normalize_catalog(data)
        except Exception:
            logger.exception("topic catalog cache parse failed; regenerating key=%s", key)

    prompt = build_topic_catalog_prompt(subject=subject, age_range_code=age_range_code, difficulty=difficulty, count=count)

    resp = await openai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You create curriculum-aligned MCQ topic specs. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    content = resp.choices[0].message.content
    if not content:
        raise RuntimeError("Topic helper returned empty content")

    data = json.loads(content)
    catalog = _normalize_catalog(data)

    payload = {
        "topics": [
            {
                "topic": t.topic,
                "question_type": t.question_type,
                "learning_objective": t.learning_objective,
                "stem_templates": t.stem_templates,
                "anchor_facts": t.anchor_facts,
                "misconceptions": t.misconceptions,
                "keywords": t.keywords,
            }
            for t in catalog
        ]
    }
    encoded = json.dumps(payload, ensure_ascii=False)

    if ttl_seconds is None:
        await asyncio.to_thread(redis_sync_client.set, key, encoded)
    else:
        await asyncio.to_thread(redis_sync_client.setex, key, ttl_seconds, encoded)

    logger.info(
        "topic catalog: created version=%s rotate=%s subject=%s age_range_code=%s difficulty=%s key=%s topics=%s",
        version,
        rotate,
        subject,
        age_range_code,
        difficulty,
        key,
        len(catalog),
    )
    return catalog

def select_topics_for_batch(
    catalog: list[TopicItem],
    *,
    count: int,
    deterministic_seed: str,
) -> list[TopicItem]:
    rng = random.Random(deterministic_seed)
    k = min(max(count, 0), len(catalog))
    return rng.sample(catalog, k=k)