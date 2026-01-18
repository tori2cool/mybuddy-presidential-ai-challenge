# backend/app/routers/content.py
from __future__ import annotations

import hashlib
import logging
import random
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..config import settings
from ..db import get_session
from ..deps import get_child_owned_path, get_child_owned_query
from ..models import (
    AgeRange,
    Affirmation,
    Avatar,
    Child,
    ChildBalancedProgressCounter,
    ChildFlashcardPerformance,
    ChildProgress,
    ChildSubjectDifficulty,
    ChildSubjectStreak,
    Chore,
    DifficultyThreshold,
    Flashcard,
    Interest,
    LevelThreshold,
    OutdoorActivity,
    Subject,
    SubjectAgeRange,
)
from ..schemas.children import ChildCreateIn, ChildOut, ChildUpdateIn
from ..schemas.difficulty import DifficultyOut
from ..security import get_current_user
from ..services.content_expansion_queue import (
    create_content_expansion_request,
    enqueue_content_expansion_request_after_commit,
)
from ..services.progress_queries import (
    get_difficulty_thresholds,
    list_subject_codes,
    list_subject_uuids,
)
from ..tasks import redis_client, seed_content
from ..utils.age_utils import get_age_range_for_child

logger = logging.getLogger("mybuddy.api")

SEED_LOCK_KEY = "seed:content"
SEED_LOCK_TTL_SECONDS = 300

router = APIRouter(prefix="/v1", tags=["mybuddy-content"])


def _shuffle_flashcard_payload(
    *,
    flashcard_id: UUID,
    child_id: UUID,
    subject_code: str,
    difficulty_code: str,
    question: str,
    choices: list[str],
    explanations: list[str],
    correct_index: int,
    deterministic_per_day: bool = False,
) -> tuple[list[str], list[str], int]:
    """
    Shuffles choices+explanations together and returns new (choices, explanations, correct_index).

    - If deterministic_per_day=True, the shuffle is stable for the same child+card within a day.
    - If False, shuffle changes each request.
    """
    if not choices or not explanations or len(choices) != 4 or len(explanations) != 4:
        return choices, explanations, correct_index

    correct_choice = choices[correct_index]
    correct_expl = explanations[correct_index]

    paired = list(zip(choices, explanations))

    rng = random.Random()
    if deterministic_per_day:
        # Stable within a day so the kid doesn’t see options jump around if they refresh quickly
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        seed_src = f"{child_id}||{flashcard_id}||{subject_code}||{difficulty_code}||{day}||{question}"
        digest = hashlib.sha256(seed_src.encode("utf-8")).digest()
        rng.seed(int.from_bytes(digest[:8], "big", signed=False))
    else:
        rng.seed()  # random each request

    # Try a few times to avoid leaving the correct answer at index 0 (optional)
    for _ in range(6):
        rng.shuffle(paired)
        if paired[0][0] != correct_choice:
            break

    new_choices, new_explanations = zip(*paired)
    new_choices = list(new_choices)
    new_explanations = list(new_explanations)

    new_correct_index = new_choices.index(correct_choice)

    # Sanity: correct explanation stays paired
    if new_explanations[new_correct_index] != correct_expl:
        for idx, (ch, ex) in enumerate(zip(new_choices, new_explanations)):
            if ch == correct_choice and ex == correct_expl:
                new_correct_index = idx
                break

    return new_choices, new_explanations, new_correct_index


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


async def _maybe_enqueue_targeted_flashcard_generation(
    session: AsyncSession,
    *,
    child: Child,
    subject_id: UUID,
    age_range_id: UUID,
    difficulty_code: str,
    trigger: str = "empty_pool",
) -> None:
    """
    If flashcards query returns empty, enqueue targeted generation for the exact tuple:
    (child, subject, age_range, difficulty).

    IMPORTANT:
    - This is NOT a global seed. Global seed happens elsewhere.
    - Idempotency/dedupe is handled by create_content_expansion_request.
    """
    try:
        create_res = await create_content_expansion_request(
            session,
            child_id=child.id,
            subject_id=subject_id,
            age_range_id=age_range_id,
            difficulty_code=difficulty_code,
            trigger=trigger,
        )

        if create_res.created:
            # Persist the request row before enqueue.
            await session.commit()
            enqueue_content_expansion_request_after_commit(create_res.request.id)

            logger.warning(
                "flashcards_empty: enqueued child_id=%s subject_id=%s age_range_id=%s difficulty=%s trigger=%s req_id=%s",
                str(child.id),
                str(subject_id),
                str(age_range_id),
                difficulty_code,
                trigger,
                str(create_res.request.id),
            )
        else:
            logger.info(
                "flashcards_empty: request_deduped child_id=%s subject_id=%s age_range_id=%s difficulty=%s trigger=%s",
                str(child.id),
                str(subject_id),
                str(age_range_id),
                difficulty_code,
                trigger,
            )
    except Exception:
        logger.exception(
            "flashcards_empty: enqueue_failed child_id=%s subject_id=%s age_range_id=%s difficulty=%s trigger=%s",
            str(child.id),
            str(subject_id),
            str(age_range_id),
            difficulty_code,
            trigger,
        )


# ---------------------------------------------------------------------------
# Children
# ---------------------------------------------------------------------------

def _child_to_out(child: Child) -> ChildOut:
    """Map ORM Child -> API ChildOut."""
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
    await session.flush()
    await session.refresh(child)

    # Initialize per-child progress row (level + non-null subject_counts)
    first_level = (
        await session.execute(
            select(LevelThreshold)
            .where(LevelThreshold.is_active == True)  # noqa: E712
            .order_by(LevelThreshold.threshold.asc())
            .limit(1)
        )
    ).scalar_one_or_none()

    initial_level = first_level.name if first_level is not None else "New Kid"

    progress_row = (
        await session.execute(select(ChildProgress).where(ChildProgress.child_id == child.id))
    ).scalar_one_or_none()
    if progress_row is None:
        progress_row = ChildProgress(child_id=child.id, current_level=initial_level, subject_counts={})
        session.add(progress_row)
    else:
        # Be defensive for legacy rows
        progress_row.current_level = progress_row.current_level or initial_level
        if progress_row.subject_counts is None:
            progress_row.subject_counts = {}

    # Initialize balanced progress counters for subjects visible to the child
    subject_codes = await list_subject_codes(session, child_id=child.id)
    if subject_codes:
        existing = (
            await session.execute(
                select(ChildBalancedProgressCounter).where(
                    ChildBalancedProgressCounter.child_id == child.id,
                    ChildBalancedProgressCounter.subject_code.in_(subject_codes),
                )
            )
        ).scalars().all()
        existing_codes = {r.subject_code for r in existing}

        for code in subject_codes:
            if code not in existing_codes:
                session.add(
                    ChildBalancedProgressCounter(child_id=child.id, subject_code=code, correct_count=0)
                )

    # Initialize per-subject difficulty + streak rows
    subject_ids = await list_subject_uuids(session, child_id=child.id)

    thresholds = await get_difficulty_thresholds(session)
    default_diff = min(thresholds.items(), key=lambda kv: kv[1])[0] if thresholds else "easy"

    now = datetime.now(timezone.utc)

    if subject_ids:
        existing_diff_rows = (
            await session.execute(
                select(ChildSubjectDifficulty.subject_id).where(
                    ChildSubjectDifficulty.child_id == child.id,
                    ChildSubjectDifficulty.subject_id.in_(subject_ids),
                )
            )
        ).all()
        existing_diff_ids = {r[0] for r in existing_diff_rows}

        for sid in subject_ids:
            if sid not in existing_diff_ids:
                session.add(
                    ChildSubjectDifficulty(
                        child_id=child.id,
                        subject_id=sid,
                        difficulty_code=default_diff,
                        last_updated=now,
                    )
                )

        existing_streak_rows = (
            await session.execute(
                select(ChildSubjectStreak.subject_id).where(
                    ChildSubjectStreak.child_id == child.id,
                    ChildSubjectStreak.subject_id.in_(subject_ids),
                )
            )
        ).all()
        existing_streak_ids = {r[0] for r in existing_streak_rows}

        for sid in subject_ids:
            if sid not in existing_streak_ids:
                session.add(
                    ChildSubjectStreak(
                        child_id=child.id,
                        subject_id=sid,
                        current_streak=0,
                        longest_streak=0,
                    )
                )

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
    await session.flush()
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

    # Global seed exists, but NOT from this endpoint.
    any_subject = (await session.execute(select(Subject.id).limit(1))).first()
    if any_subject is None:
        logger.warning("list_flashcards: no subjects seeded; cannot serve/generate (child_id=%s)", str(child.id))
        return []

    age_range: Optional[AgeRange] = await get_age_range_for_child(child, session)
    logger.info(
        "list_flashcards: resolved age_range_id=%s child_id=%s",
        (str(age_range.id) if age_range else None),
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
                "list_flashcards: subject not in age range subject_code=%s age_range_id=%s subject_id=%s child_id=%s",
                subject_code,
                (str(age_range.id) if age_range else None),
                str(subject.id),
                str(child.id),
            )
            raise HTTPException(status_code=400, detail="Invalid subjectCode; subject is not available for this age range.")
    else:
        # Without a resolved age range we can't do a targeted generation request.
        logger.warning("list_flashcards: no age_range resolved; returning empty child_id=%s", str(child.id))
        return []

    # Validate difficulty exists (optional but nice)
    diff_exists = (
        await session.execute(select(DifficultyThreshold.id).where(DifficultyThreshold.code == difficulty_code))
    ).scalar_one_or_none()
    if diff_exists is None:
        logger.warning("list_flashcards: invalid difficultyCode=%s child_id=%s", difficulty_code, str(child.id))
        raise HTTPException(status_code=400, detail="Invalid difficultyCode.")

    # Step 1: Get flashcard IDs with performance ordering data
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
            Flashcard.age_range_id == age_range.id,  # age_range is guaranteed above
        )
    )

    # Order: never seen first, then most wrong, then fewest correct
    wrong_score = case(
        (ChildFlashcardPerformance.incorrect_count.is_(None), 10_000),
        else_=ChildFlashcardPerformance.incorrect_count,
    )

    correct_score = case(
        (ChildFlashcardPerformance.correct_count.is_(None), 0),
        else_=ChildFlashcardPerformance.correct_count,
    )

    # Random tie-breaker to avoid returning the same cards when scores are equal.
    rnd = func.random()

    base_query = base_query.add_columns(
        wrong_score.label("wrong_score"),
        correct_score.label("correct_score"),
        rnd.label("rnd"),
    )

    base_query = base_query.order_by(
        wrong_score.desc(),
        correct_score.asc(),
        rnd,
    )

    ordered_ids_subq = base_query.subquery()

    # Step 2: Fetch full Flashcard objects using the ordered IDs and preserve order
    stmt = select(Flashcard).join(ordered_ids_subq, Flashcard.id == ordered_ids_subq.c.fc_id)

    stmt = stmt.order_by(
        ordered_ids_subq.c.wrong_score.desc(),
        ordered_ids_subq.c.correct_score.asc(),
        ordered_ids_subq.c.rnd.asc(),
    )

    result = await session.execute(stmt.limit(limit))
    rows = result.scalars().all()
    logger.info(
        "list_flashcards: returned count=%s child_id=%s subjectCode=%s difficultyCode=%s age_range_id=%s",
        len(rows),
        str(child.id),
        subject_code,
        difficulty_code,
        str(age_range.id),
    )

    # If empty, enqueue targeted generation for this tuple and return [].
    if not rows:
        await _maybe_enqueue_targeted_flashcard_generation(
            session,
            child=child,
            subject_id=subject.id,
            age_range_id=age_range.id,
            difficulty_code=difficulty_code,
            trigger="empty_pool",
        )
        return []

    # Ordering/selection diagnostics
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

    out = []
    for r in rows:
        choices = list(r.choices or [])
        explanations = list(r.explanations or [])
        correct_index = int(r.correct_index)

        shuffled_choices, shuffled_expl, shuffled_ci = _shuffle_flashcard_payload(
            flashcard_id=r.id,
            child_id=child.id,
            subject_code=subject_code,
            difficulty_code=difficulty_code,
            question=r.question,
            choices=choices,
            explanations=explanations,
            correct_index=correct_index,
            deterministic_per_day=False,
        )

        out.append(
            {
                "id": r.id,
                "subjectId": r.subject_id,
                "question": r.question,
                "choices": shuffled_choices,
                "correctIndex": shuffled_ci,
                "explanations": shuffled_expl,
                "difficultyCode": r.difficulty_code,
                "tags": list(r.tags or []),
                "ageRangeId": r.age_range_id,
            }
        )

    return out


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
        rows = (
            (await session.execute(select(DifficultyThreshold).where(DifficultyThreshold.is_active == True)))
            .scalars()
            .all()
        )
        return rows
    except Exception as e:
        logger.exception("list_difficulties error: %s", e)
        return []
