# app/services/events.py
from __future__ import annotations

from typing import Optional

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from app.models import ChildActivityEvent


def record_child_event(
    session: Session,
    *,
    child_id: str,
    kind: str,
    meta: Optional[dict] = None,
) -> bool:
    """
    Inserts an event unless one already exists for (child_id, kind) today (UTC date).
    Returns True if inserted, False if ignored due to duplicate.
    """

    stmt = (
        insert(ChildActivityEvent)
        .values(child_id=child_id, kind=kind, meta=meta)
        .on_conflict_do_nothing(constraint="uq_child_kind_per_day")
        .returning(ChildActivityEvent.id)
    )

    inserted_id = session.execute(stmt).scalar()
    session.commit()
    return inserted_id is not None