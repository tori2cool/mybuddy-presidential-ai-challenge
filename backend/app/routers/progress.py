# app/routers/progress.py
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..deps import get_child_owned_path
from ..models import (
    AchievementDefinition,
    Child,
    ChildBalancedProgressCounter,
    ChildFlashcardPerformance,
    ChildProgress,
    ChildSubjectStreak,
    ChildSubjectDifficulty,
    Flashcard,
    Subject,
)
from ..schemas.dashboard import AchievementOut, DashboardOut
from ..schemas.progress import (
    AffirmationViewedIn,
    ChoreCompletedIn,
    EventAckOut,
    FlashcardAnsweredIn,
    OutdoorCompletedIn,
)
from ..services import progress_rules as rules
from ..services.content_expansion_queue import (
    create_content_expansion_request,
    enqueue_content_expansion_request_after_commit,
)
from ..services.progress_queries import (
    compute_flashcards_by_subject,
    compute_streaks,
    compute_today_stats,
    compute_totals,
    compute_today_completed_ids,
    compute_week_stats,
    get_unlocked_achievements_map,
    insert_event,
    list_subject_codes,
    unlock_achievements,
)
import logging
logger = logging.getLogger("mybuddy.api")
router = APIRouter(prefix="/v1", tags=["mybuddy-progress"])


async def _apply_subject_streak_and_tier_progression(
    session: AsyncSession,
    *,
    child_id: UUID,
    subject_id: UUID,
    correct: bool,
    thresholds: dict[str, int],
    age_range_id: UUID | None,
) -> UUID | None:
    """Update per-subject tier streak + persisted difficulty tier.

    Used for BOTH inserted and deduped flashcard answers.

    Rules:
    - Update ChildSubjectStreak.current_streak / longest_streak based on `correct`
    - Ensure ChildSubjectDifficulty exists (default easy)
    - If correct and tier streak >= required (next.threshold):
      advance difficulty_code and reset tier streak to 0
    """

    difficulty_row = (
        await session.execute(
            select(ChildSubjectDifficulty).where(
                ChildSubjectDifficulty.child_id == child_id,
                ChildSubjectDifficulty.subject_id == subject_id,
            )
        )
    ).scalar_one_or_none()

    if difficulty_row is None:
        # Default difficulty should be the first active tier by ascending threshold
        # (typically the tier with threshold==0).
        default_code = min(thresholds.items(), key=lambda kv: kv[1])[0] if thresholds else "easy"

        difficulty_row = ChildSubjectDifficulty(
            child_id=child_id,
            subject_id=subject_id,
            difficulty_code=default_code,
            last_updated=datetime.now(timezone.utc),
        )
        session.add(difficulty_row)

    streak = (
        await session.execute(
            select(ChildSubjectStreak).where(
                ChildSubjectStreak.child_id == child_id,
                ChildSubjectStreak.subject_id == subject_id,
            )
        )
    ).scalar_one_or_none()

    if streak is None:
        streak = ChildSubjectStreak(
            child_id=child_id,
            subject_id=subject_id,
            current_streak=1 if correct else 0,
            longest_streak=1 if correct else 0,
        )
        session.add(streak)
    else:
        if correct:
            streak.current_streak += 1
            if streak.current_streak > streak.longest_streak:
                streak.longest_streak = streak.current_streak
        else:
            streak.current_streak = 0
        streak.last_updated = datetime.now(timezone.utc)

    current_code, next_code, _current_threshold, required = rules.difficulty_tier_progress(
        thresholds=thresholds,
        current_code=difficulty_row.difficulty_code,
    )
    difficulty_row.difficulty_code = current_code

    tier_up_request_id: UUID | None = None

    if correct and next_code is not None and required is not None:
        if required == 0 or streak.current_streak >= required:
            promoted_to = next_code
            difficulty_row.difficulty_code = promoted_to
            difficulty_row.last_updated = datetime.now(timezone.utc)

            streak.current_streak = 0
            streak.last_updated = datetime.now(timezone.utc)

            # IMPORTANT: do not enqueue here; caller controls commit timing.
            # The worker can load interests via req.child_id; only include subject that tiered up.
            if age_range_id is None:
                logger.warning(
                    "tier_up: missing age_range_id; skipping tier-up content expansion request (child_id=%s subject_id=%s)",
                    str(child_id),
                    str(subject_id),
                )
            else:
                create_res = await create_content_expansion_request(
                    session,
                    child_id=child_id,
                    subject_id=subject_id,
                    age_range_id=age_range_id,
                    difficulty_code=promoted_to,
                    trigger="tier_up",
                )
                if create_res.created:
                    tier_up_request_id = create_res.request.id

    return tier_up_request_id


async def _achievement_catalog(session: AsyncSession) -> dict[str, AchievementDefinition]:
    """
    Map AchievementDefinition.code -> row.
    """
    result = await session.execute(select(AchievementDefinition))
    rows = result.scalars().all()
    return {a.code: a for a in rows}


async def _build_dashboard(session: AsyncSession, child: Child) -> DashboardOut:
    logger.info("build_dashboard: start child_id=%s", str(child.id))

    totals = await compute_totals(session, child_id=child.id)
    today = await compute_today_stats(session, child_id=child.id)
    week = await compute_week_stats(session, child_id=child.id)
    today_completed_ids = await compute_today_completed_ids(session, child_id=child.id)

    core_subjects = await list_subject_codes(session, child_id=child.id)
    by_subject = await compute_flashcards_by_subject(session, child_id=child.id, subject_codes=core_subjects)

    # Compact log for difficulty progression fields driving FlashcardsScreen
    by_subject_compact = {
        code: {
            "difficultyCode": (data or {}).get("difficultyCode"),
            "nextDifficultyAtStreak": (data or {}).get("nextDifficultyAtStreak"),
            "correctStreak": (data or {}).get("correctStreak"),
            "longestStreak": (data or {}).get("longestStreak"),
        }
        for code, data in (by_subject or {}).items()
    }
    logger.info("dashboard_flashcards_by_subject: child_id=%s by_subject=%s", str(child.id), by_subject_compact)

    streaks = await compute_streaks(session, child_id=child.id)
    level_thresholds, level_metadata = await rules.fetch_levels(session)

    logger.info(
        "build_dashboard: loaded child_id=%s core_subjects=%s by_subject_keys=%s totalPoints=%s",
        str(child.id),
        list(core_subjects) if core_subjects else [],
        list(by_subject.keys()) if isinstance(by_subject, dict) else [],
        totals.get("totalPoints"),
    )

    # Balanced progress is now computed from per-level counters (not lifetime totals).
    # Balanced progress is computed from per-level counters (not lifetime totals).
    # Important: a brand-new child may have *no* counter rows yet; treat missing as 0.
    counter_rows = (
        await session.execute(
            select(ChildBalancedProgressCounter).where(ChildBalancedProgressCounter.child_id == child.id)
        )
    ).scalars().all()

    subject_correct: dict[str, int] = {s: 0 for s in (core_subjects or [])}
    for r in counter_rows:
        # Only overlay known core subjects; ignore stray/legacy subject_code rows.
        if r.subject_code in subject_correct:
            subject_correct[r.subject_code] = int(r.correct_count or 0)

    progress_row = (
        await session.execute(select(ChildProgress).where(ChildProgress.child_id == child.id))
    ).scalar_one_or_none()

    balanced = rules.compute_balanced_progress(
        subject_correct=subject_correct,
        subjects=core_subjects,
        level_thresholds=level_thresholds,
        current_level=(progress_row.current_level if progress_row is not None else None),
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

    unlocked: list[AchievementOut] = []
    locked: list[AchievementOut] = []

    for code, a in catalog.items():
        unlocked_at = unlocked_map.get(code)
        row = AchievementOut(
            id=a.id,
            code=a.code,
            title=a.title,
            description=a.description,
            icon=a.icon,
            type=a.achievement_type,
            unlockedAt=unlocked_at,
        )
        if unlocked_at is not None:
            unlocked.append(row)
        else:
            locked.append(row)

    logger.info(
        "build_dashboard: end child_id=%s unlocked=%s locked=%s",
        str(child.id),
        len(unlocked),
        len(locked),
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
        todayCompletedChoreIds=today_completed_ids["todayCompletedChoreIds"],
        todayCompletedOutdoorActivityIds=today_completed_ids["todayCompletedOutdoorActivityIds"],
        achievementsUnlocked=unlocked,
        achievementsLocked=locked,
        balanced=balanced,
        reward=reward,
    )


async def _unlock_from_current_state(
    session: AsyncSession,
    child: Child,
    *,
    core_subjects: list[str] | None = None,
) -> list[str]:
    """
    Unlock achievements based on current state.
    Returns list of achievement *codes*.
    """
    totals = await compute_totals(session, child_id=child.id)
    today = await compute_today_stats(session, child_id=child.id)

    if core_subjects is None:
        core_subjects = await list_subject_codes(session, child_id=child.id)
    by_subject = await compute_flashcards_by_subject(session, child_id=child.id, subject_codes=core_subjects)

    # Compact log for difficulty progression fields driving FlashcardsScreen
    by_subject_compact = {
        code: {
            "difficultyCode": (data or {}).get("difficultyCode"),
            "nextDifficultyAtStreak": (data or {}).get("nextDifficultyAtStreak"),
            "correctStreak": (data or {}).get("correctStreak"),
            "longestStreak": (data or {}).get("longestStreak"),
        }
        for code, data in (by_subject or {}).items()
    }
    logger.info("dashboard_flashcards_by_subject: child_id=%s by_subject=%s", str(child.id), by_subject_compact)

    streaks = await compute_streaks(session, child_id=child.id)

    subject_correct = {s: by_subject.get(s, {}).get("correct", 0) for s in core_subjects}
    subject_difficulty = {s: by_subject.get(s, {}).get("difficultyCode") for s in core_subjects}

    total_flashcards = totals.get("totalFlashcardsCompleted", 0)
    total_chores = totals.get("totalChoresCompleted", 0)
    total_outdoor = totals.get("totalOutdoorActivities", 0)
    unlockable_codes: list[str] = []

    # Fetch all achievements once and evaluate thresholds in Python
    achievements = (await session.execute(select(AchievementDefinition))).scalars().all()
    for ach in achievements:
        if ach.points_threshold is not None and totals["totalPoints"] >= ach.points_threshold:
            unlockable_codes.append(ach.code)

        if ach.streak_days_threshold is not None and streaks["currentStreak"] >= ach.streak_days_threshold:
            unlockable_codes.append(ach.code)

        if ach.flashcards_count_threshold is not None and total_flashcards >= ach.flashcards_count_threshold:
            unlockable_codes.append(ach.code)

        if ach.chores_count_threshold is not None and total_chores >= ach.chores_count_threshold:
            unlockable_codes.append(ach.code)

        if ach.outdoor_count_threshold is not None and total_outdoor >= ach.outdoor_count_threshold:
            unlockable_codes.append(ach.code)

    # Subject difficulty achievements:
    # Assumes keys are subject CODEs ("math", "science"...)
    if subject_difficulty.get("math") in ("medium", "hard"):
        unlockable_codes.append("math-whiz")
    if subject_difficulty.get("science") in ("medium", "hard"):
        unlockable_codes.append("science-star")
    if subject_difficulty.get("reading") in ("medium", "hard"):
        unlockable_codes.append("bookworm")
    if subject_difficulty.get("history") in ("medium", "hard"):
        unlockable_codes.append("history-buff")

    if any(diff == "hard" for diff in subject_difficulty.values() if diff is not None):
        unlockable_codes.append("master-student")

    if core_subjects and all(subject_correct.get(s, 0) >= 10 for s in core_subjects):
        unlockable_codes.append("balanced-learner")

    if today.get("hasFlashcards") and today.get("hasChores") and today.get("hasOutdoor"):
        unlockable_codes.append("perfect-day")

    # NOTE: unlock_achievements must now treat these as achievement CODES (strings),
    # and insert into ChildAchievement by looking up AchievementDefinition.id.
    # If the function arg is still named achievement_ids, keep it but pass codes.
    new_codes = await unlock_achievements(
        session,
        child_id=child.id,
        achievement_ids=unlockable_codes,  # actually codes
    )
    return new_codes


@router.get("/children/{child_id}/dashboard", response_model=DashboardOut)
async def get_dashboard(
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    return await _build_dashboard(session, child)


async def _balanced_level_required_per_subject(
    session: AsyncSession,
    *,
    child_id: UUID,
    next_level: str,
    core_subjects: list[str],
) -> int:
    level_thresholds, _level_meta = await rules.fetch_levels(session)
    threshold = int(level_thresholds.get(next_level, 0))
    # New semantics: threshold is per-subject (no division by number of subjects).
    return threshold


async def _balanced_next_level(
    session: AsyncSession,
    *,
    current_level: str,
) -> str | None:
    level_thresholds, _level_meta = await rules.fetch_levels(session)
    levels_asc = sorted(level_thresholds.items(), key=lambda kv: kv[1])
    for i, (name, _t) in enumerate(levels_asc):
        if name == current_level and i < len(levels_asc) - 1:
            return levels_asc[i + 1][0]
    return None


@router.post("/children/{child_id}/events/flashcard", response_model=EventAckOut)
async def flashcard_answered(
    payload: FlashcardAnsweredIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    child_id_str = str(child.id)
    flashcard_id_str = str(payload.flashcardId)
    logger.info(
        "event_flashcard: start child_id=%s flashcardId=%s correct=%s",
        child_id_str,
        flashcard_id_str,
        payload.correct,
    )

    try:
        points_values = await rules.fetch_points_values(session)
        points = points_values["flashcard_correct"] if payload.correct else points_values["flashcard_wrong"]

        # Validate flashcard exists (UUID PK)
        flashcard = (
            await session.execute(select(Flashcard).where(Flashcard.id == payload.flashcardId))
        ).scalar_one_or_none()
        if flashcard is None:
            logger.warning(
                "event_flashcard: invalid flashcardId=%s child_id=%s",
                flashcard_id_str,
                child_id_str,
            )
            raise HTTPException(status_code=400, detail="Invalid flashcardId.")

        # Derive subject from flashcard.subject_id
        subject_id: UUID = flashcard.subject_id
        logger.info(
            "event_flashcard: validated child_id=%s flashcardId=%s subject_id=%s points=%s",
            child_id_str,
            flashcard_id_str,
            str(subject_id),
            points,
        )

        subject_id_str = str(subject_id)

        # Derive Subject.code (stable) for balanced counter updates
        subject = (
            await session.execute(select(Subject).where(Subject.id == subject_id))
        ).scalar_one_or_none()
        if subject is None:
            logger.warning(
                "event_flashcard: missing subject row subject_id=%s child_id=%s",
                subject_id_str,
                child_id_str,
            )
            raise HTTPException(status_code=400, detail="Invalid subject.")
        subject_code = subject.code

        # Insert append-only event (idempotent per day+dedupeKey)
        insert_res = await insert_event(
            session,
            child_id=child.id,
            kind="flashcard",
            meta={
                "dedupeKey": f"flashcard:{payload.flashcardId}",
                "flashcardId": flashcard_id_str,
                "subjectId": subject_id_str,
                "correct": payload.correct,
                "answer": payload.answer,
                "points": points,
            },
        )

        if insert_res.deduped:
            # Dedupe repeat: award 0 points, but STILL update tier streak + difficulty
            # (product decision: repeats in same UTC day count toward tier streak).
            # Also update flashcard performance and attempt content expansion.
            logger.info(
                "event_flashcard: deduped child_id=%s flashcardId=%s (award_points=0, update_perf=1, update_streak=1)",
                child_id_str,
                flashcard_id_str,
            )

            thresholds = await rules.fetch_difficulty_thresholds(session)
            tier_up_request_id = await _apply_subject_streak_and_tier_progression(
                session,
                child_id=child.id,
                subject_id=subject_id,
                correct=payload.correct,
                thresholds=thresholds,
                age_range_id=flashcard.age_range_id,
            )

            # Balanced progress counters: repeats (deduped events) still count toward per-level progress.
            if payload.correct:
                counter = (
                    await session.execute(
                        select(ChildBalancedProgressCounter).where(
                            ChildBalancedProgressCounter.child_id == child.id,
                            ChildBalancedProgressCounter.subject_code == subject_code,
                        )
                    )
                ).scalar_one_or_none()
                if counter is None:
                    counter = ChildBalancedProgressCounter(
                        child_id=child.id,
                        subject_code=subject_code,
                        correct_count=1,
                        updated_at=datetime.now(timezone.utc),
                    )
                    session.add(counter)
                else:
                    counter.correct_count = int(counter.correct_count or 0) + 1
                    counter.updated_at = datetime.now(timezone.utc)

            # Update performance tracking (same behavior as non-deduped)
            perf = (
                await session.execute(
                    select(ChildFlashcardPerformance).where(
                        ChildFlashcardPerformance.child_id == child.id,
                        ChildFlashcardPerformance.flashcard_id == payload.flashcardId,
                    )
                )
            ).scalar_one_or_none()

            if perf is None:
                logger.info(
                    "event_flashcard: dedupe_create_perf child_id=%s flashcardId=%s correct=%s",
                    child_id_str,
                    flashcard_id_str,
                    payload.correct,
                )
                perf = ChildFlashcardPerformance(
                    child_id=child.id,
                    flashcard_id=payload.flashcardId,
                    correct_count=1 if payload.correct else 0,
                    incorrect_count=0 if payload.correct else 1,
                    last_seen_at=datetime.now(timezone.utc),
                )
                session.add(perf)
            else:
                prev_c = perf.correct_count
                prev_i = perf.incorrect_count

                if payload.correct:
                    perf.correct_count += 1
                else:
                    perf.incorrect_count += 1
                perf.last_seen_at = datetime.now(timezone.utc)

                logger.info(
                    "event_flashcard: dedupe_update_perf child_id=%s flashcardId=%s correct %s->%s incorrect %s->%s",
                    child_id_str,
                    flashcard_id_str,
                    prev_c,
                    perf.correct_count,
                    prev_i,
                    perf.incorrect_count,
                )

            create_res = await create_content_expansion_request(
                session,
                child_id=child.id,
                subject_id=subject_id,
                age_range_id=flashcard.age_range_id,
                difficulty_code=flashcard.difficulty_code,
                trigger="dedupe_repeat",
            )

            # Evaluate balanced level-up (same transaction)
            core_subjects = await list_subject_codes(session, child_id=child.id)
            progress_row = (
                await session.execute(select(ChildProgress).where(ChildProgress.child_id == child.id))
            ).scalar_one_or_none()
            if progress_row is None:
                progress_row = ChildProgress(child_id=child.id)
                session.add(progress_row)

            next_level = await _balanced_next_level(session, current_level=progress_row.current_level)
            if next_level is not None and core_subjects:
                required_per_subject = await _balanced_level_required_per_subject(
                    session,
                    child_id=child.id,
                    next_level=next_level,
                    core_subjects=core_subjects,
                )

                rows = (
                    await session.execute(
                        select(ChildBalancedProgressCounter).where(
                            ChildBalancedProgressCounter.child_id == child.id,
                            ChildBalancedProgressCounter.subject_code.in_(core_subjects),
                        )
                    )
                ).scalars().all()
                counter_map = {r.subject_code: int(r.correct_count or 0) for r in rows}

                if all(counter_map.get(code, 0) >= required_per_subject for code in core_subjects):
                    progress_row.current_level = next_level
                    # Reset counters for core subjects
                    for code in core_subjects:
                        row = next((r for r in rows if r.subject_code == code), None)
                        if row is None:
                            session.add(
                                ChildBalancedProgressCounter(
                                    child_id=child.id,
                                    subject_code=code,
                                    correct_count=0,
                                    updated_at=datetime.now(timezone.utc),
                                )
                            )
                        else:
                            row.correct_count = 0
                            row.updated_at = datetime.now(timezone.utc)

            await session.commit()

            if create_res.created:
                enqueue_content_expansion_request_after_commit(create_res.request.id)
            if tier_up_request_id is not None:
                enqueue_content_expansion_request_after_commit(tier_up_request_id)

            return EventAckOut(pointsAwarded=0, newAchievementCodes=[])

        logger.info("event_flashcard: inserted_event child_id=%s", child_id_str)

        thresholds = await rules.fetch_difficulty_thresholds(session)
        tier_up_request_id = await _apply_subject_streak_and_tier_progression(
            session,
            child_id=child.id,
            subject_id=subject_id,
            correct=payload.correct,
            thresholds=thresholds,
            age_range_id=flashcard.age_range_id,
        )

        # Balanced progress counters: increment per-level counter for this subject on correct
        if payload.correct:
            counter = (
                await session.execute(
                    select(ChildBalancedProgressCounter).where(
                        ChildBalancedProgressCounter.child_id == child.id,
                        ChildBalancedProgressCounter.subject_code == subject_code,
                    )
                )
            ).scalar_one_or_none()
            if counter is None:
                counter = ChildBalancedProgressCounter(
                    child_id=child.id,
                    subject_code=subject_code,
                    correct_count=1,
                    updated_at=datetime.now(timezone.utc),
                )
                session.add(counter)
            else:
                counter.correct_count = int(counter.correct_count or 0) + 1
                counter.updated_at = datetime.now(timezone.utc)

        # Update performance tracking (FKs are UUID)
        perf = (
            await session.execute(
                select(ChildFlashcardPerformance).where(
                    ChildFlashcardPerformance.child_id == child.id,
                    ChildFlashcardPerformance.flashcard_id == payload.flashcardId,
                )
            )
        ).scalar_one_or_none()

        if perf is None:
            logger.info(
                "event_flashcard: create_perf child_id=%s flashcardId=%s correct=%s",
                child_id_str,
                flashcard_id_str,
                payload.correct,
            )
            perf = ChildFlashcardPerformance(
                child_id=child.id,
                flashcard_id=payload.flashcardId,
                correct_count=1 if payload.correct else 0,
                incorrect_count=0 if payload.correct else 1,
                last_seen_at=datetime.now(timezone.utc),
            )
            session.add(perf)
        else:
            prev_c = perf.correct_count
            prev_i = perf.incorrect_count

            if payload.correct:
                perf.correct_count += 1
            else:
                perf.incorrect_count += 1
            perf.last_seen_at = datetime.now(timezone.utc)

            logger.info(
                "event_flashcard: update_perf child_id=%s flashcardId=%s correct %s->%s incorrect %s->%s",
                child_id_str,
                flashcard_id_str,
                prev_c,
                perf.correct_count,
                prev_i,
                perf.incorrect_count,
            )
        core_subjects = await list_subject_codes(session, child_id=child.id)

        # Evaluate balanced level-up (same transaction)
        progress_row = (
            await session.execute(select(ChildProgress).where(ChildProgress.child_id == child.id))
        ).scalar_one_or_none()
        if progress_row is None:
            progress_row = ChildProgress(child_id=child.id)
            session.add(progress_row)

        next_level = await _balanced_next_level(session, current_level=progress_row.current_level)
        if next_level is not None and core_subjects:
            required_per_subject = await _balanced_level_required_per_subject(
                session,
                child_id=child.id,
                next_level=next_level,
                core_subjects=core_subjects,
            )

            rows = (
                await session.execute(
                    select(ChildBalancedProgressCounter).where(
                        ChildBalancedProgressCounter.child_id == child.id,
                        ChildBalancedProgressCounter.subject_code.in_(core_subjects),
                    )
                )
            ).scalars().all()
            counter_map = {r.subject_code: int(r.correct_count or 0) for r in rows}

            if all(counter_map.get(code, 0) >= required_per_subject for code in core_subjects):
                progress_row.current_level = next_level
                # Reset counters for core subjects
                for code in core_subjects:
                    row = next((r for r in rows if r.subject_code == code), None)
                    if row is None:
                        session.add(
                            ChildBalancedProgressCounter(
                                child_id=child.id,
                                subject_code=code,
                                correct_count=0,
                                updated_at=datetime.now(timezone.utc),
                            )
                        )
                    else:
                        row.correct_count = 0
                        row.updated_at = datetime.now(timezone.utc)

        new_codes = await _unlock_from_current_state(session, child, core_subjects=core_subjects)

        logger.info(
            "event_flashcard: commit child_id=%s points=%s newAchievementCodes=%s",
            child_id_str,
            points,
            new_codes,
        )

        await session.commit()

        if tier_up_request_id is not None:
            enqueue_content_expansion_request_after_commit(tier_up_request_id)

        logger.info("event_flashcard: success child_id=%s", child_id_str)
        return EventAckOut(pointsAwarded=points, newAchievementCodes=new_codes)

    except HTTPException:
        # already logged (for invalid flashcardId, etc.)
        raise
    except Exception:
        logger.exception("event_flashcard: failed child_id=%s flashcardId=%s", child_id_str, flashcard_id_str)
        raise


@router.post("/children/{child_id}/events/chore", response_model=EventAckOut)
async def chore_completed(
    payload: ChoreCompletedIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    child_id_str = str(child.id)
    chore_id_str = str(payload.choreId)
    logger.info(
        "event_chore: start child_id=%s choreId=%s isExtra=%s",
        child_id_str,
        chore_id_str,
        payload.isExtra,
    )

    try:
        points_values = await rules.fetch_points_values(session)
        points = points_values["chore_completed"]

        insert_res = await insert_event(
            session,
            child_id=child.id,
            kind="chore",
            meta={
                "dedupeKey": f"chore:{payload.choreId}",
                "choreId": chore_id_str,
                "isExtra": payload.isExtra,
                "points": points,
            },
        )
        if insert_res.deduped:
            logger.info("event_chore: deduped child_id=%s choreId=%s", child_id_str, chore_id_str)
            return EventAckOut(pointsAwarded=0, newAchievementCodes=[])

        core_subjects = await list_subject_codes(session, child_id=child.id)

        # Evaluate balanced level-up (same transaction)
        progress_row = (
            await session.execute(select(ChildProgress).where(ChildProgress.child_id == child.id))
        ).scalar_one_or_none()
        if progress_row is None:
            progress_row = ChildProgress(child_id=child.id)
            session.add(progress_row)

        next_level = await _balanced_next_level(session, current_level=progress_row.current_level)
        if next_level is not None and core_subjects:
            required_per_subject = await _balanced_level_required_per_subject(
                session,
                child_id=child.id,
                next_level=next_level,
                core_subjects=core_subjects,
            )

            rows = (
                await session.execute(
                    select(ChildBalancedProgressCounter).where(
                        ChildBalancedProgressCounter.child_id == child.id,
                        ChildBalancedProgressCounter.subject_code.in_(core_subjects),
                    )
                )
            ).scalars().all()
            counter_map = {r.subject_code: int(r.correct_count or 0) for r in rows}

            if all(counter_map.get(code, 0) >= required_per_subject for code in core_subjects):
                progress_row.current_level = next_level
                # Reset counters for core subjects
                for code in core_subjects:
                    row = next((r for r in rows if r.subject_code == code), None)
                    if row is None:
                        session.add(
                            ChildBalancedProgressCounter(
                                child_id=child.id,
                                subject_code=code,
                                correct_count=0,
                                updated_at=datetime.now(timezone.utc),
                            )
                        )
                    else:
                        row.correct_count = 0
                        row.updated_at = datetime.now(timezone.utc)

        new_codes = await _unlock_from_current_state(session, child, core_subjects=core_subjects)
        logger.info("event_chore: commit child_id=%s points=%s newAchievementCodes=%s", child_id_str, points, new_codes)

        await session.commit()
        logger.info("event_chore: success child_id=%s", child_id_str)
        return EventAckOut(pointsAwarded=points, newAchievementCodes=new_codes)
    except Exception:
        logger.exception("event_chore: failed child_id=%s choreId=%s", child_id_str, chore_id_str)
        raise


@router.post("/children/{child_id}/events/outdoor", response_model=EventAckOut)
async def outdoor_completed(
    payload: OutdoorCompletedIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    child_id_str = str(child.id)
    outdoor_activity_id_str = str(payload.outdoorActivityId)
    logger.info(
        "event_outdoor: start child_id=%s outdoorActivityId=%s isDaily=%s",
        child_id_str,
        outdoor_activity_id_str,
        payload.isDaily,
    )

    try:
        points_values = await rules.fetch_points_values(session)
        points = points_values["outdoor_completed"]

        insert_res = await insert_event(
            session,
            child_id=child.id,
            kind="outdoor",
            meta={
                "dedupeKey": f"outdoor:{payload.outdoorActivityId}",
                "outdoorActivityId": outdoor_activity_id_str,
                "isDaily": payload.isDaily,
                "points": points,
            },
        )
        if insert_res.deduped:
            logger.info("event_outdoor: deduped child_id=%s outdoorActivityId=%s", child_id_str, outdoor_activity_id_str)
            return EventAckOut(pointsAwarded=0, newAchievementCodes=[])

        core_subjects = await list_subject_codes(session, child_id=child.id)

        # Evaluate balanced level-up (same transaction)
        progress_row = (
            await session.execute(select(ChildProgress).where(ChildProgress.child_id == child.id))
        ).scalar_one_or_none()
        if progress_row is None:
            progress_row = ChildProgress(child_id=child.id)
            session.add(progress_row)

        next_level = await _balanced_next_level(session, current_level=progress_row.current_level)
        if next_level is not None and core_subjects:
            required_per_subject = await _balanced_level_required_per_subject(
                session,
                child_id=child.id,
                next_level=next_level,
                core_subjects=core_subjects,
            )

            rows = (
                await session.execute(
                    select(ChildBalancedProgressCounter).where(
                        ChildBalancedProgressCounter.child_id == child.id,
                        ChildBalancedProgressCounter.subject_code.in_(core_subjects),
                    )
                )
            ).scalars().all()
            counter_map = {r.subject_code: int(r.correct_count or 0) for r in rows}

            if all(counter_map.get(code, 0) >= required_per_subject for code in core_subjects):
                progress_row.current_level = next_level
                # Reset counters for core subjects
                for code in core_subjects:
                    row = next((r for r in rows if r.subject_code == code), None)
                    if row is None:
                        session.add(
                            ChildBalancedProgressCounter(
                                child_id=child.id,
                                subject_code=code,
                                correct_count=0,
                                updated_at=datetime.now(timezone.utc),
                            )
                        )
                    else:
                        row.correct_count = 0
                        row.updated_at = datetime.now(timezone.utc)

        new_codes = await _unlock_from_current_state(session, child, core_subjects=core_subjects)
        logger.info("event_outdoor: commit child_id=%s points=%s newAchievementCodes=%s", child_id_str, points, new_codes)

        await session.commit()
        logger.info("event_outdoor: success child_id=%s", child_id_str)
        return EventAckOut(pointsAwarded=points, newAchievementCodes=new_codes)
    except Exception:
        logger.exception("event_outdoor: failed child_id=%s outdoorActivityId=%s", child_id_str, outdoor_activity_id_str)
        raise


@router.post("/children/{child_id}/events/affirmation", response_model=EventAckOut)
async def affirmation_viewed(
    payload: AffirmationViewedIn,
    child: Child = Depends(get_child_owned_path),
    session: AsyncSession = Depends(get_session),
):
    child_id_str = str(child.id)
    affirmation_id_str = str(payload.affirmationId)
    logger.info(
        "event_affirmation: start child_id=%s affirmationId=%s",
        child_id_str,
        affirmation_id_str,
    )

    try:
        points_values = await rules.fetch_points_values(session)
        points = points_values["affirmation_viewed"]

        insert_res = await insert_event(
            session,
            child_id=child.id,
            kind="affirmation",
            meta={
                "dedupeKey": f"affirmation:{payload.affirmationId}",
                "affirmationId": affirmation_id_str,
                "points": points,
            },
        )
        if insert_res.deduped:
            logger.info("event_affirmation: deduped child_id=%s affirmationId=%s", child_id_str, affirmation_id_str)
            return EventAckOut(pointsAwarded=0, newAchievementCodes=[])

        core_subjects = await list_subject_codes(session, child_id=child.id)

        # Evaluate balanced level-up (same transaction)
        progress_row = (
            await session.execute(select(ChildProgress).where(ChildProgress.child_id == child.id))
        ).scalar_one_or_none()
        if progress_row is None:
            progress_row = ChildProgress(child_id=child.id)
            session.add(progress_row)

        next_level = await _balanced_next_level(session, current_level=progress_row.current_level)
        if next_level is not None and core_subjects:
            required_per_subject = await _balanced_level_required_per_subject(
                session,
                child_id=child.id,
                next_level=next_level,
                core_subjects=core_subjects,
            )

            rows = (
                await session.execute(
                    select(ChildBalancedProgressCounter).where(
                        ChildBalancedProgressCounter.child_id == child.id,
                        ChildBalancedProgressCounter.subject_code.in_(core_subjects),
                    )
                )
            ).scalars().all()
            counter_map = {r.subject_code: int(r.correct_count or 0) for r in rows}

            if all(counter_map.get(code, 0) >= required_per_subject for code in core_subjects):
                progress_row.current_level = next_level
                # Reset counters for core subjects
                for code in core_subjects:
                    row = next((r for r in rows if r.subject_code == code), None)
                    if row is None:
                        session.add(
                            ChildBalancedProgressCounter(
                                child_id=child.id,
                                subject_code=code,
                                correct_count=0,
                                updated_at=datetime.now(timezone.utc),
                            )
                        )
                    else:
                        row.correct_count = 0
                        row.updated_at = datetime.now(timezone.utc)

        new_codes = await _unlock_from_current_state(session, child, core_subjects=core_subjects)
        logger.info(
            "event_affirmation: commit child_id=%s points=%s newAchievementCodes=%s",
            child_id_str,
            points,
            new_codes,
        )

        await session.commit()
        logger.info("event_affirmation: success child_id=%s", child_id_str)
        return EventAckOut(pointsAwarded=points, newAchievementCodes=new_codes)
    except Exception:
        logger.exception("event_affirmation: failed child_id=%s affirmationId=%s", child_id_str, affirmation_id_str)
        raise
