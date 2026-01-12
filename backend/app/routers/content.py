# backend/app/routers/content.py
from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from ..config import settings
from ..db import get_session
from ..models import (
    Child,
    Affirmation,
    Subject,
    Flashcard,
    Chore,
    OutdoorActivity,
    ChildFlashcardPerformance,
    SubjectAgeRange,
    Avatar,
    Interest,
    DifficultyThreshold,
    AgeRange,
)
from ..security import get_current_user
from ..deps import get_child_owned_query, get_child_owned_path
from ..schemas.children import ChildCreateIn, ChildUpdateIn, ChildOut
from ..schemas.difficulty import DifficultyOut
from ..tasks import redis_client, seed_content
from ..utils.age_utils import get_age_range_for_child

logger = logging.getLogger("mybuddy.api")

SEED_LOCK_KEY = "seed:content"
SEED_LOCK_TTL_SECONDS = 300

router = APIRouter(prefix="/v1", tags=["mybuddy-content"])


def _build_interest_boost_order(Table, interests: Optional[list]):
    """
    Order rows where Table.tags contains any interest first.
    Uses JSONB '?' operator.
    interests are stored on Child as JSONB list of strings/uuids.
    """
    if not interests:
        return None

    when_clauses = []
    for interest in interests:
        # coalesce tags to [] then test membership
        when_clauses.append((func.coalesce(Table.tags, text("'[]'::jsonb")).op("?")(str(interest)), 0))
    when_clauses.append((True, 1))
    return case(*when_clauses)


# ---------------------------------------------------------------------------
# Children
# ---------------------------------------------------------------------------

def _child_to_out(child: Child) -> ChildOut:
    """Map ORM Child -> API ChildOut.

    Do not return ORM objects directly: Child uses snake_case (avatar_id) and
    stores interests as list[str] in JSONB, while the API schema uses camelCase
    (avatarId) and interests as list[UUID].
    """

    return ChildOut(
        id=child.id,
        name=child.name,
        birthday=child.birthday,
        avatarId=child.avatar_id,
        interests=[UUID(x) for x in (child.interests or [])],
    )


@router.get("/children", response_model=list[ChildOut])
async def list_children(
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    owner_sub = user.get("sub")
    stmt = select(Child).where(Child.owner_sub == owner_sub).order_by(Child.created_at.desc())
    result = await session.execute(stmt)
    children = result.scalars().all()
    return [_child_to_out(c) for c in children]


@router.post("/children", response_model=ChildOut)
async def create_child(
    payload: ChildCreateIn,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    owner_sub = user.get("sub")

    child = Child(
        owner_sub=owner_sub,
        name=payload.name,
        birthday=payload.birthday,
        # store UUIDs as strings in JSONB (safe + consistent)
        interests=[str(x) for x in payload.interests],
        avatar_id=payload.avatarId,
    )
    session.add(child)
    await session.commit()
    await session.refresh(child)

    return _child_to_out(child)


@router.patch("/children/{child_id}", response_model=ChildOut)
async def update_child(
    child_id: UUID,
    payload: ChildUpdateIn,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    owner_sub = user.get("sub")
    child = (
        await session.execute(
            select(Child).where(Child.id == child_id, Child.owner_sub == owner_sub)
        )
    ).scalars().first()

    if child is None:
        raise HTTPException(status_code=404, detail="Child not found")

    if "name" in payload.model_fields_set:
        child.name = payload.name  # type: ignore[assignment]
    if "birthday" in payload.model_fields_set:
        child.birthday = payload.birthday  # type: ignore[assignment]
    if "interests" in payload.model_fields_set:
        child.interests = [str(x) for x in (payload.interests or [])]
    if "avatarId" in payload.model_fields_set:
        child.avatar_id = payload.avatarId

    session.add(child)
    await session.commit()
    await session.refresh(child)

    return _child_to_out(child)


@router.get("/children/{child_id}", response_model=ChildOut)
async def get_child(
    child: Child = Depends(get_child_owned_path),
):
    return _child_to_out(child)


# ---------------------------------------------------------------------------
# Content lists
# ---------------------------------------------------------------------------

@router.get("/affirmations")
async def list_affirmations(
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    try:
        age_range: Optional[AgeRange] = await get_age_range_for_child(child, session)
        logger.info(
            "list_affirmations: child_id=%s age_range_id=%s interests=%s",
            str(child.id),
            (str(age_range.id) if age_range else None),
            child.interests,
        )

        stmt = select(Affirmation)
        if age_range:
            stmt = stmt.where(Affirmation.age_range_id == age_range.id)

        interest_order = _build_interest_boost_order(Affirmation, child.interests)
        stmt = stmt.order_by(interest_order, func.random()) if interest_order is not None else stmt.order_by(func.random())

        rows = (await session.execute(stmt)).scalars().all()
        return [
            {
                "id": r.id,
                "text": r.text,
                "image": r.image,
                "gradient": [r.gradient_0, r.gradient_1],
                "tags": list(r.tags or []),
                "ageRangeId": r.age_range_id,
            }
            for r in rows
        ]
    except Exception as e:
        logger.exception("list_affirmations error: %s", e)
        return []


@router.get("/subjects")
async def list_subjects(
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    logger.info("list_subjects: child_id=%s", str(child.id))
    age_range: Optional[AgeRange] = await get_age_range_for_child(child, session)
    if age_range is None:
        logger.warning("list_subjects: no age_range resolved child_id=%s birthday=%s", str(child.id), child.birthday)
        return []

    rows = (
        await session.execute(
            select(Subject)
            .join(SubjectAgeRange, Subject.id == SubjectAgeRange.subject_id)
            .where(SubjectAgeRange.age_range_id == age_range.id)
            .order_by(Subject.name.asc())
        )
    ).scalars().all()

    logger.info(
        "list_subjects: returned count=%s child_id=%s age_range_id=%s",
        len(rows),
        str(child.id),
        str(age_range.id),
    )

    return [{"id": r.id, "code": r.code, "name": r.name, "icon": r.icon, "color": r.color} for r in rows]



@router.get("/flashcards")
async def list_flashcards(
    subject_code: str = Query(..., alias="subjectCode"),
    difficulty_code: str = Query(..., alias="difficultyCode"),
    limit: int = Query(5, ge=1, le=50),
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    logger.info(
        "list_flashcards: child_id=%s subjectCode=%s difficultyCode=%s limit=%s",
        str(child.id),
        subject_code,
        difficulty_code,
        limit,
    )

    any_subject = (await session.execute(select(Subject.id).limit(1))).first()
    any_flashcard = (await session.execute(select(Flashcard.id).limit(1))).first()
    if any_subject is None or any_flashcard is None:
        logger.warning(
            "list_flashcards: DB looks unseeded any_subject=%s any_flashcard=%s triggering_seed",
            bool(any_subject),
            bool(any_flashcard),
            str(child.id),
        )
        return []

    age_range: Optional[AgeRange] = await get_age_range_for_child(child, session)
    logger.info(
        "list_flashcards: resolved age_range_id=%s interests=%s child_id=%s",
        (str(age_range.id) if age_range else None),
        child.interests,
        str(child.id),
    )

    subject = (await session.execute(select(Subject).where(Subject.code == subject_code))).scalar_one_or_none()
    if subject is None:
        logger.warning("list_flashcards: invalid subjectCode=%s", subject_code)
        raise HTTPException(status_code=400, detail="Invalid subjectCode.")

    if age_range:
        subject_in_range = (
            await session.execute(
                select(SubjectAgeRange)
                .where(SubjectAgeRange.subject_id == subject.id)
                .where(SubjectAgeRange.age_range_id == age_range.id)
            )
        ).scalar_one_or_none()
        if not subject_in_range:
            logger.warning(
                "list_flashcards: subject not in age range subject_code=%s age_range_id=%s",
                subject_code,
                str(subject.id),
                str(age_range.id),
                str(child.id),
            )
            raise HTTPException(status_code=400, detail="Invalid subjectCode; subject is not available for this age range.")

    # Validate difficulty exists (optional but nice)
    diff_exists = (
        await session.execute(select(DifficultyThreshold.id).where(DifficultyThreshold.code == difficulty_code))
    ).scalar_one_or_none()
    if diff_exists is None:
        logger.warning("list_flashcards: invalid difficultyCode=%s child_id=%s", difficulty_code, str(child.id))
        raise HTTPException(status_code=400, detail="Invalid difficultyCode.")

    # Step 1: Get flashcard IDs with performance ordering data
    # Using a subquery approach to avoid DISTINCT + complex ORDER BY issues

    # IMPORTANT: When selecting ordered IDs in a subquery then re-joining to
    # Flashcard, Postgres does NOT guarantee that the outer query preserves the
    # subquery's ORDER BY unless we also ORDER BY on the outer statement.
    # To keep ordering stable + apply LIMIT correctly, we project the computed
    # ordering keys into the subquery and order by them again in the outer query.
    base_query = (
        select(
            Flashcard.id.label("fc_id"),
            ChildFlashcardPerformance.incorrect_count.label("wrong_cnt"),
            ChildFlashcardPerformance.correct_count.label("correct_cnt"),
        )
        .outerjoin(
            ChildFlashcardPerformance,
            (ChildFlashcardPerformance.child_id == child.id)
            & (ChildFlashcardPerformance.flashcard_id == Flashcard.id),
        )
        .where(
            Flashcard.subject_id == subject.id,
            Flashcard.difficulty_code == difficulty_code,
        )
    )

    if age_range:
        base_query = base_query.where(Flashcard.age_range_id == age_range.id)

    # Order: never seen first, then most wrong, then fewest correct
    wrong_score = case(
        (ChildFlashcardPerformance.incorrect_count.is_(None), 10_000),
        else_=ChildFlashcardPerformance.incorrect_count,
    )

    correct_score = case(
        (ChildFlashcardPerformance.correct_count.is_(None), 0),
        else_=ChildFlashcardPerformance.correct_count,
    )

    interest_order = _build_interest_boost_order(Flashcard, child.interests)

    # Boost newly auto-generated flashcards (tagged with 'auto') ahead of other cards.
    auto_score = case(
        (func.coalesce(Flashcard.tags, text("'[]'::jsonb")).op("?")("auto"), 0),
        else_=1,
    )

    # Random tie-breaker to avoid returning the same cards when scores are equal.
    # Projected into subquery so the outer query can re-order deterministically.
    rnd = func.random()

    # Project ordering keys into the subquery so the outer query can ORDER BY them.
    base_query = base_query.add_columns(
        wrong_score.label("wrong_score"),
        correct_score.label("correct_score"),
        auto_score.label("auto_score"),
        rnd.label("rnd"),
    )

    if interest_order is not None:
        base_query = base_query.add_columns(interest_order.label("interest_score"))
        base_query = base_query.order_by(
            wrong_score.desc(),
            correct_score.asc(),
            auto_score.asc(),
            interest_order.asc(),
            rnd,
        )
    else:
        base_query = base_query.order_by(
            wrong_score.desc(),
            correct_score.asc(),
            auto_score.asc(),
            rnd,
        )

    # Create subquery from step 1
    ordered_ids_subq = base_query.subquery()

    # Step 2: Fetch full Flashcard objects using the ordered IDs
    stmt = select(Flashcard).join(ordered_ids_subq, Flashcard.id == ordered_ids_subq.c.fc_id)

    # Preserve the ordering from the subquery.
    if "interest_score" in ordered_ids_subq.c:
        stmt = stmt.order_by(
            ordered_ids_subq.c.wrong_score.desc(),
            ordered_ids_subq.c.correct_score.asc(),
            ordered_ids_subq.c.auto_score.asc(),
            ordered_ids_subq.c.interest_score.asc(),
            ordered_ids_subq.c.rnd.asc(),
        )
    else:
        stmt = stmt.order_by(
            ordered_ids_subq.c.wrong_score.desc(),
            ordered_ids_subq.c.correct_score.asc(),
            ordered_ids_subq.c.auto_score.asc(),
            ordered_ids_subq.c.rnd.asc(),
        )

    # Apply limit to step 2 and execute
    result = await session.execute(stmt.limit(limit))
    rows = result.scalars().all()
    logger.info(
        "list_flashcards: returned count=%s child_id=%s subjectCode=%s difficultyCode=%s age_range_id=%s",
        len(rows),
        str(child.id),
        subject_code,
        difficulty_code,
        (str(age_range.id) if age_range else None),
    )

    # Ordering/selection diagnostics: log the returned flashcard IDs plus key ordering signals
    # (wrong/correct counts, tags, and auto flag).
    # NOTE: use INFO here (not DEBUG) so these show up in production logs when needed.
    try:
        returned_ids = [r.id for r in rows]

        perf_rows = (
            await session.execute(
                select(
                    Flashcard.id,
                    Flashcard.tags,
                    ChildFlashcardPerformance.incorrect_count,
                    ChildFlashcardPerformance.correct_count,
                )
                .outerjoin(
                    ChildFlashcardPerformance,
                    (ChildFlashcardPerformance.child_id == child.id)
                    & (ChildFlashcardPerformance.flashcard_id == Flashcard.id),
                )
                .where(Flashcard.id.in_(returned_ids))
            )
        ).all()

        perf_map = {
            row[0]: {
                "wrong_cnt": row[2],
                "correct_cnt": row[3],
                "tags": list(row[1] or []),
                "auto": ("auto" in (row[1] or [])),
            }
            for row in perf_rows
        }

        debug_rows = []
        for i, fc_id in enumerate(returned_ids):
            sig = perf_map.get(fc_id, {})
            debug_rows.append(
                {
                    "i": i,
                    "id": str(fc_id),
                    "wrong_cnt": sig.get("wrong_cnt"),
                    "correct_cnt": sig.get("correct_cnt"),
                    "auto": sig.get("auto"),
                    "tags": sig.get("tags"),
                }
            )

        logger.info(
            "list_flashcards: returned_debug child_id=%s subjectCode=%s difficultyCode=%s rows=%s",
            str(child.id),
            subject_code,
            difficulty_code,
            debug_rows,
        )
    except Exception as e:
        logger.exception("list_flashcards: returned_debug failed child_id=%s err=%s", str(child.id), e)

    return [
        {
            "id": r.id,
            "subjectId": r.subject_id,
            "question": r.question,
            "choices": list(r.choices or []),
            "correctIndex": r.correct_index,
            "explanations": list(r.explanations or []),
            "difficultyCode": r.difficulty_code,
            "tags": list(r.tags or []),
            "ageRangeId": r.age_range_id,
        }
        for r in rows
    ]


@router.get("/chores/daily")
async def list_daily_chores(
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    try:
        age_range: Optional[AgeRange] = await get_age_range_for_child(child, session)

        stmt = select(Chore).where(Chore.is_extra == False)
        if age_range:
            stmt = stmt.where(Chore.age_range_id == age_range.id)

        interest_order = _build_interest_boost_order(Chore, child.interests)
        stmt = stmt.order_by(interest_order, func.random()) if interest_order is not None else stmt.order_by(func.random())

        rows = (await session.execute(stmt)).scalars().all()
        return [
            {
                "id": r.id,
                "label": r.label,
                "icon": r.icon,
                "isExtra": r.is_extra,
                "tags": list(r.tags or []),
                "ageRangeId": r.age_range_id,
            }
            for r in rows
        ]
    except Exception as e:
        logger.exception("list_daily_chores error: %s", e)
        return []


@router.get("/chores/extra")
async def list_extra_chores(
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    try:
        age_range: Optional[AgeRange] = await get_age_range_for_child(child, session)

        stmt = select(Chore).where(Chore.is_extra == True)
        if age_range:
            stmt = stmt.where(Chore.age_range_id == age_range.id)

        interest_order = _build_interest_boost_order(Chore, child.interests)
        stmt = stmt.order_by(interest_order, func.random()) if interest_order is not None else stmt.order_by(func.random())

        rows = (await session.execute(stmt)).scalars().all()
        return [
            {
                "id": r.id,
                "label": r.label,
                "icon": r.icon,
                "isExtra": r.is_extra,
                "tags": list(r.tags or []),
                "ageRangeId": r.age_range_id,
            }
            for r in rows
        ]
    except Exception as e:
        logger.exception("list_extra_chores error: %s", e)
        return []


@router.get("/outdoor/activities")
async def list_outdoor_activities(
    is_daily: Optional[bool] = Query(None, alias="isDaily"),
    child: Child = Depends(get_child_owned_query),
    session: AsyncSession = Depends(get_session),
):
    try:
        age_range: Optional[AgeRange] = await get_age_range_for_child(child, session)

        stmt = select(OutdoorActivity)
        if is_daily is not None:
            stmt = stmt.where(OutdoorActivity.is_daily == is_daily)
        if age_range:
            stmt = stmt.where(OutdoorActivity.age_range_id == age_range.id)

        interest_order = _build_interest_boost_order(OutdoorActivity, child.interests)
        stmt = stmt.order_by(interest_order, func.random()) if interest_order is not None else stmt.order_by(func.random())

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
                "tags": list(r.tags or []),
                "ageRangeId": r.age_range_id,
            }
            for r in rows
        ]
    except Exception as e:
        logger.exception("list_outdoor_activities error: %s", e)
        return []


@router.get("/avatars")
async def list_avatars(
    session: AsyncSession = Depends(get_session),
):
    """Get all available avatars for child profile creation."""
    try:
        rows = (await session.execute(select(Avatar).where(Avatar.is_active == True))).scalars().all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "imagePath": f"{settings.backend_img_url}/{r.image_path}",
                "isActive": r.is_active,
            }
            for r in rows
        ]
    except Exception as e:
        logger.exception("list_avatars error: %s", e)
        return []


@router.get("/interests")
async def list_interests(
    session: AsyncSession = Depends(get_session),
):
    """Get all available interests for child onboarding."""
    try:
        rows = (await session.execute(select(Interest).where(Interest.is_active == True))).scalars().all()
        return [
            {
                "id": r.id,
                "name": r.name,
                "label": r.label,
                "icon": r.icon,
                "isActive": r.is_active,
            }
            for r in rows
        ]
    except Exception as e:
        logger.exception("list_interests error: %s", e)
        return []


@router.get("/difficulties", response_model=list[DifficultyOut])
async def list_difficulties(
    session: AsyncSession = Depends(get_session),
):
    """Get all difficulty tiers with labels, icons, and colors."""
    try:
        rows = (await session.execute(select(DifficultyThreshold).where(DifficultyThreshold.is_active == True))).scalars().all()
        return rows
    except Exception as e:
        logger.exception("list_difficulties error: %s", e)
        return []
