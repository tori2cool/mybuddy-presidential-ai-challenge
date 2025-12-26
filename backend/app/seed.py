"""
Seed all progress-related data:
- subjects
- level thresholds
- difficulty thresholds
- points values
- achievements
- affirmations (optional)

Run (inside container or venv):
    alembic upgrade head
    python -m app.seed
"""

from __future__ import annotations

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert

from app.db import engine
from app.models import (
    Subject,
    LevelThreshold,
    DifficultyThreshold,
    PointsValue,
    AchievementDefinition,
    Affirmation,
)

# ========== SUBJECTS ==========
SUBJECTS_SEED = [
    {"id": "math", "name": "Math", "icon": "grid", "color": "#8B5CF6"},
    {"id": "science", "name": "Science", "icon": "zap", "color": "#10B981"},
    {"id": "reading", "name": "Reading", "icon": "book-open", "color": "#FB923C"},
    {"id": "history", "name": "History", "icon": "globe", "color": "#3B82F6"},
]

# ========== LEVEL THRESHOLDS ==========
LEVEL_THRESHOLDS_SEED = [
    {"level_name": "New Kid", "threshold": 0, "icon": "user", "color": "#9CA3AF"},
    {"level_name": "Good Kid", "threshold": 50, "icon": "smile", "color": "#FB923C"},
    {"level_name": "Great Kid", "threshold": 200, "icon": "thumbs-up", "color": "#10B981"},
    {"level_name": "Awesome Kid", "threshold": 500, "icon": "sun", "color": "#3B82F6"},
    {"level_name": "Amazing Kid", "threshold": 1000, "icon": "award", "color": "#8B5CF6"},
    {"level_name": "Super Star Kid", "threshold": 2000, "icon": "star", "color": "#F59E0B"},
]

# ========== DIFFICULTY THRESHOLDS ==========
DIFFICULTY_THRESHOLDS_SEED = [
    {"difficulty": "easy", "threshold": 0},
    {"difficulty": "medium", "threshold": 20},
    {"difficulty": "hard", "threshold": 40},
]

# ========== POINTS VALUES ==========
POINTS_VALUES_SEED = [
    {"activity": "flashcard_correct", "points": 10},
    {"activity": "flashcard_wrong", "points": 2},
    {"activity": "chore_completed", "points": 15},
    {"activity": "outdoor_completed", "points": 20},
    {"activity": "affirmation_viewed", "points": 5},
]

# ========== ACHIEVEMENTS ==========
ACHIEVEMENTS_SEED = [
    {"id": "first_flashcard", "title": "Brain Starter", "description": "Complete your first flashcard", "icon": "zap", "type": "special"},
    {"id": "first_chore", "title": "Helper Bee", "description": "Complete your first chore", "icon": "check-circle", "type": "special"},
    {"id": "first_outdoor", "title": "Nature Explorer", "description": "Complete your first outdoor activity", "icon": "sun", "type": "special"},
    {"id": "streak_3", "title": "On Fire!", "description": "Keep a 3-day streak", "icon": "flame", "type": "daily"},
    {"id": "streak_7", "title": "Super Star", "description": "Keep a 7-day streak", "icon": "star", "type": "weekly"},
    {"id": "streak_30", "title": "Champion", "description": "Keep a 30-day streak", "icon": "award", "type": "monthly"},
    {"id": "points_100", "title": "Rising Star", "description": "Earn 100 points", "icon": "trending-up", "type": "daily", "points_threshold": 100},
    {"id": "points_500", "title": "Superstar", "description": "Earn 500 points", "icon": "star", "type": "weekly", "points_threshold": 500},
    {"id": "points_2000", "title": "Legend", "description": "Earn 2000 points", "icon": "award", "type": "monthly", "points_threshold": 2000},
    {"id": "flashcards_10", "title": "Quick Learner", "description": "Complete 10 flashcards", "icon": "book", "type": "daily"},
    {"id": "flashcards_50", "title": "Knowledge Seeker", "description": "Complete 50 flashcards", "icon": "book-open", "type": "weekly"},
    {"id": "chores_7", "title": "Tidy Champion", "description": "Complete 7 chores", "icon": "home", "type": "weekly"},
    {"id": "outdoor_5", "title": "Adventure Kid", "description": "Complete 5 outdoor activities", "icon": "compass", "type": "weekly"},
    {"id": "medium_math", "title": "Math Whiz", "description": "Reach Medium difficulty in Math", "icon": "grid", "type": "special"},
    {"id": "medium_science", "title": "Science Star", "description": "Reach Medium difficulty in Science", "icon": "zap", "type": "special"},
    {"id": "medium_reading", "title": "Bookworm", "description": "Reach Medium difficulty in Reading", "icon": "book-open", "type": "special"},
    {"id": "medium_history", "title": "History Buff", "description": "Reach Medium difficulty in History", "icon": "globe", "type": "special"},
    {"id": "hard_unlocked", "title": "Master Student", "description": "Reach Hard difficulty in any subject", "icon": "award", "type": "special"},
    {"id": "balanced_learner", "title": "Balanced Learner", "description": "Get 10+ correct in all subjects", "icon": "target", "type": "special"},
    {"id": "perfect_day", "title": "Perfect Day", "description": "Complete activities in all categories in one day", "icon": "sun", "type": "daily"},
]

# ========== AFFIRMATIONS (OPTIONAL) ==========
AFFIRMATIONS_SEED = [
    {"id": "1", "text": "I can do hard things.", "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6"},
    {"id": "2", "text": "I am learning every day.", "gradient_0": "#10B981", "gradient_1": "#3B82F6"},
    {"id": "3", "text": "I’m proud of my effort.", "gradient_0": "#FB923C", "gradient_1": "#F59E0B"},
]


async def _seed_bulk(conn, model, rows, label: str) -> None:
    if not rows:
        print(f"{label}: no seed rows provided. Skipping.")
        return
    stmt = insert(model).values(rows).on_conflict_do_nothing()
    await conn.execute(stmt)
    print(f"{label}: ensured {len(rows)} rows.")


async def seed() -> None:
    print("Seeding progress data...")

    async with engine.begin() as conn:
        await _seed_bulk(conn, Subject, SUBJECTS_SEED, "Subjects")
        await _seed_bulk(conn, LevelThreshold, LEVEL_THRESHOLDS_SEED, "Level thresholds")
        await _seed_bulk(conn, DifficultyThreshold, DIFFICULTY_THRESHOLDS_SEED, "Difficulty thresholds")
        await _seed_bulk(conn, PointsValue, POINTS_VALUES_SEED, "Points values")
        await _seed_bulk(conn, AchievementDefinition, ACHIEVEMENTS_SEED, "Achievements")
        await _seed_bulk(conn, Affirmation, AFFIRMATIONS_SEED, "Affirmations")

    print("Done!")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())
