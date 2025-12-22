from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .models import Affirmation, Subject, Flashcard, Chore, OutdoorActivity

logger = logging.getLogger(__name__)

# This is a decent idea but I would like to create these by age and interest as well.
# Which will require updating some db
# I also don't want them being seeded on startup but instead a query to empty affirmations should trigger a celery seed task
# It would look something like for each child interest: 'create 5 affirmations for a 5 year old with the following interest.
DEFAULT_AFFIRMATIONS: list[dict[str, object]] = [
    {
        "id": "1",
        "text": "I am capable of amazing things",
        "gradient": ["#FF512F", "#DD2476"],
    },
    {
        "id": "2",
        "text": "Today is full of possibilities",
        "gradient": ["#2193b0", "#6dd5ed"],
    },
    {
        "id": "3",
        "text": "I am brave and strong",
        "gradient": ["#56ab2f", "#a8e063"],
    },
    {
        "id": "4",
        "text": "I can learn anything I put my mind to",
        "gradient": ["#00c6ff", "#0072ff"],
    },
    {
        "id": "5",
        "text": "I am kind to myself and others",
        "gradient": ["#ff9a9e", "#fad0c4"],
    },
    {
        "id": "6",
        "text": "I believe in myself",
        "gradient": ["#0f2027", "#203a43"],
    },
    {
        "id": "7",
        "text": "I am proud of who I am",
        "gradient": ["#FF512F", "#DD2476"],
    },
    {
        "id": "8",
        "text": "I spread positivity wherever I go",
        "gradient": ["#2193b0", "#6dd5ed"],
    },
]

# Seed content for core tables.
# These defaults are intentionally small and generic.

DEFAULT_SUBJECTS: list[dict[str, str]] = [
    {"id": "math", "name": "Math", "icon": "calculator", "color": "#4F46E5"},
    {"id": "reading", "name": "Reading", "icon": "book", "color": "#16A34A"},
    {"id": "science", "name": "Science", "icon": "flask", "color": "#F97316"},
]

DEFAULT_FLASHCARDS: list[dict[str, object]] = [
    {
        "id": "math_add_1",
        "subject_id": "math",
        "difficulty": "easy",
        "question": "What is 1 + 1?",
        "answer": "2",
        "acceptable_answers": ["2", "two"],
    },
    {
        "id": "math_add_2",
        "subject_id": "math",
        "difficulty": "easy",
        "question": "What is 2 + 2?",
        "answer": "4",
        "acceptable_answers": ["4", "four"],
    },
    {
        "id": "reading_vowel_a",
        "subject_id": "reading",
        "difficulty": "easy",
        "question": "Which letter is a vowel: A or B?",
        "answer": "A",
        "acceptable_answers": ["A", "a"],
    },
    {
        "id": "science_sun_hot",
        "subject_id": "science",
        "difficulty": "easy",
        "question": "Is the Sun hot or cold?",
        "answer": "hot",
        "acceptable_answers": ["hot"],
    },
]

DEFAULT_CHORES: list[dict[str, object]] = [
    {"id": "make_bed", "label": "Make your bed", "icon": "bed", "is_extra": False},
    {"id": "brush_teeth", "label": "Brush your teeth", "icon": "tooth", "is_extra": False},
    {"id": "pick_toys", "label": "Pick up toys", "icon": "blocks", "is_extra": False},
    {"id": "help_dishes", "label": "Help with dishes", "icon": "plate", "is_extra": True},
]

DEFAULT_OUTDOOR: list[dict[str, object]] = [
    {
        "id": "walk_10",
        "name": "Go for a 10-minute walk",
        "category": "movement",
        "icon": "walk",
        "time": "10 min",
        "points": 5,
        "is_daily": True,
    },
    {
        "id": "play_park",
        "name": "Play at the park",
        "category": "play",
        "icon": "park",
        "time": "30 min",
        "points": 10,
        "is_daily": False,
    },
]


async def seed_affirmations_if_empty(session: AsyncSession) -> int:
    """Idempotently seed default affirmations.

    Returns number of inserted rows.
    """

    existing = (await session.execute(select(Affirmation.id).limit(1))).first()
    if existing is not None:
        return 0

    rows = []
    for a in DEFAULT_AFFIRMATIONS:
        g0, g1 = a["gradient"]  # type: ignore[misc]
        rows.append(
            Affirmation(
                id=str(a["id"]),
                text=str(a["text"]),
                gradient_0=str(g0),
                gradient_1=str(g1),
            )
        )

    session.add_all(rows)
    await session.commit()

    logger.info("Seeded %d affirmations", len(rows))
    return len(rows)


async def seed_subjects_if_empty(session: AsyncSession) -> int:
    """Idempotently seed default subjects.

    Returns number of inserted rows.
    """

    existing = (await session.execute(select(Subject.id).limit(1))).first()
    if existing is not None:
        return 0

    rows = [Subject(**s) for s in DEFAULT_SUBJECTS]
    session.add_all(rows)
    await session.commit()

    logger.info("Seeded %d subjects", len(rows))
    return len(rows)


async def seed_flashcards_if_empty(session: AsyncSession) -> int:
    """Idempotently seed default flashcards.

    Assumes subjects are already present.

    Returns number of inserted rows.
    """

    existing = (await session.execute(select(Flashcard.id).limit(1))).first()
    if existing is not None:
        return 0

    rows: list[Flashcard] = []
    for fc in DEFAULT_FLASHCARDS:
        rows.append(
            Flashcard(
                id=str(fc["id"]),
                subject_id=str(fc["subject_id"]),
                question=str(fc["question"]),
                answer=str(fc["answer"]),
                acceptable_answers=list(fc.get("acceptable_answers") or []),
                difficulty=str(fc["difficulty"]),
            )
        )

    session.add_all(rows)
    await session.commit()

    logger.info("Seeded %d flashcards", len(rows))
    return len(rows)


async def seed_chores_if_empty(session: AsyncSession) -> int:
    """Idempotently seed default chores.

    Returns number of inserted rows.
    """

    existing = (await session.execute(select(Chore.id).limit(1))).first()
    if existing is not None:
        return 0

    rows: list[Chore] = []
    for c in DEFAULT_CHORES:
        rows.append(
            Chore(
                id=str(c["id"]),
                label=str(c["label"]),
                icon=str(c["icon"]),
                is_extra=bool(c["is_extra"]),
            )
        )

    session.add_all(rows)
    await session.commit()

    logger.info("Seeded %d chores", len(rows))
    return len(rows)


async def seed_outdoor_activities_if_empty(session: AsyncSession) -> int:
    """Idempotently seed default outdoor activities.

    Returns number of inserted rows.
    """

    existing = (await session.execute(select(OutdoorActivity.id).limit(1))).first()
    if existing is not None:
        return 0

    rows: list[OutdoorActivity] = []
    for oa in DEFAULT_OUTDOOR:
        rows.append(
            OutdoorActivity(
                id=str(oa["id"]),
                name=str(oa["name"]),
                category=str(oa["category"]),
                icon=str(oa["icon"]),
                time=str(oa["time"]),
                points=int(oa["points"]),
                is_daily=bool(oa["is_daily"]),
            )
        )

    session.add_all(rows)
    await session.commit()

    logger.info("Seeded %d outdoor activities", len(rows))
    return len(rows)
