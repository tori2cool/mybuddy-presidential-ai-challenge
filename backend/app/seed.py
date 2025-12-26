# backend/migrations/seed_progress.py
"""
Seed all progress-related data:
- subjects
- level thresholds
- difficulty thresholds
- points values
- achievements

Run after creating tables:
    alembic revision && alembic upgrade head
    python -m backend.migrations.seed_progress
"""

from sqlalchemy.ext.asyncio import AsyncSession
from app.db import engine
from app.models import (
    Subject,
    LevelThreshold,
    DifficultyThreshold,
    PointsValue,
    AchievementDefinition,
)
from sqlalchemy import select, text as sa_text, insert


# ========== SUBJECTS ==========
SUBJECTS_SEED = [
    {"id": "math", "name": "Math", "icon": "grid", "color": "#8B5CF6"},
    {"id": "science", "name": "Science", "icon": "zap", "color": "#10B981"},
    {"id": "reading", "name": "Reading", "icon": "book-open", "color": "#FB923C"},
    {"id": "history", "name": "History", "icon": "globe", "color": "#3B82F6"},
    # Add more later without code changes!
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
    # Special achievements (one-time milestones)
    {"id": "first_flashcard", "title": "Brain Starter", "description": "Complete your first flashcard", "icon": "zap", "type": "special"},
    {"id": "first_chore", "title": "Helper Bee", "description": "Complete your first chore", "icon": "check-circle", "type": "special"},
    {"id": "first_outdoor", "title": "Nature Explorer", "description": "Complete your first outdoor activity", "icon": "sun", "type": "special"},

    # Streak-based achievements
    {"id": "streak_3", "title": "On Fire!", "description": "Keep a 3-day streak", "icon": "flame", "type": "daily"},
    {"id": "streak_7", "title": "Super Star", "description": "Keep a 7-day streak", "icon": "star", "type": "weekly"},
    {"id": "streak_30", "title": "Champion", "description": "Keep a 30-day streak", "icon": "award", "type": "monthly"},

    # Points-based achievements
    {"id": "points_100", "title": "Rising Star", "description": "Earn 100 points", "icon": "trending-up", "type": "daily", "points_threshold": 100},
    {"id": "points_500", "title": "Superstar", "description": "Earn 500 points", "icon": "star", "type": "weekly", "points_threshold": 500},
    {"id": "points_2000", "title": "Legend", "description": "Earn 2000 points", "icon": "award", "type": "monthly", "points_threshold": 2000},

    # Activity count-based achievements
    {"id": "flashcards_10", "title": "Quick Learner", "description": "Complete 10 flashcards", "icon": "book", "type": "daily"},
    {"id": "flashcards_50", "title": "Knowledge Seeker", "description": "Complete 50 flashcards", "icon": "book-open", "type": "weekly"},
    {"id": "chores_7", "title": "Tidy Champion", "description": "Complete 7 chores", "icon": "home", "type": "weekly"},
    {"id": "outdoor_5", "title": "Adventure Kid", "description": "Complete 5 outdoor activities", "icon": "compass", "type": "weekly"},

    # Subject difficulty achievements
    {"id": "medium_math", "title": "Math Whiz", "description": "Reach Medium difficulty in Math", "icon": "grid", "type": "special"},
    {"id": "medium_science", "title": "Science Star", "description": "Reach Medium difficulty in Science", "icon": "zap", "type": "special"},
    {"id": "medium_reading", "title": "Bookworm", "description": "Reach Medium difficulty in Reading", "icon": "book-open", "type": "special"},
    {"id": "medium_history", "title": "History Buff", "description": "Reach Medium difficulty in History", "icon": "globe", "type": "special"},

    # Special achievements
    {"id": "hard_unlocked", "title": "Master Student", "description": "Reach Hard difficulty in any subject", "icon": "award", "type": "special"},
    {"id": "balanced_learner", "title": "Balanced Learner", "description": "Get 10+ correct in all subjects", "icon": "target", "type": "special"},
    {"id": "perfect_day", "title": "Perfect Day", "description": "Complete activities in all categories in one day", "icon": "sun", "type": "daily"},
]


# ========== SEEDING FUNCTIONS ==========

async def seed_subjects(conn):
    """Seed subjects."""
    existing = await conn.execute(select(Subject))
    if existing.rowcount > 0:
        print("Subjects already seeded. Skipping.")
        return

    insert_stmt = insert(Subject).values(SUBJECTS_SEED)
    await conn.execute(insert_stmt)
    print(f"Seeded {len(SUBJECTS_SEED)} subjects.")


async def seed_level_thresholds(conn):
    """Seed level thresholds."""
    existing = await conn.execute(select(LevelThreshold))
    if existing.rowcount > 0:
        print("Level thresholds already seeded. Skipping.")
        return

    insert_stmt = insert(LevelThreshold).values(LEVEL_THRESHOLDS_SEED)
    await conn.execute(insert_stmt)
    print(f"Seeded {len(LEVEL_THRESHOLDS_SEED)} level thresholds.")


async def seed_difficulty_thresholds(conn):
    """Seed difficulty thresholds."""
    existing = await conn.execute(select(DifficultyThreshold))
    if existing.rowcount > 0:
        print("Difficulty thresholds already seeded. Skipping.")
        return

    insert_stmt = insert(DifficultyThreshold).values(DIFFICULTY_THRESHOLDS_SEED)
    await conn.execute(insert_stmt)
    print(f"Seeded {len(DIFFICULTY_THRESHOLDS_SEED)} difficulty thresholds.")


async def seed_points_values(conn):
    """Seed points values."""
    existing = await conn.execute(select(PointsValue))
    if existing.rowcount > 0:
        print("Points values already seeded. Skipping.")
        return

    insert_stmt = insert(PointsValue).values(POINTS_VALUES_SEED)
    await conn.execute(insert_stmt)
    print(f"Seeded {len(POINTS_VALUES_SEED)} points values.")


async def seed_achievements(conn):
    """Seed achievements."""
    existing_ids = await conn.execute(
        select(AchievementDefinition.id).where(
            AchievementDefinition.id.in_([a["id"] for a in ACHIEVEMENTS_SEED])
        )
    )
    if existing_ids.rowcount > 0:
        print("Achievements already seeded. Skipping.")
        return

    insert_stmt = insert(AchievementDefinition).values(ACHIEVEMENTS_SEED)
    await conn.execute(insert_stmt)
    print(f"Seeded {len(ACHIEVEMENTS_SEED)} achievements.")


# ========== MAIN SEED ==========
async def seed():
    """Seed all progress data."""
    print("Seeding progress data...")

    async with engine.begin() as conn:
        await seed_subjects(conn)
        await seed_level_thresholds(conn)
        await seed_difficulty_thresholds(conn)
        await seed_points_values(conn)
        await seed_achievements(conn)

        await conn.commit()

    print("Done!")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())