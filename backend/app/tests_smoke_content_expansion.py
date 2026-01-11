import json

import pytest

from app.services.ai_flashcard_generator import FlashcardGenerator


def test_build_prompt_does_not_raise_keyerror_with_examples_json():
    gen = FlashcardGenerator()

    examples = [
        {
            "question": "What is 2 + 2?",
            "answer": "4",
            "acceptable_answers": ["four"],
        }
    ]

    # This previously could crash with KeyError when using str.format on a prompt
    # that contained JSON braces.
    prompt = gen._build_prompt(
        subject="Math",
        age_range="6-8",
        difficulty="easy",
        interests=["puzzles"],
        count=3,
        examples=examples,
    )

    assert "\"flashcards\"" in prompt
    assert "Subject: Math" in prompt
    assert "Age range: 6-8" in prompt
    assert "Difficulty: easy" in prompt
    assert "Interests: puzzles" in prompt

    # Ensure the schema snippet embedded in the prompt is valid JSON.
    start = prompt.index("Output schema (JSON):")
    schema_json_str = prompt[start:].split("```json\n", 1)[1].split("\n```", 1)[0]
    parsed = json.loads(schema_json_str)
    assert "flashcards" in parsed
