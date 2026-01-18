from __future__ import annotations

import hashlib
import json
import logging
import random
from typing import Any

from openai import AsyncOpenAI

from ..config import settings
from .prompt_agents import PromptCtx, build_prompt

logger = logging.getLogger(__name__)

class FlashcardGenerator:
    """Generates educational multiple-choice flashcards."""

    _EXTRA_CARDS: int = 6
    _MAX_ATTEMPTS: int = 2

    _MAX_Q_LEN = 140
    _MAX_CHOICE_LEN = 60
    _MAX_EXPL_LEN = 120

    def __init__(self):
        self.model = settings.flashcard_model
        logger.info(
            "[AI Flashcard Generator] configured: api_key_set=%s api_base_set=%s model=%s",
            bool(settings.flashcard_api_key),
            bool(settings.flashcard_api_base),
            self.model,
        )

    def _get_client(self) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=settings.flashcard_api_key, base_url=settings.flashcard_api_base)

    # -----------------------------
    # Deterministic shuffle helpers
    # -----------------------------

    @staticmethod
    def _stable_seed_for_card(
        *, subject: str, age_range_code: str, difficulty: str, question: str, salt: str = ""
    ) -> int:
        joined = "||".join(
            [
                (subject or "").strip(),
                (age_range_code or "").strip(),
                (difficulty or "").strip(),
                (question or "").strip(),
                (salt or "").strip(),
            ]
        )
        digest = hashlib.sha256(joined.encode("utf-8")).digest()
        return int.from_bytes(digest[:8], "big", signed=False)

    @staticmethod
    def _shuffle_one_card_in_place(
        c: dict[str, Any],
        *,
        subject: str,
        age_range_code: str,
        difficulty: str,
        deterministic: bool = True,
        salt: str = "",
    ) -> None:
        choices: list[str] = c["choices"]
        explanations: list[str] = c["explanations"]
        correct_index: int = c["correct_index"]

        correct_choice = choices[correct_index]
        correct_expl = explanations[correct_index]

        paired = list(zip(choices, explanations))
        rng = random.Random()
        if deterministic:
            rng.seed(
                FlashcardGenerator._stable_seed_for_card(
                    subject=subject,
                    age_range_code=age_range_code,
                    difficulty=difficulty,
                    question=str(c.get("question", "")),
                    salt=salt,
                )
            )
        else:
            rng.seed()

        for _ in range(6):
            rng.shuffle(paired)
            if paired[0][0] != correct_choice:
                break

        new_choices, new_explanations = zip(*paired)
        new_choices = list(new_choices)
        new_explanations = list(new_explanations)

        new_correct_index = new_choices.index(correct_choice)

        if new_explanations[new_correct_index] != correct_expl:
            for idx, (ch, ex) in enumerate(zip(new_choices, new_explanations)):
                if ch == correct_choice and ex == correct_expl:
                    new_correct_index = idx
                    break

        c["choices"] = new_choices
        c["explanations"] = new_explanations
        c["correct_index"] = new_correct_index

    def _shuffle_cards_post_parse(
        self,
        cards: list[dict[str, Any]],
        *,
        subject: str,
        age_range_code: str,
        difficulty: str,
        deterministic: bool = True,
    ) -> list[dict[str, Any]]:
        for c in cards:
            self._shuffle_one_card_in_place(
                c,
                subject=subject,
                age_range_code=age_range_code,
                difficulty=difficulty,
                deterministic=deterministic,
                salt="initial",
            )
        return cards

    # -----------------------------
    # Prompting
    # -----------------------------

    def _build_prompt(
        self,
        subject: str,
        difficulty: str,
        topic_tags: list[str],
        count: int,
        examples: list[dict] | None = None,
        *,
        age_range_code: str,
        topic_pool: list[dict] | None = None,
        examples_difficulty_used: str | None = None,
        requested_difficulty: str | None = None,
    ) -> str:
        ctx = PromptCtx(
            subject=subject,
            age_range_code=age_range_code,
            difficulty=difficulty,  # authoritative
            allowed_tags=topic_tags,
            count=count,
            max_q_len=self._MAX_Q_LEN,
            max_choice_len=self._MAX_CHOICE_LEN,
            max_expl_len=self._MAX_EXPL_LEN,
            topic_pool=topic_pool,
            examples=examples,
            examples_difficulty_used=examples_difficulty_used,
            requested_difficulty=requested_difficulty,
        )
        return build_prompt(ctx)

    # -----------------------------
    # Strict parsing / validation
    # -----------------------------

    def _parse_json_object(self, raw: str) -> dict[str, Any]:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("Model returned JSON but top-level is not an object")
        return data

    def _validate_one_card(self, c: Any, *, topic_tags: set[str]) -> dict[str, Any]:
        if not isinstance(c, dict):
            raise ValueError("card is not an object")

        q = c.get("question")
        if not isinstance(q, str) or not q.strip():
            raise ValueError("question missing or blank")
        c["question"] = q.strip()

        choices = c.get("choices")
        if not isinstance(choices, list) or len(choices) != 4:
            raise ValueError("choices must be a list of exactly 4 strings")

        cleaned_choices: list[str] = []
        for j, ch in enumerate(choices):
            if not isinstance(ch, str) or not ch.strip():
                raise ValueError(f"choices[{j}] missing or blank")
            cleaned_choices.append(ch.strip())

        if len({x.casefold() for x in cleaned_choices}) != 4:
            raise ValueError("choices must contain 4 unique values (no duplicates)")
        c["choices"] = cleaned_choices

        ci = c.get("correct_index")
        if not isinstance(ci, int) or not (0 <= ci <= 3):
            raise ValueError("correct_index must be an integer 0-3")

        explanations = c.get("explanations")
        if not isinstance(explanations, list) or len(explanations) != 4:
            raise ValueError("explanations must be a list of exactly 4 strings")

        cleaned_expl: list[str] = []
        for j, ex in enumerate(explanations):
            if not isinstance(ex, str) or not ex.strip():
                raise ValueError(f"explanations[{j}] missing or blank")
            cleaned_expl.append(ex.strip())

        if len({x.casefold() for x in cleaned_expl}) != 4:
            raise ValueError("explanations must be 4 distinct explanations (no duplicates)")
        c["explanations"] = cleaned_expl

        tags = c.get("tags")
        if not isinstance(tags, list) or len(tags) != 1:
            raise ValueError("tags must contain exactly one tag")

        t = tags[0]
        if not isinstance(t, str) or not t.strip():
            raise ValueError("tags[0] must be a non-empty string")
        t = t.strip()
        if t not in topic_tags:
            raise ValueError(f"tags[0] must be one of topic_tags (got {t!r})")
        c["tags"] = [t]

        _ = c["choices"][ci]
        _ = c["explanations"][ci]

        return c

    # -----------------------------
    # Main API
    # -----------------------------

    async def generate_flashcards(
        self,
        subject: str,
        difficulty: str,
        topic_tags: list[str],
        count: int = 10,
        examples: list[dict] | None = None,
        *,
        age_range_code: str,
        topic_pool: list[dict] | None = None,
        examples_difficulty_used: str | None = None,
        requested_difficulty: str | None = None,
        enforce_exact_count: bool = True,
    ) -> list[dict[str, Any]]:
        logger.debug(
            "[AI Flashcard Generator] start (subject=%s age_range_code=%s difficulty=%s count=%s topic_tags_count=%s)",
            subject,
            age_range_code,
            difficulty,
            count,
            len(topic_tags or []),
        )

        requested_n = count + self._EXTRA_CARDS

        client: AsyncOpenAI | None = None
        try:
            client = self._get_client()

            allowed = {x.strip() for x in (topic_tags or []) if isinstance(x, str) and x.strip()}
            if not allowed:
                raise ValueError("topic_tags must be a non-empty list of strings")

            accepted: list[dict[str, Any]] = []

            for attempt in range(1, self._MAX_ATTEMPTS + 1):
                prompt = self._build_prompt(
                    subject,
                    difficulty,
                    list(allowed),
                    requested_n,
                    examples=examples,
                    age_range_code=age_range_code,
                    topic_pool=topic_pool,
                    examples_difficulty_used=examples_difficulty_used,
                    requested_difficulty=requested_difficulty or difficulty,
                )

                response = await client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You create engaging, age-appropriate multiple-choice questions (MCQ) "
                                "and strictly follow formatting constraints. Return only valid JSON."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                )

                content = response.choices[0].message.content
                if not content:
                    raise RuntimeError("OpenAI returned empty message content")

                data = self._parse_json_object(content)
                cards = data.get("flashcards")
                if not isinstance(cards, list):
                    raise ValueError("Model returned JSON but missing 'flashcards' list")

                for idx, c in enumerate(cards):
                    if len(accepted) >= count:
                        break
                    try:
                        accepted.append(self._validate_one_card(c, topic_tags=allowed))
                    except Exception as e:
                        logger.debug(
                            "[AI Flashcard Generator] dropping invalid card (attempt=%s idx=%s err=%s)",
                            attempt,
                            idx,
                            e,
                        )

                if len(accepted) >= count:
                    break

            # Deterministic shuffle to avoid correct_index positional bias (no rejection).
            accepted = self._shuffle_cards_post_parse(
                accepted,
                subject=subject,
                age_range_code=age_range_code,
                difficulty=difficulty,
                deterministic=True,
            )

            if enforce_exact_count and len(accepted) < count:
                raise ValueError(f"Insufficient valid flashcards: got {len(accepted)} expected {count}")

            return accepted[:count]

        except Exception:
            logger.exception(
                "[AI Flashcard Generator] generation failed (subject=%s age_range_code=%s difficulty=%s count=%s)",
                subject,
                age_range_code,
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
