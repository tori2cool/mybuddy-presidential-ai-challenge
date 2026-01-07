# app/services/progress_queries.py
from typing import Dict, List, Literal, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone, date as date_type

from sqlalchemy import func, distinct, case, text, literal_column
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models import (
    Child,
    ChildActivityEvent,
    ChildAchievement,
    AchievementDefinition,
    Subject,
    SubjectAgeRange,
    DifficultyThreshold,
    ChildSubjectStreak,
)
from ..utils.age_utils import get_age_range_for_child
from .progress_rules import calculate_difficulty_from_streak

import logging

logger = logging.getLogger("mybuddy.api")

# Canonical event kind names (match insert_event + routers)
K_FLASHCARD = "flashcard"
K_CHORE = "chore"
K_OUTDOOR = "outdoor"
K_AFFIRMATION = "affirmation"

EventKind = Literal["flashcard", "chore", "outdoor", "affirmation"] 

# ---------------------------------------------------------------------------
# Time helpers (UTC-only)
# ---------------------------------------------------------------------------

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _today_utc_date() -> date_type:
    return _utc_now().date()


def _week_start_utc(d: date_type) -> date_type:
    """
    Sunday-start week, in UTC dates.
    Matches JS getWeekStart() where Sunday=0.
    Python weekday(): Monday=0..Sunday=6
    Shift back by (weekday+1) % 7 to reach Sunday.
    """
    shift = (d.weekday() + 1) % 7
    return d - timedelta(days=shift)


# SQL snippets we reuse to ensure DB-side "day" math is UTC-consistent.
# IMPORTANT: Keep these aligned with your unique index definition in models.py:
#   ((created_at AT TIME ZONE 'UTC')::date)
UTC_DAY_CREATED_AT_SQL = "((child_activity_events.created_at AT TIME ZONE 'UTC')::date)"
UTC_TODAY_SQL = "((now() AT TIME ZONE 'UTC')::date)"


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------

async def insert_event(
    session: AsyncSession,
    *,
    child_id: UUID,
    kind: EventKind,
    meta: dict,
) -> ChildActivityEvent:
    stmt = (
        insert(ChildActivityEvent)
        .values(child_id=child_id, kind=kind, meta=meta)
        .on_conflict_do_nothing(
            index_elements=[
                ChildActivityEvent.child_id,
                ChildActivityEvent.kind,
                text("((created_at AT TIME ZONE 'UTC')::date)"),
                text("(coalesce(meta->>'dedupeKey', ''))"),
            ],
            index_where=text("(meta ? 'dedupeKey') AND (meta->>'dedupeKey' <> '')"),
        )
        .returning(ChildActivityEvent)
    )

    result = await session.execute(stmt)

    # IMPORTANT: always initialize ev
    ev: ChildActivityEvent | None = result.scalar_one_or_none()

    if ev is None:
        dedupe_key = (meta or {}).get("dedupeKey", "") or ""
        if dedupe_key:
            lookup = (
                select(ChildActivityEvent)
                .where(
                    ChildActivityEvent.child_id == child_id,
                    ChildActivityEvent.kind == kind,
                    text(f"{UTC_DAY_CREATED_AT_SQL} = {UTC_TODAY_SQL}"),
                    text("coalesce(child_activity_events.meta->>'dedupeKey', '') = :dedupe_key"),
                )
                .order_by(ChildActivityEvent.created_at.desc())
            )
            ev = (await session.execute(lookup, {"dedupe_key": dedupe_key})).scalar_one_or_none()

    if ev is None:
        raise RuntimeError("insert_event resulted in no row and no matching duplicate was found")

    # Safe: ev is guaranteed here
    logger.debug(
        "insert_event: child_id=%s kind=%s dedupeKey=%s event_id=%s created_at=%s",
        str(child_id),
        kind,
        (meta or {}).get("dedupeKey"),
        str(ev.id),
        ev.created_at.isoformat() if ev.created_at else None,
    )

    return ev


# ---------------------------------------------------------------------------
# Achievements helpers
# ---------------------------------------------------------------------------

async def get_unlocked_achievement_codes(session: AsyncSession, *, child_id: UUID) -> set[str]:
    rows = (
        await session.execute(
            select(AchievementDefinition.code)
            .join(ChildAchievement, ChildAchievement.achievement_id == AchievementDefinition.id)
            .where(ChildAchievement.child_id == child_id)
        )
    ).all()
    return {r[0] for r in rows}


async def get_unlocked_achievements_map(session: AsyncSession, *, child_id: UUID) -> Dict[str, datetime]:
    rows = (
        await session.execute(
            select(AchievementDefinition.code, ChildAchievement.unlocked_at)
            .join(ChildAchievement, ChildAchievement.achievement_id == AchievementDefinition.id)
            .where(ChildAchievement.child_id == child_id)
        )
    ).all()
    return {code: ts for (code, ts) in rows}


async def unlock_achievements(session: AsyncSession, *, child_id: UUID, achievement_ids: List[str]) -> List[str]:
    """
    NOTE: achievement_ids here are actually achievement *codes* (strings),
    kept for backward compat with callers.
    """
    existing_codes = await get_unlocked_achievement_codes(session, child_id=child_id)
    wanted_codes = [c for c in achievement_ids if c not in existing_codes]
    if not wanted_codes:
        return []

    # map codes -> ids
    rows = (
        await session.execute(
            select(AchievementDefinition.code, AchievementDefinition.id)
            .where(AchievementDefinition.code.in_(wanted_codes))
        )
    ).all()
    code_to_id = {c: i for (c, i) in rows}

    new_codes: list[str] = []
    for code in wanted_codes:
        ach_id = code_to_id.get(code)
        if ach_id is None:
            continue
        session.add(ChildAchievement(child_id=child_id, achievement_id=ach_id))
        new_codes.append(code)

    return new_codes

# Difficulty Helpers
async def get_difficulty_thresholds(session: AsyncSession) -> dict[str, int]:
    rows = (
        await session.execute(
            select(DifficultyThreshold.code, DifficultyThreshold.threshold)
            .where(DifficultyThreshold.is_active == True)  # noqa: E712
        )
    ).all()

    thresholds = {code: int(threshold) for code, threshold in rows}
    return thresholds or {"easy": 0, "medium": 20, "hard": 40}


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------

async def list_subject_ids(session: AsyncSession, child_id: Optional[UUID] = None) -> list[str]:
    """
    Returns Subject.code strings.
    If child_id provided, filter by child's age range via SubjectAgeRange.
    """
    if child_id is None:
        rows = (await session.execute(select(Subject.code).order_by(Subject.code))).all()
        return [r[0] for r in rows]

    child = (await session.execute(select(Child).where(Child.id == child_id))).scalar_one_or_none()
    if child is None:
        return []

    age_range = await get_age_range_for_child(child, session)
    if age_range is None:
        return []

    rows = (
        await session.execute(
            select(Subject.code)
            .join(SubjectAgeRange, Subject.id == SubjectAgeRange.subject_id)
            .where(SubjectAgeRange.age_range_id == age_range.id)
            .order_by(Subject.code)
        )
    ).all()

    return [r[0] for r in rows]


# ---------------------------------------------------------------------------
# Aggregations used by the dashboard
# ---------------------------------------------------------------------------

async def compute_totals(session: AsyncSession, *, child_id: str) -> dict:
    # totals by kind
    stmt = (
        select(ChildActivityEvent.kind, func.count(ChildActivityEvent.id))
        .where(ChildActivityEvent.child_id == child_id)
        .group_by(ChildActivityEvent.kind)
    )
    rows = (await session.execute(stmt)).all()
    counts = {kind: int(cnt) for kind, cnt in rows}

    # points: sum meta.points if present
    pts_stmt = select(func.coalesce(func.sum((ChildActivityEvent.meta["points"].as_integer())), 0)).where(
        ChildActivityEvent.child_id == child_id
    )
    total_points = int((await session.execute(pts_stmt)).scalar_one())

    logger.info(
        "progress_totals: child_id=%s totalPoints=%s counts=%s",
        str(child_id),
        total_points,
        counts,
    )

    return {
        "totalPoints": total_points,
        "totalAffirmationsViewed": counts.get(K_AFFIRMATION, 0),
        "totalChoresCompleted": counts.get(K_CHORE, 0),
        "totalOutdoorActivities": counts.get(K_OUTDOOR, 0),
        "totalFlashcardsCompleted": counts.get(K_FLASHCARD, 0),
    }


async def compute_today_stats(session: AsyncSession, *, child_id: str) -> dict:
    today = _today_utc_date()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    stmt = (
        select(ChildActivityEvent.kind, func.count(ChildActivityEvent.id))
        .where(
            ChildActivityEvent.child_id == child_id,
            ChildActivityEvent.created_at >= start,
            ChildActivityEvent.created_at < end,
        )
        .group_by(ChildActivityEvent.kind)
    )
    rows = (await session.execute(stmt)).all()
    counts = {k: int(v) for k, v in rows}

    pts_stmt = select(func.coalesce(func.sum((ChildActivityEvent.meta["points"].as_integer())), 0)).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
    )
    total_points = int((await session.execute(pts_stmt)).scalar_one())

    correct_stmt = select(func.count(ChildActivityEvent.id)).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.kind == K_FLASHCARD,
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
        ChildActivityEvent.meta["correct"].as_boolean() == True,  # noqa: E712
    )
    flash_correct = int((await session.execute(correct_stmt)).scalar_one())

    logger.info(
        "progress_today: child_id=%s date=%s counts=%s flash_correct=%s totalPoints=%s",
        str(child_id),
        today.isoformat(),
        counts,
        flash_correct,
        total_points,
    )

    flash_completed = counts.get(K_FLASHCARD, 0)
    return {
        "date": today.isoformat(),
        "flashcardsCompleted": flash_completed,
        "flashcardsCorrect": flash_correct,
        "choresCompleted": counts.get(K_CHORE, 0),
        "outdoorActivities": counts.get(K_OUTDOOR, 0),
        "affirmationsViewed": counts.get(K_AFFIRMATION, 0),
        "totalPoints": total_points,
        "hasFlashcards": flash_completed > 0,
        "hasChores": counts.get(K_CHORE, 0) > 0,
        "hasOutdoor": counts.get(K_OUTDOOR, 0) > 0,
    }



async def compute_week_stats(session: AsyncSession, *, child_id: str) -> dict:
    today = _today_utc_date()
    week_start = _week_start_utc(today)
    start = datetime(week_start.year, week_start.month, week_start.day, tzinfo=timezone.utc)
    end = start + timedelta(days=7)

    pts_stmt = select(func.coalesce(func.sum((ChildActivityEvent.meta["points"].as_integer())), 0)).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
    )
    total_points = int((await session.execute(pts_stmt)).scalar_one())

    # DISTINCT UTC-days active
    days_stmt = select(
        func.count(distinct(literal_column(UTC_DAY_CREATED_AT_SQL)))
    ).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
    )
    days_active = int((await session.execute(days_stmt)).scalar_one())

    # counts by kind
    stmt = (
        select(ChildActivityEvent.kind, func.count(ChildActivityEvent.id))
        .where(
            ChildActivityEvent.child_id == child_id,
            ChildActivityEvent.created_at >= start,
            ChildActivityEvent.created_at < end,
        )
        .group_by(ChildActivityEvent.kind)
    )
    rows = (await session.execute(stmt)).all()
    counts = {k: int(v) for k, v in rows}

    flash_total = counts.get(K_FLASHCARD, 0)
    flash_correct_stmt = select(func.count(ChildActivityEvent.id)).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.kind == K_FLASHCARD,
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
        ChildActivityEvent.meta["correct"].as_boolean() == True,  # noqa: E712
    )
    flash_correct = int((await session.execute(flash_correct_stmt)).scalar_one())
    accuracy = int(round((flash_correct / flash_total) * 100)) if flash_total > 0 else 0

    logger.info(
        "progress_week: child_id=%s weekStart=%s counts=%s flash_correct=%s accuracyPct=%s totalPoints=%s daysActive=%s",
        str(child_id),
        week_start.isoformat(),
        counts,
        flash_correct,
        accuracy,
        total_points,
        days_active,
    )

    return {
        "weekStart": week_start.isoformat(),
        "totalPoints": total_points,
        "daysActive": days_active,
        "flashcardsCompleted": flash_total,
        "choresCompleted": counts.get(K_CHORE, 0),
        "outdoorActivities": counts.get(K_OUTDOOR, 0),
        "accuracyPct": accuracy,
    }



async def compute_flashcards_by_subject(session: AsyncSession, *, child_id: UUID) -> Dict[str, dict]:
    # Initialize with subject codes filtered for the child (age-range aware)
    subject_codes = await list_subject_ids(session, child_id=child_id)
    by_subject: Dict[str, dict] = {
        c: {"completed": 0, "correct": 0, "correctStreak": 0, "longestStreak": 0, "difficultyCode": "easy"}
        for c in subject_codes
    }

    # thresholds
    thr_rows = (
        await session.execute(
            select(DifficultyThreshold.code, DifficultyThreshold.threshold)
            .where(DifficultyThreshold.is_active == True)  # noqa: E712
        )
    ).all()
    thresholds = {code: int(th) for code, th in thr_rows} or {"easy": 0, "medium": 20, "hard": 40}

    # --- aggregate events ---
    # events store meta["subjectId"] as string(UUID) (per your progress router)
    # cast meta->>'subjectId' to uuid and join subjects to get code
    subject_id_uuid = text("(child_activity_events.meta->>'subjectId')::uuid")

    ev = (
        select(
            Subject.code.label("subject_code"),
            ChildActivityEvent.meta["correct"].as_boolean().label("correct"),
        )
        .select_from(ChildActivityEvent)
        .join(Subject, Subject.id == subject_id_uuid)
        .where(
            ChildActivityEvent.child_id == child_id,
            ChildActivityEvent.kind == "flashcard",
        )
        .subquery()
    )

    stmt = (
        select(
            ev.c.subject_code,
            func.count().label("completed"),
            func.coalesce(func.sum(case((ev.c.correct == True, 1), else_=0)), 0).label("correct"),  # noqa: E712
        )
        .group_by(ev.c.subject_code)
    )
    rows = (await session.execute(stmt)).all()

    for code, completed, correct_sum in rows:
        if code not in by_subject:
            by_subject[code] = {"completed": 0, "correct": 0, "correctStreak": 0, "longestStreak": 0, "difficultyCode": "easy"}
        by_subject[code]["completed"] = int(completed or 0)
        by_subject[code]["correct"] = int(correct_sum or 0)

    # --- streaks ---
    streak_rows = (
        await session.execute(
            select(
                Subject.code,
                ChildSubjectStreak.current_streak,
                ChildSubjectStreak.longest_streak,
            )
            .select_from(ChildSubjectStreak)
            .join(Subject, Subject.id == ChildSubjectStreak.subject_id)
            .where(ChildSubjectStreak.child_id == child_id)
        )
    ).all()

    for code, current_streak, longest_streak in streak_rows:
        if code in by_subject:
            by_subject[code]["correctStreak"] = int(current_streak or 0)
            by_subject[code]["longestStreak"] = int(longest_streak or 0)

    # --- difficulty + tier boundaries ---
    sorted_tiers = sorted(thresholds.items(), key=lambda x: x[1])

    for code in list(by_subject.keys()):
        streak = int(by_subject[code]["correctStreak"] or 0)
        diff = calculate_difficulty_from_streak(streak, thresholds)
        by_subject[code]["difficultyCode"] = diff

        tier_index = next((i for i, (name, _) in enumerate(sorted_tiers) if name == diff), 0)
        current_start = sorted_tiers[tier_index][1]
        next_threshold = sorted_tiers[tier_index + 1][1] if tier_index + 1 < len(sorted_tiers) else None

        by_subject[code]["currentTierStartAtStreak"] = current_start
        by_subject[code]["nextDifficultyAtStreak"] = next_threshold

    return by_subject


async def compute_streaks(session: AsyncSession, *, child_id: str) -> dict:
    """
    Compute streaks from distinct active UTC-days (any event counts as activity).
    """
    today = _today_utc_date()
    start_dt = datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - timedelta(days=180)

    # Use literal_column so it can be labeled and selected cleanly.
    date_expr = literal_column(UTC_DAY_CREATED_AT_SQL).label("d")

    stmt = (
        select(date_expr)
        .where(ChildActivityEvent.child_id == child_id, ChildActivityEvent.created_at >= start_dt)
        .distinct()
        .order_by(date_expr.desc())
    )
    rows = (await session.execute(stmt)).all()
    active_days = [r[0] for r in rows if r and r[0] is not None]  # list[date]

    active_set = set(active_days)

    cur = 0
    d = today
    while d in active_set:
        cur += 1
        d = d - timedelta(days=1)

    longest = 0
    if active_set:
        days_sorted = sorted(active_set)
        run = 1
        for i in range(1, len(days_sorted)):
            if (days_sorted[i] - days_sorted[i - 1]).days == 1:
                run += 1
            else:
                longest = max(longest, run)
                run = 1
        longest = max(longest, run)

    last_active = max(active_set).isoformat() if active_set else None
    return {"currentStreak": cur, "longestStreak": longest, "lastActiveDate": last_active}