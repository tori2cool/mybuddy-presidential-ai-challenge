"""Content expansion utilities.

Legacy (inline-trigger) helpers previously depended on non-existent Flashcard.slug
and Flashcard.difficulty fields.

The new flow is request/queue based:
- FastAPI routes create ContentExpansionRequest rows (idempotent per UTC hour bucket)
- Celery workers process those rows and generate flashcards

This module now only contains shared helpers used by the Celery worker.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import Flashcard


async def check_auto_flashcard_limit(
    session: AsyncSession,
    subject_id: str,
    age_range_id: Optional[str],
    difficulty_code: str,
) -> tuple[int, bool]:
    """Check how many flashcards exist for this subject/age/difficulty_code context.

    Returns (count, should_expand) where should_expand is True if count < max.

    Note: age_range_id may be None.
    """
    stmt = select(func.count(Flashcard.id)).where(
        Flashcard.subject_id == subject_id,
        Flashcard.difficulty_code == difficulty_code,
    )
    if age_range_id is None:
        stmt = stmt.where(Flashcard.age_range_id.is_(None))
    else:
        stmt = stmt.where(Flashcard.age_range_id == age_range_id)

    total_count = int((await session.execute(stmt)).scalar_one() or 0)
    should_expand = total_count < settings.max_auto_flashcards
    return total_count, should_expand
