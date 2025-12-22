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
)

router = APIRouter(prefix="/v1", tags=["mybuddy-progress"])

def _achievement_catalog() -> dict[str, rules.AchievementDef]:
    return {a.id: a for a in rules.ACHIEVEMENTS}

async def _build_dashboard(session: AsyncSession, child: Child) -> DashboardOut:
    totals = await compute_totals(session, child_id=child.id)
    today = await compute_today_stats(session, child_id=child.id)
    week = await compute_week_stats(session, child_id=child.id)
    by_subject = await compute_flashcards_by_subject(session, child_id=child.id)
    streaks = await compute_streaks(session, child_id=child.id)

    core_subjects = list(rules.SUBJECTS)
    subject_correct = {s: by_subject.get(s, {}).get("correct", 0) for s in core_subjects}
    subject_difficulty = {s: by_subject.get(s, {}).get("difficulty", "easy") for s in core_subjects}

    balanced = rules.compute_balanced_progress(subject_correct, subjects=core_subjects)
    reward = rules.reward_for_level(balanced["currentLevel"], subject_correct, subjects=core_subjects)

    unlocked_map = await get_unlocked_achievements_map(session, child_id=child.id)
    catalog = _achievement_catalog()

    unlocked = []
    locked = []
    for a in rules.ACHIEVEMENTS:
        unlocked_at = unlocked_map.get(a.id)
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
    totals = await compute_totals(session, child_id=child.id)
    today = await compute_today_stats(session, child_id=child.id)
    by_subject = await compute_flashcards_by_subject(session, child_id=child.id)
    streaks = await compute_streaks(session, child_id=child.id)

    core_subjects = list(rules.SUBJECTS)
    subject_correct = {s: by_subject.get(s, {}).get("correct", 0) for s in core_subjects}
    subject_difficulty = {s: by_subject.get(s, {}).get("difficulty", "easy") for s in core_subjects}

    unlockable = rules.evaluate_achievement_conditions(
        total_points=totals["totalPoints"],
        current_streak=streaks["currentStreak"],
        total_flashcards=totals["totalFlashcardsCompleted"],
        total_chores=totals["totalChoresCompleted"],
        total_outdoor=totals["totalOutdoorActivities"],
        today_has_flashcards=today["hasFlashcards"],
        today_has_chores=today["hasChores"],
        today_has_outdoor=today["hasOutdoor"],
        subject_difficulty=subject_difficulty,
        subject_correct=subject_correct,
    )
    new_ids = await unlock_achievements(session, child_id=child.id, achievement_ids=unlockable)
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
    points = rules.POINTS["flashcard_correct"] if payload.correct else rules.POINTS["flashcard_wrong"]
    await insert_event(
        session,
        child_id=child.id,
        kind="flashcard_answered",
        meta={
            "subjectId": payload.subjectId,
            "correct": payload.correct,
            "flashcardId": payload.flashcardId,
            "answer": payload.answer,
            "points": points,
        },
    )

    new_ids = await _unlock_from_current_state(session, child)
    await session.commit()
    return EventAckOut(pointsAwarded=points, newAchievementIds=new_ids)

@router.post("/children/{child_id}/events/chore", response_model=EventAckOut)
async def chore_completed(
    payload: ChoreCompletedIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    points = rules.POINTS["chore_completed"]
    await insert_event(
        session,
        child_id=child.id,
        kind="chore_completed",
        meta={"choreId": payload.choreId, "isExtra": payload.isExtra, "points": points},
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
    points = rules.POINTS["outdoor_completed"]
    await insert_event(
        session,
        child_id=child.id,
        kind="outdoor_completed",
        meta={"outdoorActivityId": payload.outdoorActivityId, "isDaily": payload.isDaily, "points": points},
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
    points = rules.POINTS["affirmation_viewed"]
    await insert_event(
        session,
        child_id=child.id,
        kind="affirmation_viewed",
        meta={"affirmationId": payload.affirmationId, "points": points},
    )

    new_ids = await _unlock_from_current_state(session, child)
    await session.commit()
    return EventAckOut(pointsAwarded=points, newAchievementIds=new_ids)
