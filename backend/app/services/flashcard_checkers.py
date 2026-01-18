from __future__ import annotations

import json
import logging
from typing import Any, Literal

from openai import AsyncOpenAI

from ..config import settings
from .difficulty_guardrails import difficulty_guardrails_for

logger = logging.getLogger("mybuddy.api")

Decision = Literal["keep", "replace"]


def _coerce_confidence(v: Any) -> float:
    try:
        f = float(v)
    except Exception:
        return 0.0
    if f < 0.0:
        return 0.0
    if f > 1.0:
        return 1.0
    return f


async def review_flagged_flashcard_decision(
    *,
    flashcard_question: str,
    choices: list[str],
    correct_index: int,
    explanations: list[str],
    subject_name: str,
    age_range_code: str,
    difficulty_code: str,
    reason_code: str,
) -> dict:
    """Ask an LLM to review a flagged flashcard and decide whether to keep or replace.

    Returns a dict shaped like:
      {"decision": "keep"|"replace", "confidence": float(0..1), "notes": str}

    Output validation is strict; on failures we default to keep (safer).
    """

    guardrails = difficulty_guardrails_for(age_range_code, difficulty_code)
    guardrails_text = "\n".join(guardrails) if guardrails else "- (none)"

    system = (
        "You are a strict QA reviewer for children's multiple-choice flashcards. "
        "Your job is to decide whether to KEEP the flashcard as-is or REPLACE it (regenerate).\n\n"
        "Criteria to REPLACE include: incorrect answer key, ambiguous stem, multiple correct choices, "
        "nonsensical/unhelpful explanations, unsafe/inappropriate content, or difficulty not matching the child's level.\n\n"
        "You MUST return ONLY a JSON object and nothing else."
    )

    user = (
        "Review this flagged flashcard.\n\n"
        f"Subject: {subject_name}\n"
        f"Age range code: {age_range_code}\n"
        f"Difficulty code: {difficulty_code}\n"
        f"Flag reason code (from user): {reason_code}\n\n"
        "Difficulty guardrails:\n"
        f"{guardrails_text}\n\n"
        "Flashcard:\n"
        f"Question: {flashcard_question}\n"
        f"Choices: {json.dumps(choices, ensure_ascii=False)}\n"
        f"Correct index: {correct_index}\n"
        f"Explanations: {json.dumps(explanations, ensure_ascii=False)}\n\n"
        "Return JSON with shape: {\"decision\": \"keep\"|\"replace\", \"confidence\": 0..1, \"notes\": string}."
    )

    client = AsyncOpenAI(api_key=settings.flashcard_api_key, base_url=settings.flashcard_api_base)
    try:
        resp = await client.chat.completions.create(
            model=settings.flashcard_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )

        content = (resp.choices[0].message.content or "").strip()
        data = json.loads(content)

        decision = data.get("decision")
        if decision not in ("keep", "replace"):
            raise ValueError(f"invalid decision: {decision}")

        confidence = _coerce_confidence(data.get("confidence"))
        notes = data.get("notes")
        if not isinstance(notes, str):
            notes = str(notes) if notes is not None else ""

        return {"decision": decision, "confidence": confidence, "notes": notes}

    except Exception as exc:
        logger.exception("review_flagged_flashcard_decision: failed; defaulting to keep err=%s", exc)
        return {"decision": "keep", "confidence": 0.0, "notes": "checker_failed_default_keep"}
    finally:
        close_fn = getattr(client, "close", None) or getattr(client, "aclose", None)
        if close_fn is not None:
            try:
                res = close_fn()
                if res is not None:
                    await res
            except Exception:
                logger.exception("review_flagged_flashcard_decision: failed closing client")
