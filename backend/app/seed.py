from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .models import Affirmation

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
