# app/services/progress_queries.py
from __future__ import annotations

from datetime import datetime, timedelta, timezone, date as date_type
from typing import Dict, List, Literal, Optional

from sqlalchemy import func, distinct, case, text, literal_column
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models import ChildActivityEvent, ChildAchievement, Subject, DifficultyThreshold
from .progress_rules import calculate_difficulty

EventKind = Literal["flashcard_answered", "chore_completed", "outdoor_completed", "affirmation_viewed"]


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
    child_id: str,
    kind: EventKind,
    meta: dict,
) -> ChildActivityEvent:
    """
    Insert an event with dedupe behavior:
      (child_id, kind, UTC-day(created_at), coalesce(meta.dedupeKey, ''))
    for rows that have a non-empty dedupeKey.

    Returns:
      - the inserted ChildActivityEvent, OR
      - the existing (most recent) matching event if the insert was a duplicate.

    Notes:
      - created_at is NOT included in VALUES on purpose: the DB should supply it
        via server_default (Option A). This avoids NULL created_at with Core inserts.
      - The "duplicate fetch" uses the same UTC-day definition as the unique index.
    """
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
    ev = result.scalar_one_or_none()

    # If it was a no-op (duplicate), fetch the existing event for consistency.
    if ev is None:
        dedupe_key = (meta or {}).get("dedupeKey", "") or ""
        # Only attempt the lookup if the caller actually provided a dedupeKey
        # (otherwise duplicates are not being deduped by our partial unique index).
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
            ev = (await session.execute(lookup, {"dedupe_key": dedupe_key})).scalar_one()

    # If ev is still None here, it means the insert conflicted but we couldn't
    # find the existing row (e.g., empty dedupeKey). That's a programmer error.
    if ev is None:
        raise RuntimeError("insert_event resulted in no row and no matching duplicate was found")

    return ev


# ---------------------------------------------------------------------------
# Achievements helpers
# ---------------------------------------------------------------------------

async def get_unlocked_achievement_ids(session: AsyncSession, *, child_id: str) -> set[str]:
    rows = (
        await session.execute(
            select(ChildAchievement.achievement_id).where(ChildAchievement.child_id == child_id)
        )
    ).all()
    return {r[0] for r in rows}


async def get_unlocked_achievements_map(session: AsyncSession, *, child_id: str) -> Dict[str, datetime]:
    """Return {achievement_id: unlocked_at} for a child."""
    rows = (
        await session.execute(
            select(ChildAchievement.achievement_id, ChildAchievement.unlocked_at).where(
                ChildAchievement.child_id == child_id
            )
        )
    ).all()
    return {aid: ts for (aid, ts) in rows}


async def unlock_achievements(session: AsyncSession, *, child_id: str, achievement_ids: List[str]) -> List[str]:
    existing = await get_unlocked_achievement_ids(session, child_id=child_id)
    new_ids = [aid for aid in achievement_ids if aid not in existing]
    for aid in new_ids:
        session.add(ChildAchievement(child_id=child_id, achievement_id=aid))
    return new_ids

# Difficulty Helpers
async def get_difficulty_thresholds(session: AsyncSession) -> dict:
    """
    Return difficulty thresholds as a dict the rules function can use.
    Example: {"easy": 0, "medium": 20, "hard": 40}
    """
    rows = (
        await session.execute(
            select(DifficultyThreshold.difficulty, DifficultyThreshold.threshold)
            .where(DifficultyThreshold.is_active == True)  # noqa: E712
        )
    ).all()

    # Fallback if table is empty / mis-seeded
    thresholds = {difficulty: int(threshold) for difficulty, threshold in rows}
    if not thresholds:
        thresholds = {"easy": 0, "medium": 20, "hard": 40}

    return thresholds


# ---------------------------------------------------------------------------
# Subjects
# ---------------------------------------------------------------------------

async def list_subject_ids(session: AsyncSession) -> list[str]:
    rows = (await session.execute(select(Subject.id))).all()
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

    return {
        "totalPoints": total_points,
        "totalAffirmationsViewed": counts.get("affirmation_viewed", 0),
        "totalChoresCompleted": counts.get("chore_completed", 0),
        "totalOutdoorActivities": counts.get("outdoor_completed", 0),
        "totalFlashcardsCompleted": counts.get("flashcard_answered", 0),
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
        ChildActivityEvent.kind == "flashcard_answered",
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
        ChildActivityEvent.meta["correct"].as_boolean() == True,  # noqa: E712
    )
    flash_correct = int((await session.execute(correct_stmt)).scalar_one())

    return {
        "date": today.isoformat(),
        "flashcardsCompleted": counts.get("flashcard_answered", 0),
        "flashcardsCorrect": flash_correct,
        "choresCompleted": counts.get("chore_completed", 0),
        "outdoorActivities": counts.get("outdoor_completed", 0),
        "affirmationsViewed": counts.get("affirmation_viewed", 0),
        "totalPoints": total_points,
        "hasFlashcards": counts.get("flashcard_answered", 0) > 0,
        "hasChores": counts.get("chore_completed", 0) > 0,
        "hasOutdoor": counts.get("outdoor_completed", 0) > 0,
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

    # DISTINCT UTC-days active (avoid func.date(timestamptz) timezone ambiguity)
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

    flash_total = counts.get("flashcard_answered", 0)
    flash_correct_stmt = select(func.count(ChildActivityEvent.id)).where(
        ChildActivityEvent.child_id == child_id,
        ChildActivityEvent.kind == "flashcard_answered",
        ChildActivityEvent.created_at >= start,
        ChildActivityEvent.created_at < end,
        ChildActivityEvent.meta["correct"].as_boolean() == True,  # noqa: E712
    )
    flash_correct = int((await session.execute(flash_correct_stmt)).scalar_one())
    accuracy = int(round((flash_correct / flash_total) * 100)) if flash_total > 0 else 0

    return {
        "weekStart": week_start.isoformat(),
        "totalPoints": total_points,
        "daysActive": days_active,
        "flashcardsCompleted": flash_total,
        "choresCompleted": counts.get("chore_completed", 0),
        "outdoorActivities": counts.get("outdoor_completed", 0),
        "accuracyPct": accuracy,
    }


async def compute_flashcards_by_subject(session: AsyncSession, *, child_id: str) -> Dict[str, dict]:
    """
    Return per-subject flashcard stats:
      {
        "<subjectId>": {"completed": int, "correct": int, "difficulty": "easy"|"medium"|"hard"},
        ...
      }

    Notes:
    - Initializes all known subjects from the DB so the client can render zeros.
    - Difficulty is computed using DB-driven thresholds (difficulty_thresholds table).
    """
    # Initialize with all DB subjects so the client can render 0s.
    subject_ids = await list_subject_ids(session)
    by_subject: Dict[str, dict] = {
        s: {"completed": 0, "correct": 0, "difficulty": "easy"} for s in subject_ids
    }

    # Load difficulty thresholds once (DB-driven).
    # Expected by calculate_difficulty(correct, thresholds)
    thr_rows = (
        await session.execute(
            select(DifficultyThreshold.difficulty, DifficultyThreshold.threshold)
            .where(DifficultyThreshold.is_active == True)  # noqa: E712
        )
    ).all()

    thresholds = {difficulty: int(threshold) for difficulty, threshold in thr_rows}
    if not thresholds:
        # Fallback if the table is empty / not seeded yet
        thresholds = {"easy": 0, "medium": 20, "hard": 40}

    # Count completed/correct by subjectId (stored in meta).
    # Use a subquery to avoid Postgres GROUP BY errors on JSONB expressions.
    ev = (
        select(
            ChildActivityEvent.meta["subjectId"].as_string().label("subjectId"),
            ChildActivityEvent.meta["correct"].as_boolean().label("correct"),
        )
        .where(
            ChildActivityEvent.child_id == child_id,
            ChildActivityEvent.kind == "flashcard_answered",
        )
        .subquery()
    )

    stmt = (
        select(
            ev.c.subjectId,
            func.count().label("completed"),
            func.coalesce(
                func.sum(case((ev.c.correct == True, 1), else_=0)), 0  # noqa: E712
            ).label("correct"),
        )
        .group_by(ev.c.subjectId)
    )

    rows = (await session.execute(stmt)).all()

    for subject_id, completed, correct_sum in rows:
        sid = subject_id or "unknown"
        if sid not in by_subject:
            # Fallback for events referencing subjects not present in the DB.
            by_subject[sid] = {"completed": 0, "correct": 0, "difficulty": "easy"}

        correct = int(correct_sum or 0)
        by_subject[sid]["completed"] = int(completed or 0)
        by_subject[sid]["correct"] = correct
        by_subject[sid]["difficulty"] = calculate_difficulty(correct, thresholds)

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