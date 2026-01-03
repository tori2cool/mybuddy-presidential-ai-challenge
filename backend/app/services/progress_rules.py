# backend/app/services/progress_rules.py
"""
Core calculation functions.
All thresholds, subjects, points values are fetched from database.
No hardcoded constants.
"""

from __future__ import annotations

from typing import Dict, List, Literal

from sqlalchemy.ext.asyncio import AsyncSession


# ========== FETCH FUNCTIONS (NO CONSTANTS) ==========

async def fetch_level_thresholds(db: AsyncSession) -> Dict[str, int]:
    """Fetch level thresholds from database."""
    from sqlalchemy import select
    from ..models import LevelThreshold

    result = await db.execute(select(LevelThreshold).where(LevelThreshold.is_active == True))
    thresholds = {row.level_name: row.threshold for row in result.scalars().all()}
    return thresholds


async def fetch_level_metadata(db: AsyncSession) -> Dict[str, Dict]:
    """Fetch level metadata (icon, color) from database."""
    from sqlalchemy import select
    from ..models import LevelThreshold

    result = await db.execute(select(LevelThreshold).where(LevelThreshold.is_active == True))
    return {
        row.level_name: {"icon": row.icon, "color": row.color}
        for row in result.scalars().all()
    }


async def fetch_difficulty_thresholds(db: AsyncSession) -> Dict[str, int]:
    """Fetch difficulty thresholds from database."""
    from sqlalchemy import select
    from ..models import DifficultyThreshold

    result = await db.execute(select(DifficultyThreshold).where(DifficultyThreshold.is_active == True))
    thresholds = {row.difficulty: row.threshold for row in result.scalars().all()}
    return thresholds


async def fetch_points_values(db: AsyncSession) -> Dict[str, int]:
    """Fetch points values from database."""
    from sqlalchemy import select
    from ..models import PointsValue

    result = await db.execute(select(PointsValue).where(PointsValue.is_active == True))
    return {row.activity: row.points for row in result.scalars().all()}


# ========== CALCULATION FUNCTIONS ==========

def calculate_difficulty(correct: int, thresholds: Dict[str, int]) -> Literal["easy", "medium", "hard"]:
    """
    Determine difficulty based on correct answers.
    Thresholds come from database.
    """
    if correct >= thresholds.get("hard", 40):
        return "hard"
    if correct >= thresholds.get("medium", 20):
        return "medium"
    return "easy"


def compute_balanced_progress(
    subject_correct: Dict[str, int],
    subjects: List[str],
    level_thresholds: Dict[str, int],
) -> dict:
    """
    Compute balanced progress level.
    All parameters come from database.
    """
    n_subjects = len(subjects)

    # Safe default when there are no subjects configured / available yet.
    if n_subjects == 0:
        return {
            "canLevelUp": False,
            "currentLevel": "New Kid",
            "nextLevel": None,
            "requiredPerSubject": 0,
            "subjectProgress": {},
            "message": "Keep practicing!",
        }

    min_correct = min(subject_correct.get(s, 0) for s in subjects)

    # If there are no thresholds (misconfigured DB), fall back safely.
    if not level_thresholds:
        return {
            "canLevelUp": False,
            "currentLevel": "New Kid",
            "nextLevel": None,
            "requiredPerSubject": 0,
            "subjectProgress": {
                s: {
                    "current": subject_correct.get(s, 0),
                    "required": 0,
                    "met": True,
                }
                for s in subjects
            },
            "message": "Keep practicing!",
        }

    levels_desc = sorted(level_thresholds.items(), key=lambda kv: kv[1], reverse=True)

    for level_name, threshold in levels_desc:
        # Skip threshold=0 levels when determining achieved level
        # "New Kid" (threshold=0) is the starting state, not a progression target
        if threshold == 0:
            continue
            
        required_per_subject = (threshold + n_subjects - 1) // n_subjects
        if min_correct >= required_per_subject:
            # Determine nextLevel (the one above current, in ascending order)
            levels_asc = sorted(level_thresholds.items(), key=lambda kv: kv[1])
            next_level = None
            for i, (ln, _) in enumerate(levels_asc):
                if ln == level_name and i < len(levels_asc) - 1:
                    next_level = levels_asc[i + 1][0]
                    break

            return {
                "canLevelUp": True,
                "currentLevel": level_name,
                "nextLevel": next_level,
                "requiredPerSubject": required_per_subject,
                "subjectProgress": {
                    s: {
                        "current": subject_correct.get(s, 0),
                        "required": required_per_subject,
                        "met": subject_correct.get(s, 0) >= required_per_subject,
                    }
                    for s in subjects
                },
                "message": f"Ready for {level_name}!",
            }

    # None matched => still "New Kid" (or lowest level). 
    # Find the first real level (smallest threshold > 0) for progress display.
    levels_asc = sorted(level_thresholds.items(), key=lambda kv: kv[1])
    # Filter out any levels with threshold 0 (like "New Kid")
    levels_asc_filtered = [(name, thresh) for name, thresh in levels_asc if thresh > 0]
    
    if levels_asc_filtered:
        next_level = levels_asc_filtered[0][0]
        required_per_subject = (levels_asc_filtered[0][1] + n_subjects - 1) // n_subjects
    else:
        # All thresholds are 0 (misconfigured DB) - fall back to 0
        next_level = None
        required_per_subject = 0

    return {
        "canLevelUp": False,
        "currentLevel": "New Kid",
        "nextLevel": next_level,
        "requiredPerSubject": required_per_subject,
        "subjectProgress": {
            s: {
                "current": subject_correct.get(s, 0),
                "required": required_per_subject,
                "met": subject_correct.get(s, 0) >= required_per_subject,
            }
            for s in subjects
        },
        "message": "Keep practicing!",
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
    effective_progress = min_correct * len(subjects)

    # Current threshold; if unknown current_level, treat as 0.
    current_threshold = level_thresholds.get(current_level, 0)

    sorted_levels = sorted(level_thresholds.items(), key=lambda kv: kv[1])

    # Find next level's threshold
    next_at = None
    for i, (level_name, threshold) in enumerate(sorted_levels):
        if level_name == current_level:
            if i < len(sorted_levels) - 1:
                next_at = sorted_levels[i + 1][1]
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
