"""
Seed all progress-related data (UUID-first, no legacy `key` fields).

Seeds:
- avatars
- interests
- age ranges
- subjects
- subject<->age-range mappings
- level thresholds
- difficulty thresholds
- points values
- achievements
- flashcards
- affirmations
- chores
- outdoor activities

Run (inside container or venv):
    alembic upgrade head
    python -m app.seed
"""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from app.db import get_engine

logger = logging.getLogger(__name__)

from app.models import (
    AgeRange,
    Affirmation,
    AchievementDefinition,
    Avatar,
    Chore,
    DifficultyThreshold,
    Flashcard,
    Interest,
    LevelThreshold,
    OutdoorActivity,
    PointsValue,
    Subject,
    SubjectAgeRange,
)

# Ensure we only seed data once.

async def db_looks_empty(conn) -> bool:
    """
    Return True only if the DB appears empty (no seeded baseline data).

    Uses `subjects` as an anchor table (it's part of baseline seed).

    Robustness requirements:
    - If the table doesn't exist yet (e.g., very early startup), treat as empty.
    - If the check query fails for any reason, log and treat as empty.
    """
    try:
        # Use EXISTS for a cheap emptiness probe.
        exists_row = await conn.scalar(text("SELECT EXISTS (SELECT 1 FROM subjects LIMIT 1)"))
        return not bool(exists_row)
    except Exception as exc:  # missing table / permissions / etc
        logger.info("Seed emptiness check failed; treating DB as empty and continuing.")
        logger.debug("Seed emptiness check exception", exc_info=exc)
        return True

# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

_slug_re = re.compile(r"[^a-z0-9]+")
_dash_re = re.compile(r"-{2,}")


def slugify(text: str, *, max_len: int = 80, fallback: str = "item") -> str:
    """
    Stable "code" generator:
    - NFKD normalize, drop accents
    - lowercase
    - non [a-z0-9] -> '-'
    - collapse/trim dashes
    """
    s = (text or "").strip()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower()
    s = _slug_re.sub("-", s).strip("-")
    s = _dash_re.sub("-", s)
    if not s:
        s = fallback
    return s[:max_len].rstrip("-")


def age_range_code(min_age: int, max_age: int | None) -> str:
    # stable, readable codes
    if max_age is None:
        return f"age_{min_age}_plus"
    return f"age_{min_age}_{max_age}"


async def _seed_bulk(
    conn,
    model,
    rows: list[dict[str, Any]],
    label: str,
    *,
    conflict_cols: list[str],
) -> None:
    """Idempotent insert (ON CONFLICT DO NOTHING)."""
    if not rows:
        print(f"{label}: no seed rows provided. Skipping.")
        return

    stmt = insert(model).values(rows).on_conflict_do_nothing(index_elements=conflict_cols)
    await conn.execute(stmt)
    print(f"{label}: ensured {len(rows)} rows.")


async def _fetch_map(conn, model, key_col, val_col) -> dict[Any, Any]:
    rows = (await conn.execute(select(key_col, val_col))).all()
    return {k: v for (k, v) in rows}


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

# ========== AVATARS ==========
AVATARS_SEED = [
    {"name": "astronaut", "image_path": "avatars/astronaut_avatar.webp"},
    {"name": "artist", "image_path": "avatars/artist_avatar.webp"},
    {"name": "athlete", "image_path": "avatars/athlete_avatar.webp"},
    {"name": "explorer", "image_path": "avatars/explorer_avatar.webp"},
    {"name": "scientist", "image_path": "avatars/scientist_avatar.webp"},
    {"name": "musician", "image_path": "avatars/musician_avatar.webp"},
]

# ========== INTERESTS ==========
INTERESTS_SEED = [
    {"name": "animals", "label": "Animals", "icon": "🐾"},
    {"name": "trucks", "label": "Monster Trucks", "icon": "🚚"},
    {"name": "ponies", "label": "Ponies", "icon": "🐴"},
    {"name": "dinosaurs", "label": "Dinosaurs", "icon": "🦕"},
    {"name": "sports", "label": "Sports", "icon": "⚽"},
    {"name": "horseback", "label": "Horseback Riding", "icon": "🏇"},
    {"name": "space", "label": "Space", "icon": "🚀"},
    {"name": "art", "label": "Art", "icon": "🎨"},
]

# ========== AGE RANGES ==========
AGE_RANGES_SEED = [
    {"name": "Preschool", "min_age": 3, "max_age": 5},
    {"name": "Early Elementary", "min_age": 6, "max_age": 8},
    {"name": "Late Elementary", "min_age": 9, "max_age": 12},
    {"name": "Teen", "min_age": 13, "max_age": None},
]

# ========== SUBJECTS ==========
SUBJECTS_SEED = [
    {"name": "Math", "icon": "grid", "color": "#8B5CF6"},
    {"name": "Science", "icon": "zap", "color": "#10B981"},
    {"name": "Reading", "icon": "book-open", "color": "#FB923C"},
    {"name": "History", "icon": "globe", "color": "#3B82F6"},
]

# ========== SUBJECT_AGE_RANGES ==========
SUBJECT_AGE_RANGES_SEED = [
    # Math - all ages
    {"subject_name": "Math", "age_range": "Preschool"},
    {"subject_name": "Math", "age_range": "Early Elementary"},
    {"subject_name": "Math", "age_range": "Late Elementary"},
    {"subject_name": "Math", "age_range": "Teen"},
    # Science - all ages
    {"subject_name": "Science", "age_range": "Preschool"},
    {"subject_name": "Science", "age_range": "Early Elementary"},
    {"subject_name": "Science", "age_range": "Late Elementary"},
    {"subject_name": "Science", "age_range": "Teen"},
    # Reading - Early Elementary and up
    {"subject_name": "Reading", "age_range": "Early Elementary"},
    {"subject_name": "Reading", "age_range": "Late Elementary"},
    {"subject_name": "Reading", "age_range": "Teen"},
    # History - Early Elementary and up
    {"subject_name": "History", "age_range": "Early Elementary"},
    {"subject_name": "History", "age_range": "Late Elementary"},
    {"subject_name": "History", "age_range": "Teen"},
]

# ========== LEVEL THRESHOLDS ==========
LEVEL_THRESHOLDS_SEED = [
    {"name": "New Kid", "threshold": 0, "icon": "user", "color": "#9CA3AF"},
    {"name": "Good Kid", "threshold": 50, "icon": "smile", "color": "#FB923C"},
    {"name": "Great Kid", "threshold": 200, "icon": "thumbs-up", "color": "#10B981"},
    {"name": "Awesome Kid", "threshold": 500, "icon": "sun", "color": "#3B82F6"},
    {"name": "Amazing Kid", "threshold": 1000, "icon": "award", "color": "#8B5CF6"},
    {"name": "Super Star Kid", "threshold": 2000, "icon": "star", "color": "#F59E0B"},
]

# ========== DIFFICULTY THRESHOLDS ==========
DIFFICULTY_THRESHOLDS_SEED = [
    {"code": "easy", "name": "Beginner", "threshold": 0, "label": "Beginner", "icon": "smile", "color": "#10B981"},
    {"code": "medium", "name": "Intermediate", "threshold": 20, "label": "Intermediate", "icon": "zap", "color": "#F59E0B"},
    {"code": "hard", "name": "Advamced", "threshold": 40, "label": "Advanced", "icon": "award", "color": "#EF4444"},
]

# ========== POINTS VALUES ==========
# model requires: code + name (both unique) + points
POINTS_VALUES_SEED = [
    {"code": "flashcard_correct", "name": "Flashcard Correct", "points": 10},
    {"code": "flashcard_wrong", "name": "Flashcard Wrong", "points": 2},
    {"code": "chore_completed", "name": "Chore Completed", "points": 15},
    {"code": "outdoor_completed", "name": "Outdoor Completed", "points": 20},
    {"code": "affirmation_viewed", "name": "Affirmation Viewed", "points": 5},
]

# ========== ACHIEVEMENTS ==========
# model requires: code + title (etc)
ACHIEVEMENTS_SEED = [
    {"title": "Brain Starter", "description": "Complete your first flashcard", "icon": "zap", "achievement_type": "special", "flashcards_count_threshold": 1, "points_threshold": None, "streak_days_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Helper Bee", "description": "Complete your first chore", "icon": "check-circle", "achievement_type": "special", "chores_count_threshold": 1, "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Nature Explorer", "description": "Complete your first outdoor activity", "icon": "sun", "achievement_type": "special", "outdoor_count_threshold": 1, "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None},
    {"title": "On Fire!", "description": "Keep a 3-day streak", "icon": "flame", "achievement_type": "daily", "streak_days_threshold": 3, "points_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Super Star", "description": "Keep a 7-day streak", "icon": "star", "achievement_type": "weekly", "streak_days_threshold": 7, "points_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Champion", "description": "Keep a 30-day streak", "icon": "award", "achievement_type": "monthly", "streak_days_threshold": 30, "points_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Rising Star", "description": "Earn 100 points", "icon": "trending-up", "achievement_type": "daily", "points_threshold": 100, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Superstar", "description": "Earn 500 points", "icon": "star", "achievement_type": "weekly", "points_threshold": 500, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Legend", "description": "Earn 2000 points", "icon": "award", "achievement_type": "monthly", "points_threshold": 2000, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Quick Learner", "description": "Complete 10 flashcards", "icon": "book", "achievement_type": "daily", "flashcards_count_threshold": 10, "points_threshold": None, "streak_days_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Knowledge Seeker", "description": "Complete 50 flashcards", "icon": "book-open", "achievement_type": "weekly", "flashcards_count_threshold": 50, "points_threshold": None, "streak_days_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Tidy Champion", "description": "Complete 7 chores", "icon": "home", "achievement_type": "weekly", "chores_count_threshold": 7, "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Adventure Kid", "description": "Complete 5 outdoor activities", "icon": "compass", "achievement_type": "weekly", "outdoor_count_threshold": 5, "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None},
    {"title": "Math Whiz", "description": "Reach Medium difficulty in Math", "icon": "grid", "achievement_type": "special", "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Science Star", "description": "Reach Medium difficulty in Science", "icon": "zap", "achievement_type": "special", "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Bookworm", "description": "Reach Medium difficulty in Reading", "icon": "book-open", "achievement_type": "special", "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "History Buff", "description": "Reach Medium difficulty in History", "icon": "globe", "achievement_type": "special", "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Master Student", "description": "Reach Hard difficulty in any subject", "icon": "award", "achievement_type": "special", "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Balanced Learner", "description": "Get 10+ correct in all subjects", "icon": "target", "achievement_type": "special", "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
    {"title": "Perfect Day", "description": "Complete activities in all categories in one day", "icon": "sun", "achievement_type": "daily", "points_threshold": None, "streak_days_threshold": None, "flashcards_count_threshold": None, "chores_count_threshold": None, "outdoor_count_threshold": None},
]

# ========== FLASHCARDS ==========
FLASHCARDS_SEED = [
    # ----------------------------
    # Math - Easy (Preschool / ages 3-5)
    # ----------------------------
    {"subject":"Math", "age_range": "Preschool", "question":"Look at the lions 🦁🦁🦁 standing together and count them — how many lions are there?","answer":"3","acceptable_answers":["3","three"],"difficulty":"easy","tags":["math","counting","animals"]},
    {"subject":"Math", "age_range": "Preschool", "question":"A monster truck 🚚🚚🚚🚚 is parked in a row — how many monster trucks are there?","answer":"4","acceptable_answers":["4","four"],"difficulty":"easy","tags":["math","counting","trucks"]},
    {"subject":"Math", "age_range": "Preschool", "question":"You see ponies 🐴🐴🐴 walking together in a field — how many ponies are there?","answer":"3","acceptable_answers":["3","three"],"difficulty":"easy","tags":["math","counting","ponies"]},
    {"subject":"Math", "age_range": "Preschool", "question":"A friendly dinosaur 🦕 stands next to another dinosaur 🦕 — how many dinosaurs are there?","answer":"2","acceptable_answers":["2","two"],"difficulty":"easy","tags":["math","counting","dinosaurs"]},
    {"subject":"Math", "age_range": "Preschool", "question":"At a sports game ⚽⚽, you see balls on the field — how many balls are there?","answer":"2","acceptable_answers":["2","two"],"difficulty":"easy","tags":["math","counting","sports"]},
    # ----------------------------
    # Science - Easy (Preschool / ages 3-5)
    # ----------------------------
    {"subject":"Science", "age_range": "Preschool", "question":"Which animal 🐱 says 'meow' when it wants attention?","answer":"Cat","acceptable_answers":["cat","a cat"],"difficulty":"easy","tags":["science","animals"]},
    {"subject":"Science", "age_range": "Preschool", "question":"A dinosaur 🦕 has strong feet — does it have claws or shoes?","answer":"Claws","acceptable_answers":["claws"],"difficulty":"easy","tags":["science","dinosaurs"]},
    {"subject":"Science", "age_range": "Preschool", "question":"When a rocket 🚀 flies up into the sky, what color is the sky?","answer":"Blue","acceptable_answers":["blue"],"difficulty":"easy","tags":["science","space"]},
    {"subject":"Science", "age_range": "Preschool", "question":"In art time 🎨, what do you use to paint a picture on paper?","answer":"Paint","acceptable_answers":["paint"],"difficulty":"easy","tags":["science","art"]},
    {"subject":"Science", "age_range": "Preschool", "question":"When horseback riding 🏇, what animal do you sit on?","answer":"Horse","acceptable_answers":["horse","a horse"],"difficulty":"easy","tags":["science","horseback"]},
    # ----------------------------
    # Reading - Easy (Preschool / ages 3-5)
    # ----------------------------
    {"subject":"Reading", "age_range": "Preschool", "question":"Which word names an animal 🐶 — dog or run?","answer":"Dog","acceptable_answers":["dog"],"difficulty":"easy","tags":["reading","vocabulary","animals"]},
    {"subject":"Reading", "age_range": "Preschool", "question":"The word dinosaur 🦕 starts with which letter?","answer":"D","acceptable_answers":["d"],"difficulty":"easy","tags":["reading","letters","dinosaurs"]},
    {"subject":"Reading", "age_range": "Preschool", "question":"Which word is a color you might use in art 🎨 — red or jump?","answer":"Red","acceptable_answers":["red"],"difficulty":"easy","tags":["reading","vocabulary","art"]},
    {"subject":"Reading", "age_range": "Preschool", "question":"Which word names something you can see in space 🌟 — star or eat?","answer":"Star","acceptable_answers":["star"],"difficulty":"easy","tags":["reading","vocabulary","space"]},
    {"subject":"Reading", "age_range": "Preschool", "question":"Which word names a vehicle 🚚 — truck or sleep?","answer":"Truck","acceptable_answers":["truck"],"difficulty":"easy","tags":["reading","vocabulary","trucks"]},

    # ----------------------------
    # Math - Easy (Early Elementary / ages 6-8)
    # ----------------------------
    {"subject": "Math", "age_range": "Early Elementary", "question": "A dinosaur ate 9 leaves and then 8 more. How many leaves is that? 🦕", "answer": "17", "acceptable_answers": ["17", "seventeen"], "difficulty": "easy", "tags": ["math", "addition", "dinosaurs"]},
    {"subject": "Math", "age_range": "Early Elementary", "question": "A pony had 14 apples and ate 6. How many apples are left? 🐴", "answer": "8", "acceptable_answers": ["8", "eight"], "difficulty": "easy", "tags": ["math", "subtraction", "ponies"]},
    {"subject": "Math", "age_range": "Early Elementary", "question": "There are 6 monster trucks with 7 flags each. How many flags total? 🚚", "answer": "42", "acceptable_answers": ["42", "forty two", "forty-two"], "difficulty": "easy", "tags": ["math", "multiplication", "trucks"]},
    {"subject": "Math", "age_range": "Early Elementary", "question": "An astronaut shares 36 space snacks among 6 crew members. How many each? 🚀", "answer": "6", "acceptable_answers": ["6", "six"], "difficulty": "easy", "tags": ["math", "division", "space"]},
    {"subject": "Math", "age_range": "Early Elementary", "question": "You have 10 animal stickers and give 3 away. How many are left? 🐾", "answer": "7", "acceptable_answers": ["7", "seven"], "difficulty": "easy", "tags": ["math", "word-problems", "animals"]},

    # ----------------------------
    # Science - Easy (Early Elementary / ages 6-8)
    # ----------------------------
    {"subject": "Science", "age_range": "Early Elementary", "question": "What do plants need from the Sun to grow in a backyard with animals? 🐾", "answer": "Sunlight", "acceptable_answers": ["sunlight", "light"], "difficulty": "easy", "tags": ["science", "plants", "animals"]},
    {"subject": "Science", "age_range": "Early Elementary", "question": "What gas do plants breathe in on a pony ranch? 🐴", "answer": "Carbon dioxide", "acceptable_answers": ["carbon dioxide", "co2"], "difficulty": "easy", "tags": ["science", "plants", "ponies"]},
    {"subject": "Science", "age_range": "Early Elementary", "question": "What part of a plant usually grows underground near dinosaur bones? 🦕", "answer": "Roots", "acceptable_answers": ["roots", "root"], "difficulty": "easy", "tags": ["science", "plants", "dinosaurs"]},
    {"subject": "Science", "age_range": "Early Elementary", "question": "What force pulls things toward Earth, even an astronaut's backpack? 🚀", "answer": "Gravity", "acceptable_answers": ["gravity"], "difficulty": "easy", "tags": ["science", "physics", "space"]},
    {"subject": "Science", "age_range": "Early Elementary", "question": "What do we call an animal that eats only plants, like some dinosaurs? 🦕", "answer": "Herbivore", "acceptable_answers": ["herbivore", "a herbivore"], "difficulty": "easy", "tags": ["science", "animals", "dinosaurs"]},

    # ----------------------------
    # Reading - Easy (Early Elementary / ages 6-8)
    # ----------------------------
    {"subject": "Reading", "age_range": "Early Elementary", "question": "In a story about animals, what is a noun? 🐾", "answer": "A person, place, or thing", "acceptable_answers": ["person place or thing", "a person place or thing", "a person, place, or thing"], "difficulty": "easy", "tags": ["reading", "grammar", "animals"]},
    {"subject": "Reading", "age_range": "Early Elementary", "question": "What is the plural of 'mouse' in a pony story? 🐴", "answer": "Mice", "acceptable_answers": ["mice"], "difficulty": "easy", "tags": ["reading", "grammar", "ponies"]},
    {"subject": "Reading", "age_range": "Early Elementary", "question": "What do we call the beginning of a story about dinosaurs? 🦕", "answer": "Beginning", "acceptable_answers": ["beginning", "start"], "difficulty": "easy", "tags": ["reading", "comprehension", "dinosaurs"]},
    {"subject": "Reading", "age_range": "Early Elementary", "question": "What is a synonym (a word with the same meaning) in an art description? 🎨", "answer": "A word with the same meaning", "acceptable_answers": ["same meaning", "a word with the same meaning", "a word that means the same"], "difficulty": "easy", "tags": ["reading", "vocabulary", "art"]},
    {"subject": "Reading", "age_range": "Early Elementary", "question": "What punctuation ends a sentence about monster trucks? 🚚", "answer": "Period", "acceptable_answers": ["period", "."], "difficulty": "easy", "tags": ["reading", "grammar", "trucks"]},

    # ----------------------------
    # History - Easy (Early Elementary / ages 6-8)
    # ----------------------------
    {"subject": "History", "age_range": "Early Elementary", "question": "What country is known for building the Great Wall (often shown in art)? 🎨", "answer": "China", "acceptable_answers": ["china"], "difficulty": "easy", "tags": ["history", "ancient", "art"]},
    {"subject": "History", "age_range": "Early Elementary", "question": "Who were the Pilgrims (people who traveled to America for a new life)? 🚀", "answer": "People who traveled to America for a new life", "acceptable_answers": ["people who traveled to america", "people who came to america", "travelers to america"], "difficulty": "easy", "tags": ["history", "america", "space"]},
    {"subject": "History", "age_range": "Early Elementary", "question": "What is the name of the U.S. flag you might see at sports games? ⚽", "answer": "Stars and Stripes", "acceptable_answers": ["stars and stripes", "the stars and stripes"], "difficulty": "easy", "tags": ["history", "america", "sports"]},
    {"subject": "History", "age_range": "Early Elementary", "question": "What do we call a person who explores new places, like space? 🚀", "answer": "Explorer", "acceptable_answers": ["explorer", "an explorer"], "difficulty": "easy", "tags": ["history", "vocabulary", "space"]},
    {"subject": "History", "age_range": "Early Elementary", "question": "What continent is Egypt in (home to amazing animal art)? 🐾", "answer": "Africa", "acceptable_answers": ["africa"], "difficulty": "easy", "tags": ["history", "geography", "animals"]},

    # ----------------------------
    # Math - Easy (Late Elementary / ages 9-12)
    # ----------------------------
    {"subject": "Math", "age_range": "Late Elementary", "question": "A soccer team practices 12 drills, 8 times. How many drills is that? ⚽", "answer": "96", "acceptable_answers": ["96", "ninety six", "ninety-six"], "difficulty": "easy", "tags": ["math", "multiplication", "sports"]},
    {"subject": "Math", "age_range": "Late Elementary", "question": "A monster truck show has 84 tickets to split into 7 groups. How many per group? 🚚", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "division", "trucks"]},
    {"subject": "Math", "age_range": "Late Elementary", "question": "A space museum sells 250 stickers and 175 more later. How many total? 🚀", "answer": "425", "acceptable_answers": ["425", "four hundred twenty five", "four hundred twenty-five"], "difficulty": "easy", "tags": ["math", "addition", "space"]},
    {"subject": "Math", "age_range": "Late Elementary", "question": "A dinosaur exhibit had 300 visitors, then 128 left. How many are still there? 🦕", "answer": "172", "acceptable_answers": ["172", "one hundred seventy two", "one hundred seventy-two"], "difficulty": "easy", "tags": ["math", "subtraction", "dinosaurs"]},
    {"subject": "Math", "age_range": "Late Elementary", "question": "An art notebook costs $3. How much do 7 art notebooks cost? 🎨", "answer": "21", "acceptable_answers": ["21", "$21", "twenty one", "twenty-one"], "difficulty": "easy", "tags": ["math", "word-problems", "art"]},

    # ----------------------------
    # Science - Easy (Late Elementary / ages 9-12)
    # ----------------------------
    {"subject": "Science", "age_range": "Late Elementary", "question": "After a sunny horseback ride, a puddle dries up. What is water turning into vapor called? 🏇", "answer": "Evaporation", "acceptable_answers": ["evaporation"], "difficulty": "easy", "tags": ["science", "earth-science", "horseback"]},
    {"subject": "Science", "age_range": "Late Elementary", "question": "In space, what is the center of the solar system? 🚀", "answer": "The Sun", "acceptable_answers": ["sun"], "difficulty": "easy", "tags": ["science", "space", "space"]},
    {"subject": "Science", "age_range": "Late Elementary", "question": "If a sports drink gets cold enough to become solid, what is that change called? ⚽", "answer": "Freezing", "acceptable_answers": ["freezing"], "difficulty": "easy", "tags": ["science", "states-of-matter", "sports"]},
    {"subject": "Science", "age_range": "Late Elementary", "question": "What organ pumps blood through your body when you run and play sports? ⚽", "answer": "Heart", "acceptable_answers": ["heart"], "difficulty": "easy", "tags": ["science", "biology", "sports"]},
    {"subject": "Science", "age_range": "Late Elementary", "question": "What is an animal with a backbone called, like many animals you can pet? 🐾", "answer": "Vertebrate", "acceptable_answers": ["vertebrate", "a vertebrate"], "difficulty": "easy", "tags": ["science", "biology", "animals"]},

    # ----------------------------
    # Reading - Easy (Late Elementary / ages 9-12)
    # ----------------------------
    {"subject": "Reading", "age_range": "Late Elementary", "question": "If a paragraph is about dinosaurs, what is the main idea? 🦕", "answer": "What the text is mostly about", "acceptable_answers": ["what it's mostly about", "what the text is mostly about", "main point"], "difficulty": "easy", "tags": ["reading", "comprehension", "dinosaurs"]},
    {"subject": "Reading", "age_range": "Late Elementary", "question": "In a story about monster trucks, what is a sentence fragment? 🚚", "answer": "An incomplete sentence", "acceptable_answers": ["incomplete sentence", "an incomplete sentence"], "difficulty": "easy", "tags": ["reading", "grammar", "trucks"]},
    {"subject": "Reading", "age_range": "Late Elementary", "question": "In a space adventure story, what do we call hints about what will happen next? 🚀", "answer": "Foreshadowing", "acceptable_answers": ["foreshadowing"], "difficulty": "easy", "tags": ["reading", "literature", "space"]},
    {"subject": "Reading", "age_range": "Late Elementary", "question": "In an art club flyer, what is a compound word? 🎨", "answer": "Two words put together", "acceptable_answers": ["two words together", "two words put together"], "difficulty": "easy", "tags": ["reading", "vocabulary", "art"]},
    {"subject": "Reading", "age_range": "Late Elementary", "question": "After writing about animals, what is the purpose of a conclusion paragraph? 🐾", "answer": "To wrap up the main points", "acceptable_answers": ["wrap up", "wrap up the main points", "summarize"], "difficulty": "easy", "tags": ["reading", "writing", "animals"]},

    # ----------------------------
    # History - Easy (Late Elementary / ages 9-12)
    # ----------------------------
    {"subject": "History", "age_range": "Late Elementary", "question": "In American history, what was the purpose of the Underground Railroad? 🐾", "answer": "To help enslaved people escape", "acceptable_answers": ["help enslaved people escape", "help escape slavery", "escape slavery"], "difficulty": "easy", "tags": ["history", "america", "animals"]},
    {"subject": "History", "age_range": "Late Elementary", "question": "What document begins with 'We the People' and is important for how we vote in sports teams' towns? ⚽", "answer": "The U.S. Constitution", "acceptable_answers": ["constitution", "the constitution", "u.s. constitution", "us constitution"], "difficulty": "easy", "tags": ["history", "america", "sports"]},
    {"subject": "History", "age_range": "Late Elementary", "question": "What invention helped spread books faster in Europe, including art books? 🎨", "answer": "Printing press", "acceptable_answers": ["printing press"], "difficulty": "easy", "tags": ["history", "inventions", "art"]},
    {"subject": "History", "age_range": "Late Elementary", "question": "What was the main job of a medieval knight, like protecting people at a castle? 🏇", "answer": "To protect and fight", "acceptable_answers": ["protect and fight", "fight", "protect"], "difficulty": "easy", "tags": ["history", "medieval", "horseback"]},
    {"subject": "History", "age_range": "Late Elementary", "question": "What is democracy (a government where people vote), like choosing a team captain in sports? ⚽", "answer": "A government where people vote", "acceptable_answers": ["people vote", "government where people vote", "a government where people vote"], "difficulty": "easy", "tags": ["history", "government", "sports"]},

    # ----------------------------
    # Math - Easy (Teen / ages 13+)
    # ----------------------------
    {"subject": "Math", "age_range": "Teen", "question": "In a sports stats problem: solve for x: x + 7 = 19 ⚽", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "algebra", "sports"]},
    {"subject": "Math", "age_range": "Teen", "question": "A space supply shipment is 80 units. What is 15% of 80? 🚀", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "percentages", "space"]},
    {"subject": "Math", "age_range": "Teen", "question": "A triangle in an art design has angles 60° and 60°. What is the third angle? 🎨", "answer": "60", "acceptable_answers": ["60", "60°", "sixty"], "difficulty": "easy", "tags": ["math", "geometry", "art"]},
    {"subject": "Math", "age_range": "Teen", "question": "For a monster truck jump path, what is the slope between (0, 0) and (2, 4)? 🚚", "answer": "2", "acceptable_answers": ["2", "two"], "difficulty": "easy", "tags": ["math", "algebra", "trucks"]},
    {"subject": "Math", "age_range": "Teen", "question": "In an art project budget, simplify: 3(2 + 4) 🎨", "answer": "18", "acceptable_answers": ["18", "eighteen"], "difficulty": "easy", "tags": ["math", "algebra", "art"]},

    # ----------------------------
    # Science - Easy (Teen / ages 13+)
    # ----------------------------
    {"subject": "Science", "age_range": "Teen", "question": "In animal biology, what is the basic unit of life? 🐾", "answer": "Cell", "acceptable_answers": ["cell"], "difficulty": "easy", "tags": ["science", "biology", "animals"]},
    {"subject": "Science", "age_range": "Teen", "question": "For sports hydration science, what is the chemical symbol for sodium? ⚽", "answer": "Na", "acceptable_answers": ["na"], "difficulty": "easy", "tags": ["science", "chemistry", "sports"]},
    {"subject": "Science", "age_range": "Teen", "question": "When horseback riding, what part of the brain helps control balance? 🏇", "answer": "Cerebellum", "acceptable_answers": ["cerebellum"], "difficulty": "easy", "tags": ["science", "biology", "horseback"]},
    {"subject": "Science", "age_range": "Teen", "question": "In a chemistry lab making art pigments, what is the pH of pure water? 🎨", "answer": "7", "acceptable_answers": ["7", "seven"], "difficulty": "easy", "tags": ["science", "chemistry", "art"]},
    {"subject": "Science", "age_range": "Teen", "question": "For sports nutrition, energy stored in food is measured in what? ⚽", "answer": "Calories", "acceptable_answers": ["calories", "calorie"], "difficulty": "easy", "tags": ["science", "nutrition", "sports"]},

    # ----------------------------
    # Reading - Easy (Teen / ages 13+)
    # ----------------------------
    {"subject": "Reading", "age_range": "Teen", "question": "In an essay about space exploration, what is a thesis statement? 🚀", "answer": "The main claim of an essay", "acceptable_answers": ["main claim", "main argument"], "difficulty": "easy", "tags": ["reading", "writing", "space"]},
    {"subject": "Reading", "age_range": "Teen", "question": "In an art report, what does 'cite' mean in writing? 🎨", "answer": "To credit a source", "acceptable_answers": ["credit a source", "to credit a source", "give credit"], "difficulty": "easy", "tags": ["reading", "writing", "art"]},
    {"subject": "Reading", "age_range": "Teen", "question": "In a sports article, what is plagiarism? ⚽", "answer": "Using someone else's work without credit", "acceptable_answers": ["using work without credit", "someone else's work without credit", "copying without credit"], "difficulty": "easy", "tags": ["reading", "writing", "sports"]},
    {"subject": "Reading", "age_range": "Teen", "question": "In a story about animals, what is tone in writing? 🐾", "answer": "The author's attitude", "acceptable_answers": ["author's attitude", "the author's attitude", "attitude"], "difficulty": "easy", "tags": ["reading", "literature", "animals"]},
    {"subject": "Reading", "age_range": "Teen", "question": "In a debate about keeping animals safe, what is a counterargument? 🐾", "answer": "An opposing viewpoint", "acceptable_answers": ["opposing viewpoint", "opposing view", "opposition"], "difficulty": "easy", "tags": ["reading", "writing", "animals"]},

    # ----------------------------
    # History - Easy (Teen / ages 13+)
    # ----------------------------
    {"subject": "History", "age_range": "Teen", "question": "In U.S. government, what is the Bill of Rights? 🏇", "answer": "The first 10 amendments to the U.S. Constitution", "acceptable_answers": ["first 10 amendments", "the first 10 amendments", "first ten amendments"], "difficulty": "easy", "tags": ["history", "america", "government", "horseback"]},
    {"subject": "History", "age_range": "Teen", "question": "In U.S. history, what was the main goal of the Civil Rights Movement? 🐾", "answer": "Equal rights under the law", "acceptable_answers": ["equal rights", "equal rights under the law", "civil rights"], "difficulty": "easy", "tags": ["history", "america", "animals"]},
    {"subject": "History", "age_range": "Teen", "question": "When studying space history, what is a primary source? 🚀", "answer": "An original document or firsthand account", "acceptable_answers": ["original document", "firsthand account", "original or firsthand"], "difficulty": "easy", "tags": ["history", "skills", "space"]},
    {"subject": "History", "age_range": "Teen", "question": "In world history, what did the Cold War describe? 🚀", "answer": "Tension between the U.S. and the USSR", "acceptable_answers": ["tension", "tension between us and ussr", "us vs ussr", "usa and ussr"], "difficulty": "easy", "tags": ["history", "world-history", "space"]},
    {"subject": "History", "age_range": "Teen", "question": "In government class, what is a constitution? ⚽", "answer": "A set of rules for how a government works", "acceptable_answers": ["rules for government", "set of rules", "how a government works"], "difficulty": "easy", "tags": ["history", "government", "sports"]},
]

# ========== AFFIRMATIONS ==========
AFFIRMATIONS_SEED = [
    # Preschool (ages 3-5)
    {"text": "I can try again.", "image": None, "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6", "tags": ["persistence"], "age_range": "Preschool"},
    {"text": "I am brave.", "image": None, "gradient_0": "#10B981", "gradient_1": "#3B82F6", "tags": ["confidence"], "age_range": "Preschool"},
    {"text": "I can learn new things.", "image": None, "gradient_0": "#FB923C", "gradient_1": "#F59E0B", "tags": ["learning"], "age_range": "Preschool"},
    {"text": "I can use kind words.", "image": None, "gradient_0": "#22C55E", "gradient_1": "#06B6D4", "tags": ["kindness"], "age_range": "Preschool"},
    {"text": "I can take deep breaths.", "image": None, "gradient_0": "#6366F1", "gradient_1": "#8B5CF6", "tags": ["calm"], "age_range": "Preschool"},
    {"text": "I can share and wait my turn.", "image": None, "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["patience"], "age_range": "Preschool"},
    {"text": "I am loved.", "image": None, "gradient_0": "#F97316", "gradient_1": "#EF4444", "tags": ["belonging"], "age_range": "Preschool"},
    {"text": "I can help.", "image": None, "gradient_0": "#A855F7", "gradient_1": "#EC4899", "tags": ["kindness"], "age_range": "Preschool"},

    # Early Elementary (ages 6-8)
    {"text": "Challenges help me grow.", "image": None, "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6", "tags": ["growth-mindset"], "age_range": "Early Elementary"},
    {"text": "I keep trying even when it's hard.", "image": None, "gradient_0": "#10B981", "gradient_1": "#3B82F6", "tags": ["persistence"], "age_range": "Early Elementary"},
    {"text": "Every mistake teaches me something.", "image": None, "gradient_0": "#FB923C", "gradient_1": "#F59E0B", "tags": ["learning"], "age_range": "Early Elementary"},
    {"text": "I believe in my ability to learn.", "image": None, "gradient_0": "#22C55E", "gradient_1": "#06B6D4", "tags": ["confidence"], "age_range": "Early Elementary"},
    {"text": "I can handle setbacks.", "image": None, "gradient_0": "#6366F1", "gradient_1": "#8B5CF6", "tags": ["resilience"], "age_range": "Early Elementary"},
    {"text": "My brain gets stronger when I practice.", "image": None, "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["practice"], "age_range": "Early Elementary"},
    {"text": "I can learn new things.", "image": None, "gradient_0": "#F97316", "gradient_1": "#EF4444", "tags": ["growth-mindset"], "age_range": "Early Elementary"},
    {"text": "Effort is more important than being perfect.", "image": None, "gradient_0": "#A855F7", "gradient_1": "#EC4899", "tags": ["effort"], "age_range": "Early Elementary"},

    # Late Elementary (ages 9-12)
    {"text": "I embrace challenges as opportunities.", "image": None, "gradient_0": "#0EA5E9", "gradient_1": "#22C55E", "tags": ["growth-mindset"], "age_range": "Late Elementary"},
    {"text": "I stay focused on my goals.", "image": None, "gradient_0": "#F59E0B", "gradient_1": "#FB923C", "tags": ["focus"], "age_range": "Late Elementary"},
    {"text": "My mistakes help me find better solutions.", "image": None, "gradient_0": "#3B82F6", "gradient_1": "#6366F1", "tags": ["learning"], "age_range": "Late Elementary"},
    {"text": "I trust myself to figure things out.", "image": None, "gradient_0": "#10B981", "gradient_1": "#14B8A6", "tags": ["confidence"], "age_range": "Late Elementary"},
    {"text": "I bounce back from disappointment.", "image": None, "gradient_0": "#EC4899", "gradient_1": "#A855F7", "tags": ["resilience"], "age_range": "Late Elementary"},
    {"text": "I improve every single day.", "image": None, "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["growth-mindset"], "age_range": "Late Elementary"},
    {"text": "I'm becoming stronger through effort.", "image": None, "gradient_0": "#0EA5E9", "gradient_1": "#22C55E", "tags": ["effort"], "age_range": "Late Elementary"},
    {"text": "I can overcome obstacles.", "image": None, "gradient_0": "#F59E0B", "gradient_1": "#FB923C", "tags": ["resilience"], "age_range": "Late Elementary"},

    # Teen (ages 13+)
    {"text": "I choose to see challenges as growth opportunities.", "image": None, "gradient_0": "#3B82F6", "gradient_1": "#6366F1", "tags": ["growth-mindset"], "age_range": "Teen"},
    {"text": "I stay committed to my goals.", "image": None, "gradient_0": "#10B981", "gradient_1": "#14B8A6", "tags": ["focus"], "age_range": "Teen"},
    {"text": "I learn from every experience.", "image": None, "gradient_0": "#EC4899", "gradient_1": "#A855F7", "tags": ["learning"], "age_range": "Teen"},
    {"text": "I have confidence in my abilities.", "image": None, "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6", "tags": ["confidence"], "age_range": "Teen"},
    {"text": "I handle failure with grace.", "image": None, "gradient_0": "#22C55E", "gradient_1": "#06B6D4", "tags": ["resilience"], "age_range": "Teen"},
    {"text": "I embrace the process of learning.", "image": None, "gradient_0": "#F97316", "gradient_1": "#EF4444", "tags": ["growth-mindset"], "age_range": "Teen"},
    {"text": "My effort today builds my tomorrow.", "image": None, "gradient_0": "#A855F7", "gradient_1": "#EC4899", "tags": ["effort"], "age_range": "Teen"},
    {"text": "I adapt and keep moving forward.", "image": None, "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["resilience"], "age_range": "Teen"},
]

# ========== CHORES ==========
CHORES_SEED = [
    # Preschool (ages 3-5)
    {"label": "Make my bed", "icon": "home", "is_extra": False, "tags": ["space"], "age_range": "Preschool"},
    {"label": "Put away clothes", "icon": "user", "is_extra": False, "tags": ["organization"], "age_range": "Preschool"},
    {"label": "Clean my room", "icon": "trash-2", "is_extra": False, "tags": ["responsibility"], "age_range": "Preschool"},

    # Early Elementary (ages 6-8)
    {"label": "Organize my backpack", "icon": "package", "is_extra": False, "tags": ["organization"], "age_range": "Early Elementary"},
    {"label": "Feed the pets", "icon": "heart", "is_extra": False, "tags": ["responsibility"], "age_range": "Early Elementary"},
    {"label": "Set the table", "icon": "coffee", "is_extra": False, "tags": ["helping"], "age_range": "Early Elementary"},
    {"label": "Water the plants", "icon": "droplet", "is_extra": False, "tags": ["nature"], "age_range": "Early Elementary"},
    {"label": "Empty small trash cans", "icon": "trash-2", "is_extra": False, "tags": ["responsibility"], "age_range": "Early Elementary"},

    # Late Elementary (ages 9-12)
    {"label": "Do the dishes", "icon": "coffee", "is_extra": False, "tags": ["responsibility"], "age_range": "Late Elementary"},
    {"label": "Walk the dog", "icon": "activity", "is_extra": False, "tags": ["pets"], "age_range": "Late Elementary"},
    {"label": "Vacuum living room", "icon": "wind", "is_extra": False, "tags": ["responsibility"], "age_range": "Late Elementary"},
    {"label": "Fold laundry", "icon": "list", "is_extra": False, "tags": ["responsibility"], "age_range": "Late Elementary"},
    {"label": "Clean bathroom sink", "icon": "droplets", "is_extra": False, "tags": ["cleaning"], "age_range": "Late Elementary"},

    # Teen (ages 13+)
    {"label": "Mow the lawn", "icon": "scissors", "is_extra": False, "tags": ["responsibility"], "age_range": "Teen"},
    {"label": "Wash the car", "icon": "truck", "is_extra": False, "tags": ["responsibility"], "age_range": "Teen"},
    {"label": "Cook a meal", "icon": "clock", "is_extra": False, "tags": ["responsibility"], "age_range": "Teen"},
    {"label": "Clean the garage", "icon": "tool", "is_extra": False, "tags": ["responsibility"], "age_range": "Teen"},
    {"label": "Do laundry", "icon": "rotate-ccw", "is_extra": False, "tags": ["responsibility"], "age_range": "Teen"},
]

# ========== OUTDOOR ACTIVITIES ==========
OUTDOOR_ACTIVITIES_SEED = [
    # Preschool (ages 3-5)
    {"name": "Play Tag", "category": "Active Play", "icon": "zap", "time": "15 min", "points": 20, "is_daily": True, "tags": ["active-play"], "age_range": "Preschool"},
    {"name": "Nature Walk", "category": "Nature Explorer", "icon": "compass", "time": "20 min", "points": 20, "is_daily": False, "tags": ["nature"], "age_range": "Preschool"},
    {"name": "Kick a Ball", "category": "Sports & Games", "icon": "circle", "time": "30 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range": "Preschool"},
    {"name": "Draw with Chalk", "category": "Creative Outside", "icon": "edit-3", "time": "25 min", "points": 20, "is_daily": False, "tags": ["creative"], "age_range": "Preschool"},
    {"name": "Ride Your Bike", "category": "Active Play", "icon": "activity", "time": "20 min", "points": 20, "is_daily": False, "tags": ["active-play"], "age_range": "Preschool"},

    # Early Elementary (ages 6-8)
    {"name": "Ride a scooter", "category": "Active Play", "icon": "wind", "time": "20 min", "points": 20, "is_daily": False, "tags": ["active-play"], "age_range": "Early Elementary"},
    {"name": "Play catch", "category": "Sports & Games", "icon": "circle", "time": "15 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range": "Early Elementary"},
    {"name": "Build a fort", "category": "Creative", "icon": "home", "time": "30 min", "points": 20, "is_daily": False, "tags": ["creative"], "age_range": "Early Elementary"},
    {"name": "Garden with family", "category": "Nature Explorer", "icon": "sun", "time": "25 min", "points": 20, "is_daily": False, "tags": ["nature"], "age_range": "Early Elementary"},

    # Late Elementary (ages 9-12)
    {"name": "Play basketball", "category": "Sports & Games", "icon": "target", "time": "30 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range": "Late Elementary"},
    {"name": "Go for a bike ride", "category": "Active Play", "icon": "activity", "time": "20 min", "points": 20, "is_daily": False, "tags": ["active-play"], "age_range": "Late Elementary"},
    {"name": "Play soccer with friends", "category": "Sports & Games", "icon": "circle", "time": "45 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range": "Late Elementary"},
    {"name": "Do a scavenger hunt", "category": "Creative", "icon": "compass", "time": "40 min", "points": 20, "is_daily": False, "tags": ["creative"], "age_range": "Late Elementary"},

    # Teen (ages 13+)
    {"name": "Go for a run/jog", "category": "Active Play", "icon": "wind", "time": "30 min", "points": 25, "is_daily": False, "tags": ["active-play"], "age_range": "Teen"},
    {"name": "Play tennis", "category": "Sports & Games", "icon": "target", "time": "45 min", "points": 25, "is_daily": False, "tags": ["sports"], "age_range": "Teen"},
    {"name": "Go hiking", "category": "Nature Explorer", "icon": "compass", "time": "60 min", "points": 25, "is_daily": False, "tags": ["nature"], "age_range": "Teen"},
    {"name": "Take photos outside", "category": "Creative", "icon": "camera", "time": "45 min", "points": 25, "is_daily": False, "tags": ["creative"], "age_range": "Teen"},
]

# ---------------------------------------------------------------------------
# Relationship seeding
# ---------------------------------------------------------------------------

async def seed_subject_age_ranges(
    conn,
    subject_name_to_id: dict[str, Any],
    age_range_name_to_id: dict[str, Any],
) -> None:
    rows: list[dict[str, Any]] = []
    for entry in SUBJECT_AGE_RANGES_SEED:
        sid = subject_name_to_id.get(entry["subject_name"])
        aid = age_range_name_to_id.get(entry["age_range"])
        if not sid or not aid:
            print(f"  [SubjectAgeRange] Skipping invalid entry: {entry}")
            continue
        rows.append({"subject_id": sid, "age_range_id": aid})

    if not rows:
        print("  [SubjectAgeRange] No rows to seed.")
        return

    # This table has a composite PK (subject_id, age_range_id), so ON CONFLICT is valid.
    stmt = insert(SubjectAgeRange).values(rows).on_conflict_do_nothing()
    await conn.execute(stmt)
    print(f"  [SubjectAgeRange] Seeded {len(rows)} subject-age range mappings")


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

async def seed() -> None:
    logger.info("Seeding progress data...")

    engine = get_engine()
    async with engine.begin() as conn:
        if not await db_looks_empty(conn):
            logger.info("Seed skipped (database not empty)")
            return
        # --- Avatars ---
        avatars = [{**row, "is_active": True} for row in AVATARS_SEED]
        await _seed_bulk(conn, Avatar, avatars, "Avatars", conflict_cols=["name"])

        # --- Interests ---
        interests = [{**row, "is_active": True} for row in INTERESTS_SEED]
        await _seed_bulk(conn, Interest, interests, "Interests", conflict_cols=["name"])

        # --- Age ranges ---
        age_ranges_rows = []
        for row in AGE_RANGES_SEED:
            age_ranges_rows.append(
                {
                    "code": age_range_code(row["min_age"], row["max_age"]),
                    "name": row["name"],
                    "min_age": row["min_age"],
                    "max_age": row["max_age"],
                    "is_active": True,
                }
            )
        await _seed_bulk(conn, AgeRange, age_ranges_rows, "Age ranges", conflict_cols=["code"])

        # Build age range maps
        age_range_name_to_id = await _fetch_map(conn, AgeRange, AgeRange.name, AgeRange.id)
        age_range_code_to_id = await _fetch_map(conn, AgeRange, AgeRange.code, AgeRange.id)

        # --- Subjects ---
        subject_rows = []
        for row in SUBJECTS_SEED:
            subject_rows.append(
                {
                    "code": slugify(row["name"], max_len=50, fallback="subject"),
                    "name": row["name"],
                    "icon": row["icon"],
                    "color": row["color"],
                }
            )
        await _seed_bulk(conn, Subject, subject_rows, "Subjects", conflict_cols=["code"])

        # Build subject maps
        subject_name_to_id = await _fetch_map(conn, Subject, Subject.name, Subject.id)
        subject_code_to_id = await _fetch_map(conn, Subject, Subject.code, Subject.id)

        # --- Subject <-> AgeRange M2M ---
        await seed_subject_age_ranges(conn, subject_name_to_id, age_range_name_to_id)

        # --- Level thresholds ---
        level_rows = [{**row, "is_active": True} for row in LEVEL_THRESHOLDS_SEED]
        await _seed_bulk(conn, LevelThreshold, level_rows, "Level thresholds", conflict_cols=["name"])

        # --- Difficulty thresholds ---
        diff_rows = [{**row, "is_active": True} for row in DIFFICULTY_THRESHOLDS_SEED]
        await _seed_bulk(conn, DifficultyThreshold, diff_rows, "Difficulty thresholds", conflict_cols=["code"])

        # --- Points values ---
        points_rows = [{**row, "is_active": True} for row in POINTS_VALUES_SEED]
        await _seed_bulk(conn, PointsValue, points_rows, "Points values", conflict_cols=["code"])

        # --- Achievements ---
        ach_rows = []
        for row in ACHIEVEMENTS_SEED:
            ach_rows.append(
                {
                    "code": slugify(row["title"], max_len=100, fallback="achievement"),
                    "title": row["title"],
                    "description": row["description"],
                    "icon": row["icon"],
                    "achievement_type": row.get("achievement_type") or "special",
                    "points_threshold": row.get("points_threshold"),
                    "streak_days_threshold": row.get("streak_days_threshold"),
                    "flashcards_count_threshold": row.get("flashcards_count_threshold"),
                    "chores_count_threshold": row.get("chores_count_threshold"),
                    "outdoor_count_threshold": row.get("outdoor_count_threshold"),
                    "is_active": True,
                }
            )
        await _seed_bulk(conn, AchievementDefinition, ach_rows, "Achievements", conflict_cols=["code"])

        # --- Flashcards ---
        flash_rows: list[dict[str, Any]] = []
        for fc in FLASHCARDS_SEED:
            sid = subject_name_to_id.get(fc["subject"])
            aid = age_range_name_to_id.get(fc["age_range"])
            if not sid or not aid:
                print(
                    f"Warning: Skipping flashcard with unknown subject '{fc.get('subject')}' "
                    f"or age_range '{fc.get('age_range')}'"
                )
                continue

            flash_rows.append(
                {
                    "subject_id": sid,
                    "age_range_id": aid,
                    "question": fc["question"],
                    "answer": fc["answer"],
                    "acceptable_answers": fc.get("acceptable_answers"),
                    "difficulty_code": fc["difficulty"],  # seed uses "difficulty"
                    "tags": fc.get("tags"),
                }
            )

        if flash_rows:
            # Flashcard has an explicit UniqueConstraint in models, so ON CONFLICT is valid.
            stmt = (
                insert(Flashcard)
                .values(flash_rows)
                .on_conflict_do_nothing(
                    index_elements=["subject_id", "question", "difficulty_code", "age_range_id"]
                )
            )
            await conn.execute(stmt)
            print(f"Flashcards: ensured {len(flash_rows)} rows.")
        else:
            print("Flashcards: no seed rows provided. Skipping.")

        # --- Affirmations (NO ON CONFLICT) ---
        aff_rows: list[dict[str, Any]] = []
        for aff in AFFIRMATIONS_SEED:
            aid = age_range_name_to_id.get(aff["age_range"])
            if not aid:
                print(f"Warning: Skipping affirmation with unknown age_range '{aff.get('age_range')}'")
                continue
            aff_rows.append(
                {
                    "text": aff["text"],
                    "image": aff.get("image"),
                    "gradient_0": aff["gradient_0"],
                    "gradient_1": aff["gradient_1"],
                    "tags": aff.get("tags"),
                    "age_range_id": aid,
                }
            )

        if aff_rows:
            await conn.execute(insert(Affirmation).values(aff_rows))
            print(f"Affirmations: inserted {len(aff_rows)} rows.")
        else:
            print("Affirmations: no seed rows provided. Skipping.")

        # --- Chores (NO ON CONFLICT) ---
        chore_rows: list[dict[str, Any]] = []
        for chore in CHORES_SEED:
            aid = age_range_name_to_id.get(chore["age_range"])
            if not aid:
                print(f"Warning: Skipping chore with unknown age_range '{chore.get('age_range')}'")
                continue
            chore_rows.append(
                {
                    "label": chore["label"],
                    "icon": chore["icon"],
                    "is_extra": chore["is_extra"],
                    "tags": chore.get("tags"),
                    "age_range_id": aid,
                }
            )

        if chore_rows:
            await conn.execute(insert(Chore).values(chore_rows))
            print(f"Chores: inserted {len(chore_rows)} rows.")
        else:
            print("Chores: no seed rows provided. Skipping.")

        # --- Outdoor activities (NO ON CONFLICT) ---
        outdoor_rows: list[dict[str, Any]] = []
        for outdoor in OUTDOOR_ACTIVITIES_SEED:
            aid = age_range_name_to_id.get(outdoor["age_range"])
            if not aid:
                print(f"Warning: Skipping outdoor activity with unknown age_range '{outdoor.get('age_range')}'")
                continue
            outdoor_rows.append(
                {
                    "name": outdoor["name"],
                    "category": outdoor["category"],
                    "icon": outdoor["icon"],
                    "time": outdoor["time"],
                    "points": outdoor["points"],
                    "is_daily": outdoor["is_daily"],
                    "tags": outdoor.get("tags"),
                    "age_range_id": aid,
                }
            )

        if outdoor_rows:
            await conn.execute(insert(OutdoorActivity).values(outdoor_rows))
            print(f"Outdoor activities: inserted {len(outdoor_rows)} rows.")
        else:
            print("Outdoor activities: no seed rows provided. Skipping.")

    logger.info("Done!")


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed())
