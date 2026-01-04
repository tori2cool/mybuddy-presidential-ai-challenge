# app/routers/progress.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_child_owned_path
from ..models import Child
from ..schemas.progress import (
    FlashcardAnsweredIn,
    ChoreCompletedIn,
    OutdoorCompletedIn,
    AffirmationViewedIn,
    EventAckOut,
)
from ..schemas.dashboard import DashboardOut, AchievementOut
from ..models import AchievementDefinition, ChildFlashcardPerformance, ChildSubjectStreak
from ..services import progress_rules as rules
from ..services.progress_queries import (
    insert_event,
    compute_today_stats,
    compute_week_stats,
    compute_flashcards_by_subject,
    compute_totals,
    compute_streaks,
    unlock_achievements,
    get_unlocked_achievements_map,
    list_subject_ids,
)

router = APIRouter(prefix="/v1", tags=["mybuddy-progress"])

async def _achievement_catalog(session: AsyncSession) -> dict[str, AchievementDefinition]:
    from sqlalchemy import select
    result = await session.execute(select(AchievementDefinition))
    return {a.id: a for a in result.scalars().all()}

async def _build_dashboard(session: AsyncSession, child: Child) -> DashboardOut:
    totals = await compute_totals(session, child_id=child.id)
    today = await compute_today_stats(session, child_id=child.id)
    week = await compute_week_stats(session, child_id=child.id)
    by_subject = await compute_flashcards_by_subject(session, child_id=child.id)
    streaks = await compute_streaks(session, child_id=child.id)

    # Fetch database-driven config
    core_subjects = await list_subject_ids(session)
    level_thresholds = await rules.fetch_level_thresholds(session)
    level_metadata = await rules.fetch_level_metadata(session)
    points_values = await rules.fetch_points_values(session)

    subject_correct = {s: by_subject.get(s, {}).get("correct", 0) for s in core_subjects}
    subject_difficulty = {s: by_subject.get(s, {}).get("difficulty", "easy") for s in core_subjects}

    balanced = rules.compute_balanced_progress(
        subject_correct=subject_correct,
        subjects=core_subjects,
        level_thresholds=level_thresholds,
    )
    reward = rules.reward_for_level(
        current_level=balanced["currentLevel"],
        subject_correct=subject_correct,
        subjects=core_subjects,
        level_thresholds=level_thresholds,
        level_metadata=level_metadata,
    )

    unlocked_map = await get_unlocked_achievements_map(session, child_id=child.id)
    catalog = await _achievement_catalog(session)

    unlocked = []
    locked = []
    for a_id, a in catalog.items():
        unlocked_at = unlocked_map.get(a_id)
        if unlocked_at is not None:
            unlocked.append(
                AchievementOut(
                    id=a.id,
                    title=a.title,
                    description=a.description,
                    icon=a.icon,
                    type=a.type,
                    unlockedAt=unlocked_at,
                )
            )
        else:
            locked.append(
                AchievementOut(
                    id=a.id,
                    title=a.title,
                    description=a.description,
                    icon=a.icon,
                    type=a.type,
                    unlockedAt=None,
                )
            )

    return DashboardOut(
        totalPoints=totals["totalPoints"],
        currentStreak=streaks["currentStreak"],
        longestStreak=streaks["longestStreak"],
        lastActiveDate=streaks["lastActiveDate"],
        today={
            "date": today["date"],
            "flashcardsCompleted": today["flashcardsCompleted"],
            "flashcardsCorrect": today["flashcardsCorrect"],
            "choresCompleted": today["choresCompleted"],
            "outdoorActivities": today["outdoorActivities"],
            "affirmationsViewed": today["affirmationsViewed"],
            "totalPoints": today["totalPoints"],
        },
        week=week,
        flashcardsBySubject=by_subject,
        totalChoresCompleted=totals["totalChoresCompleted"],
        totalOutdoorActivities=totals["totalOutdoorActivities"],
        totalAffirmationsViewed=totals["totalAffirmationsViewed"],
        achievementsUnlocked=unlocked,
        achievementsLocked=locked,
        balanced=balanced,
        reward=reward,
    )

async def _unlock_from_current_state(session: AsyncSession, child: Child) -> list[str]:
    """Unlock achievements based on current state."""
    from sqlalchemy import select

    totals = await compute_totals(session, child_id=child.id)
    today = await compute_today_stats(session, child_id=child.id)
    by_subject = await compute_flashcards_by_subject(session, child_id=child.id)
    streaks = await compute_streaks(session, child_id=child.id)

    # Fetch database-driven config
    core_subjects = await list_subject_ids(session)
    level_thresholds = await rules.fetch_level_thresholds(session)
    points_values = await rules.fetch_points_values(session)

    subject_correct = {s: by_subject.get(s, {}).get("correct", 0) for s in core_subjects}
    subject_difficulty = {s: by_subject.get(s, {}).get("difficulty", "easy") for s in core_subjects}

    # Calculate totals for achievement checks
    total_flashcards = totals.get("totalFlashcardsCompleted", 0)
    total_chores = totals.get("totalChoresCompleted", 0)
    total_outdoor = totals.get("totalOutdoorActivities", 0)

    # Check for unlockable achievements
    unlockable_ids = []
    
    # Points-based achievements
    for achievement_id, threshold in [(a.id, a.points_threshold) for a in (await session.execute(select(AchievementDefinition).where(AchievementDefinition.points_threshold.is_not(None)))).scalars().all()]:
        if threshold and totals["totalPoints"] >= threshold:
            unlockable_ids.append(achievement_id)
    
    # Streak-based achievements
    for achievement_id, threshold in [(a.id, a.streak_days_threshold) for a in (await session.execute(select(AchievementDefinition).where(AchievementDefinition.streak_days_threshold.is_not(None)))).scalars().all()]:
        if threshold and streaks["currentStreak"] >= threshold:
            unlockable_ids.append(achievement_id)
    
    # First flashcard
    if total_flashcards >= 1 and "first_flashcard" not in unlockable_ids:
        unlockable_ids.append("first_flashcard")
    
    # First chore
    if total_chores >= 1 and "first_chore" not in unlockable_ids:
        unlockable_ids.append("first_chore")
    
    # First outdoor
    if total_outdoor >= 1 and "first_outdoor" not in unlockable_ids:
        unlockable_ids.append("first_outdoor")
    
    # Flashcard counts
    if total_flashcards >= 10 and "flashcards_10" not in unlockable_ids:
        unlockable_ids.append("flashcards_10")
    if total_flashcards >= 50 and "flashcards_50" not in unlockable_ids:
        unlockable_ids.append("flashcards_50")
    
    # Chore counts
    if total_chores >= 7 and "chores_7" not in unlockable_ids:
        unlockable_ids.append("chores_7")
    
    # Outdoor counts
    if total_outdoor >= 5 and "outdoor_5" not in unlockable_ids:
        unlockable_ids.append("outdoor_5")
    
    # Subject difficulty achievements
    if subject_difficulty.get("math") in ("medium", "hard") and "medium_math" not in unlockable_ids:
        unlockable_ids.append("medium_math")
    if subject_difficulty.get("science") in ("medium", "hard") and "medium_science" not in unlockable_ids:
        unlockable_ids.append("medium_science")
    if subject_difficulty.get("reading") in ("medium", "hard") and "medium_reading" not in unlockable_ids:
        unlockable_ids.append("medium_reading")
    if subject_difficulty.get("history") in ("medium", "hard") and "medium_history" not in unlockable_ids:
        unlockable_ids.append("medium_history")
    
    # Hard difficulty
    if any(diff == "hard" for diff in subject_difficulty.values()) and "hard_unlocked" not in unlockable_ids:
        unlockable_ids.append("hard_unlocked")
    
    # Balanced learner
    if all(subject_correct.get(s, 0) >= 10 for s in core_subjects) and "balanced_learner" not in unlockable_ids:
        unlockable_ids.append("balanced_learner")
    
    # Perfect day
    if today["hasFlashcards"] and today["hasChores"] and today["hasOutdoor"] and "perfect_day" not in unlockable_ids:
        unlockable_ids.append("perfect_day")
    
    new_ids = await unlock_achievements(session, child_id=child.id, achievement_ids=unlockable_ids)
    return new_ids

@router.get("/children/{child_id}/dashboard", response_model=DashboardOut)
async def get_dashboard(
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    return await _build_dashboard(session, child)

@router.post("/children/{child_id}/events/flashcard", response_model=EventAckOut)
async def flashcard_answered(
    payload: FlashcardAnsweredIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    from sqlalchemy import select
    from datetime import datetime, timezone

    points_values = await rules.fetch_points_values(session)
    points = points_values["flashcard_correct"] if payload.correct else points_values["flashcard_wrong"]
    await insert_event(
        session,
        child_id=child.id,
        kind="flashcard_answered",
        meta={
            "dedupeKey": f"flashcard:{payload.flashcardId}",
            "subjectId": payload.subjectId,
            "correct": payload.correct,
            "flashcardId": payload.flashcardId,
            "answer": payload.answer,
            "points": points,
        },
    )

    # Update subject streaks
    streak_stmt = select(ChildSubjectStreak).where(
        ChildSubjectStreak.child_id == child.id,
        ChildSubjectStreak.subject_id == payload.subjectId,
    )
    streak = (await session.execute(streak_stmt)).scalar_one_or_none()

    if streak is None:
        streak = ChildSubjectStreak(
            child_id=child.id,
            subject_id=payload.subjectId,
            current_streak=1 if payload.correct else 0,
            longest_streak=1 if payload.correct else 0,
        )
        session.add(streak)
    else:
        if payload.correct:
            streak.current_streak += 1
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
            streak.last_updated = datetime.now(timezone.utc)
        else:
            streak.current_streak = 0
            streak.last_updated = datetime.now(timezone.utc)

    # Update performance tracking
    perf_stmt = select(ChildFlashcardPerformance).where(
        ChildFlashcardPerformance.child_id == child.id,
        ChildFlashcardPerformance.flashcard_id == payload.flashcardId,
    )
    perf = (await session.execute(perf_stmt)).scalar_one_or_none()

    if perf is None:
        perf = ChildFlashcardPerformance(
            child_id=child.id,
            flashcard_id=payload.flashcardId,
            correct_count=1 if payload.correct else 0,
            incorrect_count=0 if payload.correct else 1,
        )
        session.add(perf)
    else:
        if payload.correct:
            perf.correct_count += 1
        else:
            perf.incorrect_count += 1
        perf.last_seen_at = datetime.now(timezone.utc)

    new_ids = await _unlock_from_current_state(session, child)
    await session.commit()
    return EventAckOut(pointsAwarded=points, newAchievementIds=new_ids)

@router.post("/children/{child_id}/events/chore", response_model=EventAckOut)
async def chore_completed(
    payload: ChoreCompletedIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    points_values = await rules.fetch_points_values(session)
    points = points_values["chore_completed"]
    await insert_event(
        session,
        child_id=child.id,
        kind="chore_completed",
        meta={
            "dedupeKey": f"chore:{payload.choreId}",
            "choreId": payload.choreId,
            "isExtra": payload.isExtra,
            "points": points,
        },
    )

    new_ids = await _unlock_from_current_state(session, child)
    await session.commit()
    return EventAckOut(pointsAwarded=points, newAchievementIds=new_ids)

@router.post("/children/{child_id}/events/outdoor", response_model=EventAckOut)
async def outdoor_completed(
    payload: OutdoorCompletedIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    points_values = await rules.fetch_points_values(session)
    points = points_values["outdoor_completed"]
    await insert_event(
        session,
        child_id=child.id,
        kind="outdoor_completed",
        meta={
            "dedupeKey": f"outdoor:{payload.outdoorActivityId}",
            "outdoorActivityId": payload.outdoorActivityId,
            "isDaily": payload.isDaily,
            "points": points,
        },
    )

    new_ids = await _unlock_from_current_state(session, child)
    await session.commit()
    return EventAckOut(pointsAwarded=points, newAchievementIds=new_ids)

@router.post("/children/{child_id}/events/affirmation", response_model=EventAckOut)
async def affirmation_viewed(
    payload: AffirmationViewedIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    points_values = await rules.fetch_points_values(session)
    points = points_values["affirmation_viewed"]
    await insert_event(
        session,
        child_id=child.id,
        kind="affirmation_viewed",
        meta={
            "dedupeKey": f"affirmation:{payload.affirmationId}",
            "affirmationId": payload.affirmationId,
            "points": points,
        },
    )

    new_ids = await _unlock_from_current_state(session, child)
    await session.commit()
    return EventAckOut(pointsAwarded=points, newAchievementIds=new_ids)
