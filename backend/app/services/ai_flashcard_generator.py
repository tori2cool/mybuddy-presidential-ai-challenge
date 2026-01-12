import json
import logging
from typing import Any

from openai import AsyncOpenAI

from ..config import settings

logger = logging.getLogger(__name__)


class FlashcardGenerator:
    """
    Generates educational multiple-choice flashcards with optional interest-grounding.

    Output shape (STRICT):
    - question: str
    - choices: list[str] length 4
    - correct_index: int (0-3)
    - explanations: list[str] length 4 (per-choice: why correct/incorrect)
    - tags: list[str] length 1 (either an allowed Interest tag or 'auto')
    """

    def __init__(self):
        self.model = settings.flashcard_model

        logger.info(
            "[AI Flashcard Generator] configured: api_key_set=%s api_base_set=%s model=%s",
            bool(settings.flashcard_api_key),
            bool(settings.flashcard_api_base),
            self.model,
        )

    def _get_client(self) -> AsyncOpenAI:
        return AsyncOpenAI(
            api_key=settings.flashcard_api_key,
            base_url=settings.flashcard_api_base,
        )

    def _build_prompt(
        self,
        subject: str,
        age_range: str,
        difficulty: str,
        interests: list[str],
        count: int,
        examples: list[dict] | None = None,
        *,
        examples_difficulty_used: str | None = None,
        requested_difficulty: str | None = None,
    ) -> str:
        """
        Build prompt for model.

        IMPORTANT: Do not use str.format() on prompts that contain JSON braces.
        """

        cleaned_interests = [x.strip() for x in (interests or []) if isinstance(x, str) and x.strip()]
        interest_str = ", ".join(cleaned_interests)

        schema_template = {
            "flashcards": [
                {
                    "question": "string",
                    "choices": ["string", "string", "string", "string"],  # exactly 4
                    "correct_index": 0,  # integer 0-3 pointing to correct choice
                    "explanations": ["string", "string", "string", "string"],  # per-choice why correct/incorrect
                    "tags": ["string"],  # exactly ONE tag: either an Interest OR "auto"
                }
            ]
        }
        schema_json = json.dumps(schema_template, ensure_ascii=False, indent=2)

        sections: list[str] = [
            f"Generate exactly {count} unique MULTIPLE-CHOICE flashcards as JSON with the top-level key 'flashcards'.",
            f"Return exactly {count} items in the 'flashcards' array (no more, no fewer).",
            "COUNT GUARANTEE (CRITICAL):",
            f"- Before final output, recount the flashcards array and ensure it contains exactly {count} items.",
            f"- If it is not exactly {count}, FIX IT before responding.",
            "",
            "FORMAT (STRICT):",
            "Each flashcard must be an object with keys:",
            "- question (string)",
            "- choices (REQUIRED list of exactly 4 strings)",
            "- correct_index (REQUIRED integer 0-3 pointing to the correct choice)",
            "- explanations (REQUIRED list of exactly 4 strings; explanations[i] explains choices[i])",
            "- tags (REQUIRED list containing exactly ONE string)",
            "",
            "MULTIPLE CHOICE RULES (CRITICAL):",
            "- Exactly ONE choice must be correct.",
            "- choices[correct_index] MUST be the correct choice.",
            "- The correct choice must be the most common-sense, plain-language, direct answer a typical student would pick.",
            "- The 3 incorrect choices (distractors) must be plausible but clearly wrong for DIFFERENT reasons.",
            "- Do NOT use 'All of the above' or 'None of the above'.",
            "- Do NOT use jokes, silly answers, or unrelated answers.",
            "- Keep choices similar in length, grammar, and style so the correct answer is not a giveaway.",
            "- Distractors must be unambiguously wrong if the student knows the concept (no two correct answers).",
            "",
            "EXPLANATIONS RULES (CRITICAL):",
            "- explanations must have exactly 4 items and align with choices in order.",
            "- explanations[correct_index] must explain WHY that choice is correct (kid-friendly, short).",
            "- Each incorrect explanation must explain WHY that specific choice is wrong (name the mistake/misconception).",
            "- Do NOT reuse the same explanation text for multiple choices.",
            "- Do NOT say only 'because it is wrong' / 'incorrect' without explaining why.",
            "",
            "DISTRACTOR DESIGN (TEACHING MODE) (CRITICAL):",
            "- Each incorrect choice must reflect a common mistake for this age range and subject.",
            "- Each incorrect choice must be wrong in a DIFFERENT way:",
            "  • misconception",
            "  • wrong operation/logic",
            "  • true detail but doesn't answer the question (for reading)",
            "- Avoid giveaways:",
            "  • Don't make the correct option the only specific/detailed one.",
            "  • Keep unit formatting consistent across all choices.",
            "  • Avoid absolute words like 'always'/'never' unless balanced across choices and appropriate.",
            "",
            "SUBJECT-SPECIFIC DISTRACTOR PATTERNS (USE THESE):",
            "- Math:",
            "  • One near-miss number (off-by-one, close total).",
            "  • One wrong operation (add vs multiply, reversed subtraction/division).",
            "  • One place-value/counting mistake.",
            "- Reading/Comprehension:",
            "  • One true detail from the question but NOT what was asked.",
            "  • One reasonable inference that is too strong/unsupported.",
            "  • One tempting opposite/contrast that conflicts with a key detail.",
            "- Science:",
            "  • One common misconception for this age range.",
            "  • One correct concept applied to the wrong situation.",
            "  • One swapped related term (evaporation/condensation, rotation/revolution).",
            "- Social Studies/History:",
            "  • One confused role/purpose (what vs why).",
            "  • One plausible but wrong time/place/person.",
            "  • One overly broad or simplified idea.",
            "",
            "DIFFICULTY CONTROL:",
            "- Easy: distractors are clearly wrong after a quick think.",
            "- Medium: distractors are plausible; student must recall a key fact.",
            "- Hard: distractors are very plausible and require careful reasoning, but still fair and not trick-based.",
            "",
            "QUESTION QUALITY RULES:",
            "- Questions must be engaging and age-appropriate for the given age range.",
            "- Avoid repeating the same concept across multiple flashcards in this batch.",
            "Do NOT copy, paraphrase, or duplicate any provided examples. Use them only to match style/format.",
            "All questions, choices, and explanations must be novel.",
            "",
            "NUMBERS & UNITS (CRITICAL):",
            "- If the correct answer is a number, prefer digits-only unless the question explicitly asks for words.",
            "- Keep number/unit formatting consistent across ALL choices (don’t make the correct choice the only one with units).",
            "",
            "INTEREST INTEGRATION RULES (OPTIONAL; NEVER FORCE):",
            "- Interests are optional. Prefer 'auto' over awkward or decorative interest usage.",
            "- Use an Interest only when it materially changes the task and belongs in BOTH the question AND the correct choice.",
            "- Removal test: if removing the interest would NOT change the meaning of the question OR would leave the correct choice unchanged, then do NOT use the interest → tag must be 'auto'.",
            "",
            "FORBIDDEN INTEREST USAGE:",
            "- Wrapper framing that doesn't change the task, such as:",
            "  • 'In a story about X…'",
            "  • 'In an article about X…'",
            "  • 'In a game about X…'",
            "- Meta prompts like: 'In soccer, what is a synonym?'",
            "- Any interest that only decorates the question or could be removed with no change to the correct answer.",
            "",
            "TAGGING RULES (STRICT):",
            "- tags MUST be present and MUST contain exactly ONE string.",
            "- If an Interest is truly used, tags MUST be: [<interest>] exactly (case-sensitive, from the provided list).",
            "- If no Interest is used, tags MUST be: ['auto']",
            "- Never output multiple tags and never output non-approved tags.",
            "",
            "EMOJI RULES:",
            "- Emojis are optional.",
            "- If emojis are used place them directly after the word they represent.",
            "- Do NOT use an emoji unless the corresponding word or object is explicitly present in the question or choices.",
            "",
            f"Subject: {subject}",
            f"Age range: {age_range}",
            f"Difficulty: {difficulty}",
            f"Available Interests (allowed interest tags): {interest_str if interest_str else 'none'}",
            "",
            "Output schema (JSON):",
            "```json",
            schema_json,
            "```",
            "",
            "Return ONLY valid JSON.",
        ]

        if examples:
            note_lines: list[str] = []
            if requested_difficulty and examples_difficulty_used and examples_difficulty_used != requested_difficulty:
                note_lines = [
                    "NOTE (IMPORTANT):",
                    f"The example flashcards below are from difficulty '{examples_difficulty_used}' which is LOWER than the requested difficulty '{requested_difficulty}'.",
                    "Use the examples ONLY for style/format. Do NOT match their difficulty. Generate at the requested difficulty.",
                    "",
                ]

            examples_json = json.dumps(examples, ensure_ascii=False, indent=2)
            sections.extend(
                [
                    "",
                    *note_lines,
                    "Example flashcards (style only; do not copy):",
                    "```json",
                    examples_json,
                    "```",
                ]
            )

        sections.extend(["", "Return ONLY valid JSON (no markdown outside the JSON)."])
        return "\n".join(sections)

    async def generate_flashcards(
        self,
        subject: str,
        age_range: str,
        difficulty: str,
        interests: list[str],
        count: int = 10,
        examples: list[dict] | None = None,
        *,
        examples_difficulty_used: str | None = None,
        requested_difficulty: str | None = None,
        enforce_exact_count: bool = True,
    ) -> list[dict]:
        logger.debug(
            "[AI Flashcard Generator] start (subject=%s age_range=%s difficulty=%s count=%s interests_count=%s)",
            subject,
            age_range,
            difficulty,
            count,
            len(interests or []),
        )

        prompt = self._build_prompt(
            subject,
            age_range,
            difficulty,
            interests,
            count,
            examples=examples,
            examples_difficulty_used=examples_difficulty_used,
            requested_difficulty=requested_difficulty or difficulty,
        )

        client: AsyncOpenAI | None = None
        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You create engaging, age-appropriate educational multiple-choice questions (MCQ) "
                            "and strictly follow formatting constraints. Return only valid JSON."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("OpenAI returned empty message content")

            cards = self._parse_result_strict(
                raw=content,
                allowed_interests=interests,
            )

            if enforce_exact_count and len(cards) != count:
                raise ValueError(f"Model returned {len(cards)} flashcards; expected {count}")

            if not enforce_exact_count:
                if len(cards) > count:
                    cards = cards[:count]
                elif len(cards) < count:
                    raise ValueError(f"Model returned {len(cards)} flashcards; expected at least {count}")

            return cards

        except Exception:
            logger.exception(
                "[AI Flashcard Generator] generation failed "
                "(subject=%s age_range=%s difficulty=%s count=%s)",
                subject,
                age_range,
                difficulty,
                count,
            )
            raise

        finally:
            if client is not None:
                close_fn = getattr(client, "close", None) or getattr(client, "aclose", None)
                if close_fn is not None:
                    try:
                        res = close_fn()
                        if res is not None:
                            await res
                    except Exception:
                        logger.exception("[AI Flashcard Generator] failed to close OpenAI client cleanly")

    def _parse_result_strict(self, raw: str, allowed_interests: list[str]) -> list[dict]:
        """
        Strict parse + validation (MCQ + per-choice explanations):
        - question: required str
        - choices: required list[str] length 4, non-empty, unique (case-insensitive)
        - correct_index: required int 0..3
        - explanations: required list[str] length 4, non-empty, aligned to choices
        - tags: required list[str] length 1, either allowed interest or 'auto'
        """
        data = json.loads(raw)

        cards = data.get("flashcards")
        if not isinstance(cards, list) or not cards:
            raise ValueError("Model returned JSON but missing or empty 'flashcards'")

        allowed = {x.strip() for x in (allowed_interests or []) if isinstance(x, str) and x.strip()}
        allowed.add("auto")

        for i, c in enumerate(cards):
            if not isinstance(c, dict):
                raise ValueError(f"flashcards[{i}] is not an object")

            q = c.get("question")
            if not isinstance(q, str) or not q.strip():
                raise ValueError(f"flashcards[{i}].question missing or blank")
            c["question"] = q.strip()

            choices = c.get("choices")
            if not isinstance(choices, list) or len(choices) != 4:
                raise ValueError(f"flashcards[{i}].choices must be a list of exactly 4 strings")

            cleaned_choices: list[str] = []
            for j, ch in enumerate(choices):
                if not isinstance(ch, str) or not ch.strip():
                    raise ValueError(f"flashcards[{i}].choices[{j}] missing or blank")
                cleaned_choices.append(ch.strip())

            if len({x.casefold() for x in cleaned_choices}) != 4:
                raise ValueError(f"flashcards[{i}].choices must contain 4 unique values (no duplicates)")
            c["choices"] = cleaned_choices

            ci = c.get("correct_index")
            if not isinstance(ci, int) or not (0 <= ci <= 3):
                raise ValueError(f"flashcards[{i}].correct_index must be an integer 0-3")

            explanations = c.get("explanations")
            if not isinstance(explanations, list) or len(explanations) != 4:
                raise ValueError(f"flashcards[{i}].explanations must be a list of exactly 4 strings")

            cleaned_expl: list[str] = []
            for j, ex in enumerate(explanations):
                if not isinstance(ex, str) or not ex.strip():
                    raise ValueError(f"flashcards[{i}].explanations[{j}] missing or blank")
                cleaned_expl.append(ex.strip())

            # Avoid identical explanations across choices (common failure mode)
            if len({x.casefold() for x in cleaned_expl}) != 4:
                raise ValueError(f"flashcards[{i}].explanations must be 4 distinct explanations (no duplicates)")
            c["explanations"] = cleaned_expl

            tags = c.get("tags")
            if tags is None or tags == []:
                c["tags"] = ["auto"]
                tags = c["tags"]

            if not isinstance(tags, list) or len(tags) != 1:
                raise ValueError(f"flashcards[{i}].tags must contain exactly one tag")

            t = tags[0]
            if not isinstance(t, str) or not t.strip():
                raise ValueError(f"flashcards[{i}].tags[0] must be a non-empty string")

            if t not in allowed:
                raise ValueError(
                    f"flashcards[{i}].tags[0] must be one of provided interests or 'auto' (got {t!r})"
                )

            # Sanity: correct_index points at an existing choice (already guaranteed by 0-3)
            _ = c["choices"][ci]
            _ = c["explanations"][ci]

        return cards
