from typing import Literal, Optional, List
from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .db import get_session
from .models import Child, Affirmation, Subject, Flashcard, Chore, OutdoorActivity

router = APIRouter(prefix="/v1", tags=["mybuddy-content"])


class ChildIn(BaseModel):
    id: Optional[str] = None
    name: str
    birthday: Optional[date] = None
    interests: Optional[List[str]] = None
    avatar: Optional[str] = None


def error_response(
    status: int,
    message: str,
    details: Optional[dict] = None,
) -> JSONResponse:
    payload: dict = {"error": message}
    if details is not None:
        payload["details"] = details
    return JSONResponse(status_code=status, content=payload)


# ---------- CHILD PROFILE ENDPOINTS ----------


@router.post("/children")
async def upsert_child(
    payload: ChildIn,
    session: AsyncSession = Depends(get_session),
):
    """
    Create or update a child profile.

    - If payload.id is provided and exists: update that child.
    - If payload.id is provided and does not exist: create with that id.
    - If payload.id is None: generate a new id.
    """
    interests = payload.interests or []
    child_id = payload.id or uuid4().hex

    stmt = select(Child).where(Child.id == child_id)
    result = await session.execute(stmt)
    child = result.scalars().first()

    if child is None:
        child = Child(
            id=child_id,
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

    await session.commit()
    await session.refresh(child)

    return {
        "id": child.id,
        "name": child.name,
        "birthday": child.birthday,
        "interests": child.interests,
        "avatar": child.avatar,
    }


@router.get("/children/{childId}")
async def get_child(
    childId: str,
    session: AsyncSession = Depends(get_session),
):
    """
    Upsert a child profile.

    - If payload.id is None: create a new child with a generated id.
    - If payload.id is provided:
      - If it exists: update that child.
      - If it doesn't exist: create a child with that id.
    """
    stmt = select(Child).where(Child.id == childId)
    result = await session.execute(stmt)
    child = result.scalars().first()

    if child is None:
        return error_response(
            404,
            "Not Found",
            {"message": "Child not found"},
        )

    return {
        "id": child.id,
        "name": child.name,
        "birthday": child.birthday,
        "interests": child.interests,
        "avatar": child.avatar,
    }


# ---------- CONTENT ENDPOINTS (REQUIRE childId WHERE PERSONALIZED) ----------


@router.get("/affirmations")
async def list_affirmations(
    child_id: str = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
):
    """
    List affirmations for a given child.

    childId is required so we can use the child's profile (age/interests)
    to tailor content in future phases.
    """
    # Validate childId
    child_stmt = select(Child).where(Child.id == child_id)
    child_result = await session.execute(child_stmt)
    child = child_result.scalars().first()
    if child is None:
        return error_response(
            400,
            "Bad Request",
            {"message": "Invalid childId; child does not exist."},
        )
    # TODO: Use child's age & interests to personalize affirmations.

    stmt = select(Affirmation)
    result = await session.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "text": row.text,
            "gradient": [row.gradient_0, row.gradient_1],
        }
        for row in rows
    ]


@router.get("/flashcards")
async def list_flashcards(
    subject_id: str = Query(..., alias="subjectId"),
    difficulty: Literal["easy", "medium", "hard"] = Query(...),
    child_id: str = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
):
    """
    List flashcards for a given subject & difficulty, personalized for a child.

    childId is required so we can incorporate the child's profile in future
    selection/AI logic.
    """
    # Validate childId
    child_stmt = select(Child).where(Child.id == child_id)
    child_result = await session.execute(child_stmt)
    child = child_result.scalars().first()
    if child is None:
        return error_response(
            400,
            "Bad Request",
            {"message": "Invalid childId; child does not exist."},
        )
    # TODO: Use child's age & interests to influence flashcard content.

    # Validate subject
    subject_stmt = select(Subject).where(Subject.id == subject_id)
    subject_result = await session.execute(subject_stmt)
    subject = subject_result.scalars().first()
    if subject is None:
        return error_response(
            400,
            "Bad Request",
            {"message": "Invalid subjectId; subject does not exist."},
        )

    stmt = select(Flashcard).where(
        Flashcard.subject_id == subject_id,
        Flashcard.difficulty == difficulty,
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "question": row.question,
            "answer": row.answer,
            "acceptableAnswers": list(row.acceptable_answers or []),
            "difficulty": row.difficulty,
        }
        for row in rows
    ]


@router.get("/subjects")
async def list_subjects(
    child_id: str = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
):
    """
    List subjects for a given child.

    childId is required so we can tailor which subjects to show or prioritize
    based on the child's age and interests in future.
    """
    # Validate childId
    child_stmt = select(Child).where(Child.id == child_id)
    child_result = await session.execute(child_stmt)
    child = child_result.scalars().first()
    if child is None:
        return error_response(
            400,
            "Bad Request",
            {"message": "Invalid childId; child does not exist."},
        )
    # TODO: Use child's age & interests to filter / rank subjects.

    stmt = select(Subject)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "icon": row.icon,
            "color": row.color,
        }
        for row in rows
    ]

@router.get("/chores/daily")
async def list_daily_chores(
    child_id: str = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
):
    """
    List today's chores for a given child.

    childId is required so we can make chore selection and tracking
    child-specific (age-appropriate, interest-aligned, and trackable).
    """
    # Validate childId
    child_stmt = select(Child).where(Child.id == child_id)
    child_result = await session.execute(child_stmt)
    child = child_result.scalars().first()
    if child is None:
        return error_response(
            400,
            "Bad Request",
            {"message": "Invalid childId; child does not exist."},
        )
    # TODO: Use child's age & history to select an appropriate set of chores.

    stmt = select(Chore)
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "id": row.id,
            "label": row.label,
            "icon": row.icon,
            "isExtra": row.is_extra,
        }
        for row in rows
    ]

@router.get("/outdoor/activities")
async def list_outdoor_activities(
    child_id: str = Query(..., alias="childId"),
    is_daily: Optional[bool] = Query(None, alias="isDaily"),
    session: AsyncSession = Depends(get_session),
):
    """
    List outdoor activities for a given child.

    childId is required so we can adapt activities based on the child's age,
    preferences, and past activity history.
    """
    # Validate childId
    child_stmt = select(Child).where(Child.id == child_id)
    child_result = await session.execute(child_stmt)
    child = child_result.scalars().first()
    if child is None:
        return error_response(
            400,
            "Bad Request",
            {"message": "Invalid childId; child does not exist."},
        )
    # TODO: Use child's age & interests to filter/sort activities.

    stmt = select(OutdoorActivity)
    if is_daily is not None:
        stmt = stmt.where(OutdoorActivity.is_daily == is_daily)

    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "category": row.category,
            "icon": row.icon,
            "time": row.time,
            "points": row.points,
            "isDaily": row.is_daily,
        }
        for row in rows
    ]