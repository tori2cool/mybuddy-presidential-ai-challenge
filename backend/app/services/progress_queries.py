# app/services/progress_queries.py
from typing import Dict, List, Literal, Optional, Any
from dataclasses import dataclass
from uuid import UUID
from datetime import datetime, timedelta, timezone, date as date_type

from sqlalchemy import func, distinct, case, literal_column, or_
from sqlalchemy.exc import IntegrityError
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
    ChildSubjectDifficulty,
)
from ..utils.age_utils import get_age_range_for_child
from .progress_rules import difficulty_tier_progress

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

def _uuid_or_none(value: Any) -> Optional[UUID]:
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except Exception:
        return None

# SQL snippets we reuse to ensure DB-side "day" math is UTC-consistent.
# IMPORTANT: Keep these aligned with your unique index definition in models.py:
#   ((created_at AT TIME ZONE 'UTC')::date)
UTC_DAY_CREATED_AT_SQL = "((child_activity_events.created_at AT TIME ZONE 'UTC')::date)"
UTC_TODAY_SQL = "((now() AT TIME ZONE 'UTC')::date)"


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------

@dataclass
class InsertEventResult:
    inserted: bool
    deduped: bool
    event: Optional[ChildActivityEvent]


async def insert_event(
    session: AsyncSession,
    *,
    child_id: UUID,
    kind: str,
    meta: Optional[dict[str, Any]] = None,
) -> InsertEventResult:
    """Insert an append-only ChildActivityEvent.

    Uses a SAVEPOINT (nested transaction) around the insert+flush so that a
    dedupe/unique violation does NOT roll back the caller's outer transaction.

    Returns:
    - inserted=True: event row created (event populated)
    - deduped=True: idempotent no-op due to unique constraint (event=None)
    """
    meta = meta or {}

    ev = ChildActivityEvent(
        child_id=child_id,
        kind=kind,
        meta=meta,
    )

    # ------------------------------------------------------------
    # Typed column extraction (based on the payloads you send today)
    # ------------------------------------------------------------
    if "points" in meta:
        try:
            ev.points = int(meta["points"])
        except Exception:
            pass

    if kind == "flashcard":
        ev.flashcard_id = _uuid_or_none(meta.get("flashcardId"))
        ev.subject_id = _uuid_or_none(meta.get("subjectId"))

        if "correct" in meta:
            try:
                ev.correct = bool(meta["correct"])
            except Exception:
                pass

        if "answer" in meta and meta["answer"] is not None:
            ev.answer = str(meta["answer"])[:500]

    elif kind == "chore":
        ev.chore_id = _uuid_or_none(meta.get("choreId"))

    elif kind == "outdoor":
        ev.outdoor_activity_id = _uuid_or_none(meta.get("outdoorActivityId"))

    elif kind == "affirmation":
        ev.affirmation_id = _uuid_or_none(meta.get("affirmationId"))

    try:
        async with session.begin_nested():
            session.add(ev)
            await session.flush()
    except IntegrityError as e:
        msg = str(e)
        orig = getattr(e, "orig", None)
        orig_cls_name = orig.__class__.__name__ if orig is not None else ""

        is_unique = ("UniqueViolationError" in orig_cls_name) or ("uq_child_kind_dedupe_per_day" in msg)
        if is_unique:
            return InsertEventResult(inserted=False, deduped=True, event=None)
        raise

    return InsertEventResult(inserted=True, deduped=False, event=ev)


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

async def list_subject_codes(session: AsyncSession, *, child_id: Optional[UUID] = None) -> list[str]:
    """
    Return Subject.code strings (never UUIDs).

    If child_id is provided, subjects are filtered by the child's age range via
    SubjectAgeRange.
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


async def list_subject_uuids(session: AsyncSession, *, child_id: Optional[UUID] = None) -> list[UUID]:
    """
    Return Subject.id UUIDs (never codes).

    If child_id is provided, subjects are filtered by the child's age range via
    SubjectAgeRange (mirrors list_subject_codes).
    """
    if child_id is None:
        rows = (await session.execute(select(Subject.id).order_by(Subject.code))).all()
        return [r[0] for r in rows]

    child = (await session.execute(select(Child).where(Child.id == child_id))).scalar_one_or_none()
    if child is None:
        return []

    age_range = await get_age_range_for_child(child, session)
    if age_range is None:
        return []

    rows = (
        await session.execute(
            select(Subject.id)
            .join(SubjectAgeRange, Subject.id == SubjectAgeRange.subject_id)
            .where(SubjectAgeRange.age_range_id == age_range.id)
            .order_by(Subject.code)
        )
    ).all()

    return [r[0] for r in rows]


# ---------------------------------------------------------------------------
# Aggregations used by the dashboard
# ---------------------------------------------------------------------------

async def compute_totals(session: AsyncSession, *, child_id: UUID) -> dict:
    stmt = (
        select(ChildActivityEvent.kind, func.count(ChildActivityEvent.id))
        .where(ChildActivityEvent.child_id == child_id)
        .group_by(ChildActivityEvent.kind)
    )
    rows = (await session.execute(stmt)).all()
    counts = {kind: int(cnt) for kind, cnt in rows}

    pts_stmt = select(func.coalesce(func.sum(ChildActivityEvent.points), 0)).where(
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


async def compute_today_stats(session: AsyncSession, *, child_id: UUID) -> dict:
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

    pts_stmt = select(func.coalesce(func.sum(ChildActivityEvent.points), 0)).where(
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
        ChildActivityEvent.correct == True,  # noqa: E712
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
        "date": today.isoformat(),  # ISO string is OK; pydantic date can parse it
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


async def compute_week_stats(session: AsyncSession, *, child_id: UUID) -> dict:
    today = _today_utc_date()
    week_start = _week_start_utc(today)
    start = datetime(week_start.year, week_start.month, week_start.day, tzinfo=timezone.utc)
    end = start + timedelta(days=7)

    pts_stmt = select(func.coalesce(func.sum(ChildActivityEvent.points), 0)).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
    )
    total_points = int((await session.execute(pts_stmt)).scalar_one())

    days_stmt = select(func.count(distinct(literal_column(UTC_DAY_CREATED_AT_SQL)))).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
    )
    days_active = int((await session.execute(days_stmt)).scalar_one())

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
        ChildActivityEvent.correct == True,  # noqa: E712
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


async def compute_flashcards_by_subject(
    session: AsyncSession,
    *,
    child_id: UUID,
    subject_codes: Optional[list[str]] = None,
) -> Dict[str, dict]:
    if subject_codes is None:
        subject_codes = await list_subject_codes(session, child_id=child_id)

    # Default difficulty should be the first active tier by ascending threshold
    # (typically threshold==0).
    thresholds = await get_difficulty_thresholds(session)
    default_diff = min(thresholds.items(), key=lambda kv: kv[1])[0] if thresholds else "easy"

    by_subject: Dict[str, dict] = {
        c: {"completed": 0, "correct": 0, "correctStreak": 0, "longestStreak": 0, "difficultyCode": default_diff}
        for c in subject_codes
    }

    logger.info("difficulty_thresholds: child_id=%s thresholds=%s", str(child_id), thresholds)

    # Aggregate events (typed subject_id join)
    stmt = (
        select(
            Subject.code.label("subject_code"),
            func.count(ChildActivityEvent.id).label("completed"),
            func.coalesce(
                func.sum(case((ChildActivityEvent.correct == True, 1), else_=0)),  # noqa: E712
                0,
            ).label("correct"),
        )
        .select_from(ChildActivityEvent)
        .join(Subject, Subject.id == ChildActivityEvent.subject_id)
        .where(
            ChildActivityEvent.child_id == child_id,
            ChildActivityEvent.kind == K_FLASHCARD,
        )
        .group_by(Subject.code)
    )
    rows = (await session.execute(stmt)).all()

    for code, completed, correct_sum in rows:
        if code not in by_subject:
            by_subject[code] = {"completed": 0, "correct": 0, "correctStreak": 0, "longestStreak": 0, "difficultyCode": default_diff}
        by_subject[code]["completed"] = int(completed or 0)
        by_subject[code]["correct"] = int(correct_sum or 0)

    # Streaks
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

    # Fetch persisted difficulty tiers per subject (source of truth)
    difficulty_rows = (
        await session.execute(
            select(Subject.code, ChildSubjectDifficulty.difficulty_code)
            .select_from(ChildSubjectDifficulty)
            .join(Subject, Subject.id == ChildSubjectDifficulty.subject_id)
            .where(ChildSubjectDifficulty.child_id == child_id)
        )
    ).all()
    diff_map: dict[str, str] = {code: diff for code, diff in difficulty_rows}

    logger.info("subject_difficulty_map: child_id=%s diff_map=%s", str(child_id), diff_map)

    # Precompute tier ordering once for anomaly checks
    tiers_asc = sorted(thresholds.items(), key=lambda kv: kv[1])
    tier_codes_asc = [c for c, _t in tiers_asc]

    for code in list(by_subject.keys()):
        # Persisted difficulty (default to first active tier if missing)
        current_diff = diff_map.get(code, default_diff)
        by_subject[code]["difficultyCode"] = current_diff

        # Start streak for the current tier is its threshold (default 0).
        by_subject[code]["currentTierStartAtStreak"] = int(thresholds.get(current_diff, 0))

        # Next difficulty requires the NEXT tier's absolute threshold.
        _cur, _next, _cur_threshold, required = difficulty_tier_progress(
            thresholds=thresholds,
            current_code=current_diff,
        )
        by_subject[code]["nextDifficultyAtStreak"] = required

        # Targeted anomaly logging (INFO, concise)
        correct_streak = int(by_subject[code].get("correctStreak") or 0)
        next_at = by_subject[code].get("nextDifficultyAtStreak")
        current_start = by_subject[code].get("currentTierStartAtStreak")

        has_higher_tier = False
        if current_diff in tier_codes_asc:
            idx = tier_codes_asc.index(current_diff)
            has_higher_tier = idx < (len(tier_codes_asc) - 1)
        else:
            # Unknown tier code is itself an anomaly; best effort: if any tiers exist, consider there may be a higher tier.
            has_higher_tier = len(tier_codes_asc) > 1

        is_anomaly = (current_diff not in thresholds) or (next_at is None and has_higher_tier)
        if is_anomaly:
            logger.info(
                "subject_difficulty_anomaly: child_id=%s subject_code=%s difficultyCode=%s correctStreak=%s nextDifficultyAtStreak=%s currentTierStartAtStreak=%s thresholds=%s",
                str(child_id),
                code,
                current_diff,
                correct_streak,
                next_at,
                current_start,
                thresholds,
            )

    return by_subject


async def compute_today_completed_ids(session: AsyncSession, *, child_id: UUID) -> dict:
    """Return distinct IDs completed today (UTC day) for chore/outdoor events.

    - chore: distinct ChildActivityEvent.chore_id where kind==K_CHORE
    - outdoor: distinct ChildActivityEvent.outdoor_activity_id where kind==K_OUTDOOR
    - ignores null ids

    Output keys:
      - todayCompletedChoreIds: list[UUID]
      - todayCompletedOutdoorActivityIds: list[UUID]
    """

    today = _today_utc_date()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    chores_stmt = (
        select(distinct(ChildActivityEvent.chore_id))
        .where(
            ChildActivityEvent.child_id == child_id,
            ChildActivityEvent.kind == K_CHORE,
            ChildActivityEvent.created_at >= start,
            ChildActivityEvent.created_at < end,
            ChildActivityEvent.chore_id.is_not(None),
        )
    )
    chore_rows = (await session.execute(chores_stmt)).all()
    chore_ids = [r[0] for r in chore_rows if r and r[0] is not None]

    outdoor_stmt = (
        select(distinct(ChildActivityEvent.outdoor_activity_id))
        .where(
            ChildActivityEvent.child_id == child_id,
            ChildActivityEvent.kind == K_OUTDOOR,
            ChildActivityEvent.created_at >= start,
            ChildActivityEvent.created_at < end,
            ChildActivityEvent.outdoor_activity_id.is_not(None),
        )
    )
    outdoor_rows = (await session.execute(outdoor_stmt)).all()
    outdoor_ids = [r[0] for r in outdoor_rows if r and r[0] is not None]

    return {
        "todayCompletedChoreIds": chore_ids,
        "todayCompletedOutdoorActivityIds": outdoor_ids,
    }


async def compute_streaks(session: AsyncSession, *, child_id: UUID) -> dict:
    today = _today_utc_date()
    start_dt = datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - timedelta(days=180)

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