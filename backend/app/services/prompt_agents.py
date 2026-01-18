# app/services/prompt_agents.py
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Callable

from .difficulty_guardrails import difficulty_guardrails_for

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PromptCtx:
    subject: str
    age_range_code: str
    difficulty: str
    allowed_tags: list[str]
    count: int
    max_q_len: int
    max_choice_len: int
    max_expl_len: int
    topic_pool: list[dict[str, Any]] | None = None
    examples: list[dict] | None = None
    examples_difficulty_used: str | None = None
    requested_difficulty: str | None = None


PromptBlockFn = Callable[[PromptCtx], list[str]]
_BLOCKS: list[PromptBlockFn] = []


def register_block(fn: PromptBlockFn) -> PromptBlockFn:
    _BLOCKS.append(fn)
    return fn


def build_prompt(ctx: PromptCtx) -> str:
    logger.info(
        "prompt_agents.build_prompt: subject=%s age_range_code=%s difficulty=%s count=%s allowed_tags_count=%s topic_pool_len=%s examples_len=%s examples_difficulty_used=%s requested_difficulty=%s",
        (ctx.subject if isinstance(ctx.subject, str) else None),
        getattr(ctx, "age_range_code", None),
        getattr(ctx, "difficulty", None),
        getattr(ctx, "count", None),
        (len(ctx.allowed_tags) if getattr(ctx, "allowed_tags", None) else 0),
        (len(ctx.topic_pool) if getattr(ctx, "topic_pool", None) else 0),
        (len(ctx.examples) if getattr(ctx, "examples", None) else 0),
        getattr(ctx, "examples_difficulty_used", None),
        getattr(ctx, "requested_difficulty", None),
    )

    sections: list[str] = []
    for fn in _BLOCKS:
        try:
            block = fn(ctx)
            if block:
                sections.extend(block)
        except Exception:
            # fail-closed: if a block errors, omit it rather than breaking generation
            continue

    # normalize: remove blanks and non-strings
    cleaned = [s for s in sections if isinstance(s, str) and s.strip()]
    return "\n".join(cleaned)


def _clean_list_str(values: list[str] | None) -> list[str]:
    if not values:
        return []
    return [str(x).strip() for x in values if isinstance(x, str) and x.strip()]


@register_block
def schema_block(ctx: PromptCtx) -> list[str]:
    return [
        f"Create exactly {ctx.count} unique multiple-choice flashcards.",
        "Output MUST be a single JSON object with top-level key 'flashcards'.",
        f"'flashcards' MUST be an array of exactly {ctx.count} objects.",
        "",
        "Return ONLY valid JSON. Do not include markdown, backticks, or extra text.",
        "",
        "Schema for each flashcard (STRICT):",
        "- question: string",
        "- choices: array of exactly 4 strings (all different)",
        "- correct_index: integer 0..3 (index of the correct choice)",
        "- explanations: array of exactly 4 strings (explanations[i] explains choices[i])",
        "- tags: array containing exactly ONE string",
    ]


@register_block
def mcq_quality_block(ctx: PromptCtx) -> list[str]:
    lines = [
        "",
        "MCQ quality rules:",
        "- Exactly ONE choice is correct.",
        "- Incorrect choices should be plausible but clearly wrong for different reasons.",
        "- Keep choices similar in length/style; no 'All of the above' / 'None of the above'.",
        "- Avoid negative questions (no NOT / EXCEPT / NEVER).",
        "- Each question should test ONE idea (no multi-part questions).",
        "- Do not make the correct answer obviously the longest/most specific.",
        "- All 4 choices MUST be unique (no duplicates, no minor variants, no repeated wording with small edits).",
        "- All 4 explanations MUST be unique and specific to their matching choice (no repeated explanation text).",
    ]

    # Subject-specific fairness rules to prevent "0.7 vs 0.70" gotchas.
    if ctx.subject.strip().casefold() == "math":
        lines.extend(
            [
                "",
                "Math fairness rules (STRICT):",
                "- Do NOT include two answer choices that are equal in value (no equivalent decimals/fractions/percents).",
                "- Avoid formatting-only differences (e.g., 0.7 vs 0.70, 1/2 vs 0.5, 50% vs 0.5).",
                "- Ensure exactly one choice is mathematically correct.",
            ]
        )

    return lines


@register_block
def length_block(ctx: PromptCtx) -> list[str]:
    return [
        "",
        "Kid-friendly length limits (STRICT):",
        f"- question <= {ctx.max_q_len} characters",
        f"- each choice <= {ctx.max_choice_len} characters",
        f"- each explanation <= {ctx.max_expl_len} characters",
    ]


@register_block
def tag_block(ctx: PromptCtx) -> list[str]:
    allowed = ", ".join(_clean_list_str(ctx.allowed_tags))
    return [
        "",
        "Tag rules (STRICT):",
        f"- tags MUST be a list of exactly one string, and that string MUST be one of: {(allowed if allowed else 'none')}.",
        "- Do not use any other tags.",
    ]


@register_block
def context_block(ctx: PromptCtx) -> list[str]:
    # Difficulty is authoritative; example difficulty (if different) is informational only.
    effective_difficulty = (ctx.difficulty or "").strip()

    lines = [
        "",
        f"Subject: {ctx.subject}",
        f"Age range code: {ctx.age_range_code}",
        f"Difficulty: {effective_difficulty}",
    ]

    guardrails = difficulty_guardrails_for(ctx.age_range_code, effective_difficulty)

    logger.info(
        "prompt_agents.context_block: age_range_code=%s difficulty=%s guardrails_count=%s",
        getattr(ctx, "age_range_code", None),
        effective_difficulty,
        len(guardrails) if guardrails else 0,
    )

    if guardrails:
        lines.extend(["", "Difficulty guidance for this age range (STRICT):", *guardrails])

    return lines


@register_block
def topic_pool_block(ctx: PromptCtx) -> list[str]:
    if not ctx.topic_pool:
        return []

    compact: list[dict[str, Any]] = []
    for t in ctx.topic_pool:
        if not isinstance(t, dict):
            continue
        topic = t.get("topic")
        if not isinstance(topic, str) or not topic.strip():
            continue
        compact.append(
            {
                "topic": topic.strip(),
                "stem_templates": t.get("stem_templates") or t.get("stems") or [],
                "anchor_facts": t.get("anchor_facts") or [],
                "misconceptions": t.get("misconceptions") or [],
                "keywords": t.get("keywords") or [],
            }
        )

    import json as _json

    return ["", "Topic pool:", _json.dumps(compact, ensure_ascii=False, indent=2)]


@register_block
def output_shape_example_block(ctx: PromptCtx) -> list[str]:
    import json as _json

    schema_template = {
        "flashcards": [
            {
                "question": "string",
                "choices": ["string", "string", "string", "string"],
                "correct_index": 0,
                "explanations": ["string", "string", "string", "string"],
                "tags": ["string"],
            }
        ]
    }
    return ["", "Output JSON shape example:", _json.dumps(schema_template, ensure_ascii=False, indent=2)]


@register_block
def examples_block(ctx: PromptCtx) -> list[str]:
    if not ctx.examples:
        return []

    note_lines: list[str] = []
    if ctx.examples_difficulty_used and ctx.examples_difficulty_used != ctx.difficulty:
        logger.info(
            "prompt_agents.examples_block: examples_fallback used examples_difficulty=%s target_difficulty=%s examples_len=%s",
            ctx.examples_difficulty_used,
            ctx.difficulty,
            len(ctx.examples) if ctx.examples else 0,
        )

        note_lines = [
            "NOTE (examples only):",
            f"- Examples were sourced from difficulty '{ctx.examples_difficulty_used}' because matching examples were unavailable.",
            f"- You MUST still generate at difficulty '{ctx.difficulty}'.",
            "- Use examples ONLY for JSON shape and writing style. Do not copy text.",
            "",
        ]

    import json as _json
    trimmed = ctx.examples[:2]
    return ["", *note_lines, "Examples (style only; do not copy):", _json.dumps(trimmed, ensure_ascii=False, indent=2)]



@register_block
def checklist_block(ctx: PromptCtx) -> list[str]:
    return [
        "",
        "Final checklist (do this BEFORE output):",
        "- JSON only (no markdown).",
        "- Exactly the requested number of flashcards.",
        "- Each flashcard has 4 UNIQUE choices.",
        "- Each flashcard has 4 UNIQUE explanations aligned by index.",
        "- tags[0] is one of allowed_tags.",
        "",
        "Return ONLY valid JSON.",
    ]
