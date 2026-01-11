import json
import logging
from openai import AsyncOpenAI

from ..config import settings

logger = logging.getLogger(__name__)


class FlashcardGenerator:
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
    ) -> str:
        """Build prompt for model.

        If examples are provided, they are embedded as JSON to guide style/format.

        IMPORTANT: Do not use str.format() on prompts that contain JSON braces.
        """

        interest_str = ", ".join([x for x in (interests or []) if x])

        schema_template = {
            "flashcards": [
                {
                    "question": "...",
                    "answer": "...",
                    "acceptable_answers": ["..."],
                    "tags": ["..."],
                }
            ]
        }
        schema_json = json.dumps(schema_template, ensure_ascii=False, indent=2)

        sections: list[str] = [
            f"Generate exactly {count} unique flashcards as JSON with the top-level key 'flashcards'.",
            f"Return exactly {count} items in the 'flashcards' array (no more, no fewer).",
            "Each flashcard must be an object with keys: question (string), answer (string), acceptable_answers (optional list of strings), tags (optional list of strings).",
            "If you include tags, ONLY choose from the provided Interests list exactly (case-sensitive).",
            "Only tag a flashcard when an interest is truly applicable to the content. Tags may be empty or omitted.",
            "Questions should be engaging and age-appropriate.",
            "Do NOT copy, paraphrase, or duplicate any provided examples. Use them only to match style/format; all questions/answers must be novel.",
            "Avoid repeating the same concept across multiple flashcards in this batch.",
            "",
            f"Subject: {subject}",
            f"Age range: {age_range}",
            f"Difficulty: {difficulty}",
            f"Interests: {interest_str if interest_str else 'none'}",
            "",
            "Output schema (JSON):",
            "```json",
            schema_json,
            "```",
        ]

        if examples:
            examples_json = json.dumps(examples, ensure_ascii=False, indent=2)
            sections.extend(
                [
                    "",
                    "Here are example flashcards in the desired style (JSON objects):",
                    "```json",
                    examples_json,
                    "```",
                ]
            )

        sections.extend(["", "Return ONLY valid JSON."])
        return "\n".join(sections)

    async def generate_flashcards(
        self,
        subject: str,
        age_range: str,
        difficulty: str,
        interests: list[str],
        count: int = 10,
        examples: list[dict] | None = None,
    ) -> list[dict]:
        prompt = self._build_prompt(subject, age_range, difficulty, interests, count, examples=examples)

        client: AsyncOpenAI | None = None
        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educational content creator. Create engaging, age-appropriate flashcard questions.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )

            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("OpenAI returned empty message content")

            return self._parse_result_strict(content)

        except Exception:
            # Log everything, keep stack trace, DO NOT recover
            logger.exception(
                "[AI Flashcard Generator] generation failed "
                "(subject=%s age_range=%s difficulty=%s count=%s)",
                subject,
                age_range,
                difficulty,
                count,
            )
            raise  # let the caller handle failure

        finally:
            # Celery uses asyncio.run() which closes the loop at task end; ensure
            # the OpenAI client's underlying httpx client is closed before that.
            if client is not None:
                close_fn = getattr(client, "close", None) or getattr(client, "aclose", None)
                if close_fn is not None:
                    try:
                        res = close_fn()
                        if res is not None:
                            await res
                    except Exception:
                        logger.exception(
                            "[AI Flashcard Generator] failed to close OpenAI client cleanly"
                        )

    def _parse_result_strict(self, raw: str) -> list[dict]:
        data = json.loads(raw)  # raises JSONDecodeError if invalid

        cards = data.get("flashcards")
        if not isinstance(cards, list) or not cards:
            raise ValueError("Model returned JSON but missing or empty 'flashcards'")

        for i, c in enumerate(cards):
            if not isinstance(c, dict):
                raise ValueError(f"flashcards[{i}] is not an object")
            if not isinstance(c.get("question"), str) or not c["question"].strip():
                raise ValueError(f"flashcards[{i}].question missing or blank")
            if not isinstance(c.get("answer"), str) or not c["answer"].strip():
                raise ValueError(f"flashcards[{i}].answer missing or blank")
            if "acceptable_answers" in c and not isinstance(c["acceptable_answers"], list):
                raise ValueError(f"flashcards[{i}].acceptable_answers must be a list")
            if "tags" in c and not isinstance(c["tags"], list):
                raise ValueError(f"flashcards[{i}].tags must be a list")
            if "tags" in c and any((not isinstance(t, str) or not t.strip()) for t in (c.get("tags") or [])):
                raise ValueError(f"flashcards[{i}].tags must be a list of non-empty strings")

        return cards
