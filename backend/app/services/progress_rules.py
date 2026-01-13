# backend/app/services/progress_rules.py
"""
Core calculation functions.
All thresholds, subjects, points values are fetched from database.
No hardcoded constants.
"""

from __future__ import annotations

from typing import Dict, Tuple, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import DifficultyThreshold, LevelThreshold, PointsValue


def difficulty_tier_progress(
    *,
    thresholds: Dict[str, int],
    current_code: str,
) -> tuple[str, str | None, int, int | None]:
    """Compute tier progression info based on persisted tier.

    Returns:
      (current_code, next_code, current_threshold, required_tier_streak_to_advance)

    required_tier_streak_to_advance is computed as the *absolute* threshold
    for the next tier (next.threshold).

    Example thresholds: easy=0, medium=20, hard=40
      - current=easy   -> required=20
      - current=medium -> required=40 (NOT delta 20)
    If current_code is the max tier (no next), next_code and required are None.

    Sorting is stable: (threshold asc, code asc).
    """

    if not thresholds:
        return ("easy", None, 0, None)

    sorted_tiers = sorted(thresholds.items(), key=lambda kv: (kv[1], kv[0]))
    codes = [c for (c, _) in sorted_tiers]

    if current_code not in thresholds:
        current_code = codes[0]

    idx = codes.index(current_code)
    current_threshold = int(thresholds[current_code])

    if idx >= len(sorted_tiers) - 1:
        return (current_code, None, current_threshold, None)

    next_code = sorted_tiers[idx + 1][0]
    next_threshold = int(sorted_tiers[idx + 1][1])
    # Required is the absolute streak threshold for the NEXT tier.
    required = max(0, next_threshold)
    return (current_code, next_code, current_threshold, required)


def _cache(db: AsyncSession) -> dict:
    c = getattr(db, "_mybuddy_cache", None)
    if c is None:
        c = {}
        setattr(db, "_mybuddy_cache", c)
    return c


# ========== FETCH FUNCTIONS (NO CONSTANTS) ==========

async def fetch_levels(db: AsyncSession) -> tuple[dict[str, int], dict[str, dict]]:
    """
    Fetch BOTH level thresholds and metadata in one DB round-trip.
    Returns:
      - thresholds: {level_name: threshold_int}
      - metadata:   {level_name: {"icon": str | None, "color": str | None}}
    """
    c = _cache(db)
    if "levels" in c:
        return c["levels"]

    result = await db.execute(
        select(LevelThreshold).where(LevelThreshold.is_active == True)  # noqa: E712
    )
    rows = result.scalars().all()

    thresholds: dict[str, int] = {row.name: int(row.threshold) for row in rows}
    metadata: dict[str, dict] = {
        row.name: {"icon": row.icon, "color": row.color} for row in rows
    }
    c["levels"] = (thresholds, metadata)
    return thresholds, metadata


async def fetch_difficulty_thresholds(db: AsyncSession) -> Dict[str, int]:
    """Fetch difficulty thresholds from database. Keyed by code (easy/medium/hard)."""
    c = _cache(db)
    if "difficulty_thresholds" in c:
        return c["difficulty_thresholds"]

    result = await db.execute(
        select(DifficultyThreshold).where(DifficultyThreshold.is_active == True)  # noqa: E712
    )
    thresholds = {row.code: int(row.threshold) for row in result.scalars().all()}
    c["difficulty_thresholds"] = thresholds
    return thresholds


async def fetch_points_values(db: AsyncSession) -> Dict[str, int]:
    """Fetch points values from database. Keyed by code (stable identifier)."""
    c = _cache(db)
    if "points_values" in c:
        return c["points_values"]

    result = await db.execute(select(PointsValue).where(PointsValue.is_active == True))  # noqa: E712
    points = {row.code: int(row.points) for row in result.scalars().all()}
    c["points_values"] = points
    return points


# ========== CALCULATION FUNCTIONS ==========

def calculate_difficulty(correct: int, thresholds: Dict[str, int]) -> str:
    """
    Determine difficulty based on total correct answers.
    Thresholds come from database.
    
    Note: For streak-based difficulty progression, use calculate_difficulty_from_streak.
    Returns the highest tier where correct >= threshold (sorted ascending by threshold).
    """
    # Sort tiers by threshold ascending (then by tier name for determinism)
    sorted_tiers = sorted(thresholds.items(), key=lambda x: (x[1], x[0]))
    
    # Return the highest tier whose threshold is <= correct
    for tier_name, threshold in reversed(sorted_tiers):
        if correct >= threshold:
            return tier_name
    
    # Fallback: return lowest tier name if thresholds exist
    return sorted_tiers[0][0] if sorted_tiers else "easy"


def calculate_difficulty_from_streak(streak: int, thresholds: Dict[str, int]) -> str:
    """
    Determine difficulty based on consecutive correct answer streak.
    Thresholds come from database.
    
    This is the main function for flashcard difficulty progression,
    which now uses streaks instead of total correct answers.
    Returns the highest tier where streak >= threshold (sorted ascending by threshold).
    """
    # Sort tiers by threshold ascending (then by tier name for determinism)
    # (e.g., [("easy", 0), ("medium", 20), ("hard", 40)])
    sorted_tiers = sorted(thresholds.items(), key=lambda x: (x[1], x[0]))
    
    # Return the highest tier whose threshold is <= streak
    for tier_name, threshold in reversed(sorted_tiers):
        if streak >= threshold:
            return tier_name
    
    # Fallback: return lowest tier name if thresholds exist
    return sorted_tiers[0][0] if sorted_tiers else "easy"


def compute_balanced_progress(
    subject_correct: Dict[str, int],
    subjects: List[str],
    level_thresholds: Dict[str, int],
    *,
    current_level: str | None = None,
) -> dict:
    """Compute balanced progress toward NEXT level.

    Used by the dashboard builder.

    IMPORTANT:
    - `subject_correct` is expected to be per-level counters (not lifetime totals).
    - `current_level` is the persisted child level (source of truth).
    - requiredPerSubject is computed from the NEXT level's threshold.
    """

    n_subjects = len(subjects)

    if n_subjects == 0:
        return {
            "canLevelUp": False,
            "currentLevel": current_level or "New Kid",
            "nextLevel": None,
            "requiredPerSubject": 0,
            "subjectProgress": {},
            "lowestSubject": None,
        }

    if not level_thresholds:
        sp = {
            s: {
                "correct": subject_correct.get(s, 0),
                "required": 0,
                "meetsRequirement": True,
            }
            for s in subjects
        }
        return {
            "canLevelUp": False,
            "currentLevel": current_level or "New Kid",
            "nextLevel": None,
            "requiredPerSubject": 0,
            "subjectProgress": sp,
            "lowestSubject": min(subject_correct, key=lambda k: subject_correct.get(k, 0)) if subjects else None,
        }

    levels_asc = sorted(level_thresholds.items(), key=lambda kv: kv[1])
    level_names = [name for name, _ in levels_asc]

    resolved_current = current_level if (current_level in level_thresholds) else None

    if resolved_current is None:
        # Fallback (legacy): infer from current counters using min across subjects.
        min_correct = min(subject_correct.get(s, 0) for s in subjects)
        levels_desc = sorted(level_thresholds.items(), key=lambda kv: kv[1], reverse=True)
        for level_name, threshold in levels_desc:
            if threshold == 0:
                continue
            required_per_subject = int(threshold)
            if min_correct >= required_per_subject:
                resolved_current = level_name
                break
        if resolved_current is None:
            resolved_current = "New Kid"

    next_level: str | None = None
    for i, ln in enumerate(level_names):
        if ln == resolved_current and i < len(level_names) - 1:
            next_level = level_names[i + 1]
            break

    if next_level is None:
        sp = {
            s: {
                "correct": subject_correct.get(s, 0),
                "required": 0,
                "meetsRequirement": True,
            }
            for s in subjects
        }
        return {
            "canLevelUp": False,
            "currentLevel": resolved_current,
            "nextLevel": None,
            "requiredPerSubject": 0,
            "subjectProgress": sp,
            "lowestSubject": min(subjects, key=lambda s: subject_correct.get(s, 0)) if subjects else None,
        }

    next_threshold = int(level_thresholds.get(next_level, 0))
    # New semantics: required per subject is the full next level threshold (no division).
    required_per_subject = next_threshold

    min_counter = min(subject_correct.get(s, 0) for s in subjects)
    lowest_subject = min(subjects, key=lambda s: subject_correct.get(s, 0))

    sp = {
        s: {
            "correct": subject_correct.get(s, 0),
            "required": required_per_subject,
            "meetsRequirement": subject_correct.get(s, 0) >= required_per_subject,
        }
        for s in subjects
    }

    return {
        "canLevelUp": min_counter >= required_per_subject,
        "currentLevel": resolved_current,
        "nextLevel": next_level,
        "requiredPerSubject": required_per_subject,
        "subjectProgress": sp,
        "lowestSubject": lowest_subject,
    }


def reward_for_level(
    current_level: str,
    subject_correct: Dict[str, int],
    subjects: List[str],
    level_thresholds: Dict[str, int],
    level_metadata: Dict[str, Dict],
) -> dict:
    """
    Calculate reward level info.
    All parameters come from database.

    IMPORTANT: Must never crash when:
      - subjects is empty (brand-new child / no subjects configured yet)
      - level_thresholds is empty (DB misconfigured or not seeded)
      - current_level not present in thresholds
    """

    metadata = level_metadata.get(current_level, {"icon": "star", "color": "#9CA3AF"})

    # If there are no subjects, we cannot compute "balanced min across subjects".
    # Return a safe "0 progress" reward.
    if not subjects:
        return {
            "level": current_level,
            "icon": metadata.get("icon", "star"),
            "color": metadata.get("color", "#9CA3AF"),
            "nextAt": None,
            "progress": 0,
        }

    # If thresholds are missing, also return safe default.
    if not level_thresholds:
        return {
            "level": current_level,
            "icon": metadata.get("icon", "star"),
            "color": metadata.get("color", "#9CA3AF"),
            "nextAt": None,
            "progress": 0,
        }

    min_correct = min(subject_correct.get(s, 0) for s in subjects)

    # New semantics: thresholds are per-subject, and progress is tracked by the
    # minimum per-subject counter (balanced progression).
    effective_progress = min_correct

    # Current threshold; if unknown current_level, treat as 0.
    current_threshold = int(level_thresholds.get(current_level, 0))

    sorted_levels = sorted(level_thresholds.items(), key=lambda kv: kv[1])

    # Find next level's threshold (per-subject)
    next_at: int | None = None
    for i, (level_name, threshold) in enumerate(sorted_levels):
        if level_name == current_level:
            if i < len(sorted_levels) - 1:
                next_at = int(sorted_levels[i + 1][1])
            break

    if next_at is None:
        pct = 100
    else:
        denom = (next_at - current_threshold)
        if denom <= 0:
            # Bad/misordered thresholds; don't divide by zero or go negative.
            pct = 0
        else:
            pct = int(
                min(
                    max(((effective_progress - current_threshold) / denom) * 100, 0),
                    100,
                )
            )

    return {
        "level": current_level,
        "icon": metadata.get("icon", "star"),
        "color": metadata.get("color", "#9CA3AF"),
        "nextAt": next_at,
        "progress": pct,
    }
