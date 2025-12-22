# routers/content.py
from __future__ import annotations

from typing import Literal, Optional, List
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..db import get_session
from ..models import Child, Affirmation, Subject, Flashcard, Chore, OutdoorActivity
from ..security import get_current_user
from ..deps import get_child_owned_query, get_child_owned_path
from ..schemas.children import ChildUpsert, ChildOut
from ..tasks import redis_client, seed_content

SEED_LOCK_KEY = "seed:content"
SEED_LOCK_TTL_SECONDS = 300


def _enqueue_seed_if_needed() -> None:
    """Enqueue background seed task at most once per TTL.

    Uses Redis SET NX with TTL as a lightweight distributed lock.
    """

    try:
        acquired = redis_client.set(SEED_LOCK_KEY, "1", nx=True, ex=SEED_LOCK_TTL_SECONDS)
        if acquired:
            seed_content.delay()
    except Exception:
        # Never fail the request due to seed enqueuing.
        return

router = APIRouter(prefix="/v1", tags=["mybuddy-content"])

def child_to_dict(row: Child) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "birthday": row.birthday,
        "interests": row.interests,
        "avatar": row.avatar,
    }

@router.get("/children", response_model=list[ChildOut])
async def list_children(
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    owner_sub = user.get("sub")
    stmt = select(Child).where(Child.owner_sub == owner_sub).order_by(Child.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()

@router.post("/children", response_model=ChildOut)
async def upsert_child(
    payload: ChildUpsert,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    owner_sub = user.get("sub")
    interests = payload.interests

    if payload.id:
        stmt_any = select(Child).where(Child.id == payload.id)
        existing_any = (await session.execute(stmt_any)).scalars().first()
        if existing_any is not None and existing_any.owner_sub != owner_sub:
            raise HTTPException(status_code=403, detail="Child id belongs to another user")

        stmt = select(Child).where(Child.id == payload.id, Child.owner_sub == owner_sub)
        child = (await session.execute(stmt)).scalars().first()

        if child is None:
            child = Child(
                id=payload.id,
                owner_sub=owner_sub,
                name=payload.name,
                birthday=payload.birthday,
                interests=interests,
                avatar=payload.avatar,
            )
            session.add(child)
        else:
            child.name = payload.name
            child.birthday = payload.birthday
            child.interests = interests
            child.avatar = payload.avatar
    else:
        child = Child(
            id=uuid4().hex,
            owner_sub=owner_sub,
            name=payload.name,
            birthday=payload.birthday,
            interests=interests,
            avatar=payload.avatar,
        )
        session.add(child)

    await session.commit()
    await session.refresh(child)
    return child


@router.get("/children/{child_id}", response_model=ChildOut)
async def get_child(
    child: Child = Depends(get_child_owned_path),
):
    return child


@router.get("/affirmations")
async def list_affirmations(
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    # TODO: personalize using child.age/interests later
    any_row = (await session.execute(select(Affirmation.id).limit(1))).first()
    if any_row is None:
        _enqueue_seed_if_needed()
        return []

    rows = (await session.execute(select(Affirmation))).scalars().all()
    return [{"id": r.id, "text": r.text, "gradient": [r.gradient_0, r.gradient_1]} for r in rows]


@router.get("/subjects")
async def list_subjects(
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    any_row = (await session.execute(select(Subject.id).limit(1))).first()
    if any_row is None:
        _enqueue_seed_if_needed()
        return []

    rows = (await session.execute(select(Subject))).scalars().all()
    return [{"id": r.id, "name": r.name, "icon": r.icon, "color": r.color} for r in rows]


@router.get("/flashcards")
async def list_flashcards(
    subject_id: str = Query(..., alias="subjectId"),
    difficulty: Literal["easy", "medium", "hard"] = Query(...),
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    # If the DB hasn't been seeded yet, trigger seed_content and return empty.
    # This keeps /flashcards callable without requiring clients to call /subjects first.
    any_subject = (await session.execute(select(Subject.id).limit(1))).first()
    any_flashcard = (await session.execute(select(Flashcard.id).limit(1))).first()
    if any_subject is None or any_flashcard is None:
        _enqueue_seed_if_needed()
        return []

    subject = (await session.execute(select(Subject).where(Subject.id == subject_id))).scalars().first()
    if subject is None:
        raise HTTPException(status_code=400, detail="Invalid subjectId; subject does not exist.")

    stmt = select(Flashcard).where(Flashcard.subject_id == subject_id, Flashcard.difficulty == difficulty)
    rows = (await session.execute(stmt)).scalars().all()
    return [
        {
            "id": r.id,
            "question": r.question,
            "answer": r.answer,
            "acceptableAnswers": list(r.acceptable_answers or []),
            "difficulty": r.difficulty,
        }
        for r in rows
    ]


@router.get("/chores/daily")
async def list_daily_chores(
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    any_row = (await session.execute(select(Chore.id).limit(1))).first()
    if any_row is None:
        _enqueue_seed_if_needed()
        return []

    rows = (await session.execute(select(Chore))).scalars().all()
    return [{"id": r.id, "label": r.label, "icon": r.icon, "isExtra": r.is_extra} for r in rows]


@router.get("/outdoor/activities")
async def list_outdoor_activities(
    is_daily: Optional[bool] = Query(None, alias="isDaily"),
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    any_row = (await session.execute(select(OutdoorActivity.id).limit(1))).first()
    if any_row is None:
        _enqueue_seed_if_needed()
        return []

    stmt = select(OutdoorActivity)
    if is_daily is not None:
        stmt = stmt.where(OutdoorActivity.is_daily == is_daily)
    rows = (await session.execute(stmt)).scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "category": r.category,
            "icon": r.icon,
            "time": r.time,
            "points": r.points,
            "isDaily": r.is_daily,
        }
        for r in rows
    ]
