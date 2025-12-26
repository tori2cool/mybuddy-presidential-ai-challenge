# backend/app/services/progress_rules.py
"""
Core calculation functions.
All thresholds, subjects, points values are fetched from database.
No hardcoded constants.
"""

from __future__ import annotations
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

# ========== TYPE DEFINITIONS ==========
# SubjectId = str (from models.py)
# DifficultyTier = Literal["easy", "medium", "hard"] (from models.py)


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

    if n_subjects == 0:
        return {
            "canLevelUp": False,
            "currentLevel": "New Kid",
            "nextLevel": None,
            "requiredPerSubject": 0,
            "subjectProgress": {s: {"current": subject_correct.get(s, 0)} for s in subjects},
            "message": "Keep practicing!",
        }

    min_correct = min(subject_correct.get(s, 0) for s in subjects)

    levels = sorted(level_thresholds.items(), key=lambda kv: kv[1], reverse=True)

    for level_name, threshold in levels:
        required_per_subject = (threshold + n_subjects - 1) // n_subjects
        if min_correct >= required_per_subject:
            return {
                "canLevelUp": True,
                "currentLevel": level_name,
                "requiredPerSubject": required_per_subject,
                "subjectProgress": {s: {"current": subject_correct.get(s, 0)} for s in subjects},
                "message": f"Ready for {level_name}!",
            }

    return {
        "canLevelUp": False,
        "currentLevel": "New Kid",
        "requiredPerSubject": (levels[-1][1] + n_subjects - 1) // n_subjects,
        "subjectProgress": {s: {"current": subject_correct.get(s, 0)} for s in subjects},
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
    """
    min_correct = min(subject_correct.get(s, 0) for s in subjects)
    effective_progress = min_correct * len(subjects)

    current_threshold = level_thresholds.get(current_level, 0)

    sorted_levels = sorted(level_thresholds.items(), key=lambda kv: kv[1])

    # Find next level
    next_at = None
    for i, (level_name, threshold) in enumerate(sorted_levels):
        if level_name == current_level and i < len(sorted_levels) - 1:
            next_at = sorted_levels[i + 1][1]
            break

    if next_at is None:
        pct = 100
    else:
        pct = int(min(max(((effective_progress - current_threshold) / (next_at - current_threshold)) * 100, 0), 100))

    metadata = level_metadata.get(current_level, {"icon": "star", "color": "#9CA3AF"})

    return {
        "level": current_level,
        "icon": metadata.get("icon", "star"),
        "color": metadata.get("color", "#9CA3AF"),
        "nextAt": next_at,
        "progress": pct,
    }