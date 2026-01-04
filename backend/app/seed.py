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
    Flashcard,
    Chore,
    OutdoorActivity,
    AgeRange,
)

# ========== SUBJECTS ==========
SUBJECTS_SEED = [
    {"id": "math", "name": "Math", "icon": "grid", "color": "#8B5CF6"},
    {"id": "science", "name": "Science", "icon": "zap", "color": "#10B981"},
    {"id": "reading", "name": "Reading", "icon": "book-open", "color": "#FB923C"},
    {"id": "history", "name": "History", "icon": "globe", "color": "#3B82F6"},
]

# ========== AGE RANGES ==========
AGE_RANGES_SEED = [
    {"id": "age_3_5", "name": "Preschool", "min_age": 3, "max_age": 5, "is_active": True},
    {"id": "age_6_8", "name": "Early Elementary", "min_age": 6, "max_age": 8, "is_active": True},
    {"id": "age_9_12", "name": "Late Elementary", "min_age": 9, "max_age": 12, "is_active": True},
    {"id": "age_13_plus", "name": "Teen", "min_age": 13, "max_age": None, "is_active": True},
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

# ========== FLASHCARDS ==========
FLASHCARDS_SEED = [
    # ----------------------------
    # Math - Easy (age_6_8)
    # ----------------------------
    {"id": "m31", "subject_id": "math", "question": "What is 9 + 8?", "answer": "17", "acceptable_answers": ["17", "seventeen"], "difficulty": "easy", "tags": ["math", "addition"], "age_range_id": "age_6_8"},
    {"id": "m32", "subject_id": "math", "question": "What is 14 - 6?", "answer": "8", "acceptable_answers": ["8", "eight"], "difficulty": "easy", "tags": ["math", "subtraction"], "age_range_id": "age_6_8"},
    {"id": "m33", "subject_id": "math", "question": "What is 6 x 7?", "answer": "42", "acceptable_answers": ["42", "forty two", "forty-two"], "difficulty": "easy", "tags": ["math", "multiplication"], "age_range_id": "age_6_8"},
    {"id": "m34", "subject_id": "math", "question": "What is 36 / 6?", "answer": "6", "acceptable_answers": ["6", "six"], "difficulty": "easy", "tags": ["math", "division"], "age_range_id": "age_6_8"},
    {"id": "m35", "subject_id": "math", "question": "If you have 10 candies and eat 3, how many are left?", "answer": "7", "acceptable_answers": ["7", "seven"], "difficulty": "easy", "tags": ["math", "word-problems"], "age_range_id": "age_6_8"},

    # ----------------------------
    # Science - Easy (age_6_8)
    # ----------------------------
    {"id": "s31", "subject_id": "science", "question": "What do plants need from the Sun to grow?", "answer": "Sunlight", "acceptable_answers": ["sunlight", "light"], "difficulty": "easy", "tags": ["science", "plants"], "age_range_id": "age_6_8"},
    {"id": "s32", "subject_id": "science", "question": "What gas do plants breathe in?", "answer": "Carbon dioxide", "acceptable_answers": ["carbon dioxide", "co2"], "difficulty": "easy", "tags": ["science", "plants"], "age_range_id": "age_6_8"},
    {"id": "s33", "subject_id": "science", "question": "What part of a plant usually grows underground?", "answer": "Roots", "acceptable_answers": ["roots", "root"], "difficulty": "easy", "tags": ["science", "plants"], "age_range_id": "age_6_8"},
    {"id": "s34", "subject_id": "science", "question": "What is the force that pulls things toward Earth?", "answer": "Gravity", "acceptable_answers": ["gravity"], "difficulty": "easy", "tags": ["science", "physics"], "age_range_id": "age_6_8"},
    {"id": "s35", "subject_id": "science", "question": "What is an animal that eats only plants called?", "answer": "Herbivore", "acceptable_answers": ["herbivore", "a herbivore"], "difficulty": "easy", "tags": ["science", "animals"], "age_range_id": "age_6_8"},

    # ----------------------------
    # Reading - Easy (age_6_8)
    # ----------------------------
    {"id": "r31", "subject_id": "reading", "question": "What is a noun?", "answer": "A person, place, or thing", "acceptable_answers": ["person place or thing", "a person place or thing", "a person, place, or thing"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_6_8"},
    {"id": "r32", "subject_id": "reading", "question": "What is the plural of 'mouse'?", "answer": "Mice", "acceptable_answers": ["mice"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_6_8"},
    {"id": "r33", "subject_id": "reading", "question": "What do we call the beginning of a story?", "answer": "Beginning", "acceptable_answers": ["beginning", "the beginning", "start", "the start"], "difficulty": "easy", "tags": ["reading", "comprehension"], "age_range_id": "age_6_8"},
    {"id": "r34", "subject_id": "reading", "question": "What is a synonym?", "answer": "A word with the same meaning", "acceptable_answers": ["same meaning", "a word with the same meaning", "a word that means the same"], "difficulty": "easy", "tags": ["reading", "vocabulary"], "age_range_id": "age_6_8"},
    {"id": "r35", "subject_id": "reading", "question": "What punctuation ends a sentence?", "answer": "Period", "acceptable_answers": ["period", ".", "a period"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_6_8"},

    # ----------------------------
    # History - Easy (age_6_8)
    # ----------------------------
    {"id": "h31", "subject_id": "history", "question": "What country is known for building the Great Wall?", "answer": "China", "acceptable_answers": ["china"], "difficulty": "easy", "tags": ["history", "ancient"], "age_range_id": "age_6_8"},
    {"id": "h32", "subject_id": "history", "question": "Who were the Pilgrims?", "answer": "People who traveled to America for a new life", "acceptable_answers": ["people who traveled to america", "people who came to america", "travelers to america"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_6_8"},
    {"id": "h33", "subject_id": "history", "question": "What is the name of the U.S. flag?", "answer": "Stars and Stripes", "acceptable_answers": ["stars and stripes", "the stars and stripes"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_6_8"},
    {"id": "h34", "subject_id": "history", "question": "What do we call a person who explores new places?", "answer": "Explorer", "acceptable_answers": ["explorer", "an explorer"], "difficulty": "easy", "tags": ["history", "vocabulary"], "age_range_id": "age_6_8"},
    {"id": "h35", "subject_id": "history", "question": "What continent is Egypt in?", "answer": "Africa", "acceptable_answers": ["africa"], "difficulty": "easy", "tags": ["history", "geography"], "age_range_id": "age_6_8"},

    # ----------------------------
    # Math - Easy (age_9_12)
    # ----------------------------
    {"id": "m36", "subject_id": "math", "question": "What is 12 x 8?", "answer": "96", "acceptable_answers": ["96", "ninety six", "ninety-six"], "difficulty": "easy", "tags": ["math", "multiplication"], "age_range_id": "age_9_12"},
    {"id": "m37", "subject_id": "math", "question": "What is 84 / 7?", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "division"], "age_range_id": "age_9_12"},
    {"id": "m38", "subject_id": "math", "question": "What is 250 + 175?", "answer": "425", "acceptable_answers": ["425", "four hundred twenty five", "four hundred twenty-five"], "difficulty": "easy", "tags": ["math", "addition"], "age_range_id": "age_9_12"},
    {"id": "m39", "subject_id": "math", "question": "What is 300 - 128?", "answer": "172", "acceptable_answers": ["172", "one hundred seventy two", "one hundred seventy-two"], "difficulty": "easy", "tags": ["math", "subtraction"], "age_range_id": "age_9_12"},
    {"id": "m40", "subject_id": "math", "question": "A notebook costs $3. How much do 7 notebooks cost?", "answer": "21", "acceptable_answers": ["21", "$21", "twenty one", "twenty-one"], "difficulty": "easy", "tags": ["math", "word-problems"], "age_range_id": "age_9_12"},

    # ----------------------------
    # Science - Easy (age_9_12)
    # ----------------------------
    {"id": "s36", "subject_id": "science", "question": "What is the process of water turning into vapor called?", "answer": "Evaporation", "acceptable_answers": ["evaporation"], "difficulty": "easy", "tags": ["science", "earth-science"], "age_range_id": "age_9_12"},
    {"id": "s37", "subject_id": "science", "question": "What is the center of the solar system?", "answer": "The Sun", "acceptable_answers": ["sun", "the sun"], "difficulty": "easy", "tags": ["science", "space"], "age_range_id": "age_9_12"},
    {"id": "s38", "subject_id": "science", "question": "What is a change from liquid to solid called?", "answer": "Freezing", "acceptable_answers": ["freezing"], "difficulty": "easy", "tags": ["science", "states-of-matter"], "age_range_id": "age_9_12"},
    {"id": "s39", "subject_id": "science", "question": "What organ pumps blood through the body?", "answer": "Heart", "acceptable_answers": ["heart", "the heart"], "difficulty": "easy", "tags": ["science", "biology"], "age_range_id": "age_9_12"},
    {"id": "s40", "subject_id": "science", "question": "What is an animal with a backbone called?", "answer": "Vertebrate", "acceptable_answers": ["vertebrate", "a vertebrate"], "difficulty": "easy", "tags": ["science", "biology"], "age_range_id": "age_9_12"},

    # ----------------------------
    # Reading - Easy (age_9_12)
    # ----------------------------
    {"id": "r36", "subject_id": "reading", "question": "What is a main idea?", "answer": "What the text is mostly about", "acceptable_answers": ["what it's mostly about", "what the text is mostly about", "main point"], "difficulty": "easy", "tags": ["reading", "comprehension"], "age_range_id": "age_9_12"},
    {"id": "r37", "subject_id": "reading", "question": "What is a sentence fragment?", "answer": "An incomplete sentence", "acceptable_answers": ["incomplete sentence", "an incomplete sentence"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_9_12"},
    {"id": "r38", "subject_id": "reading", "question": "What do we call hints about what will happen next in a story?", "answer": "Foreshadowing", "acceptable_answers": ["foreshadowing"], "difficulty": "easy", "tags": ["reading", "literature"], "age_range_id": "age_9_12"},
    {"id": "r39", "subject_id": "reading", "question": "What is a compound word?", "answer": "Two words put together", "acceptable_answers": ["two words together", "two words put together"], "difficulty": "easy", "tags": ["reading", "vocabulary"], "age_range_id": "age_9_12"},
    {"id": "r40", "subject_id": "reading", "question": "What is the purpose of a conclusion paragraph?", "answer": "To wrap up the main points", "acceptable_answers": ["wrap up", "wrap up the main points", "summarize", "to summarize"], "difficulty": "easy", "tags": ["reading", "writing"], "age_range_id": "age_9_12"},

    # ----------------------------
    # History - Easy (age_9_12)
    # ----------------------------
    {"id": "h36", "subject_id": "history", "question": "What was the purpose of the Underground Railroad?", "answer": "To help enslaved people escape", "acceptable_answers": ["help enslaved people escape", "help escape slavery", "escape slavery"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_9_12"},
    {"id": "h37", "subject_id": "history", "question": "What document begins with 'We the People'?", "answer": "The U.S. Constitution", "acceptable_answers": ["constitution", "the constitution", "u.s. constitution", "us constitution"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_9_12"},
    {"id": "h38", "subject_id": "history", "question": "What invention helped spread books faster in Europe?", "answer": "Printing press", "acceptable_answers": ["printing press", "the printing press"], "difficulty": "easy", "tags": ["history", "inventions"], "age_range_id": "age_9_12"},
    {"id": "h39", "subject_id": "history", "question": "What was the main job of a medieval knight?", "answer": "To protect and fight", "acceptable_answers": ["protect and fight", "fight", "protect"], "difficulty": "easy", "tags": ["history", "medieval"], "age_range_id": "age_9_12"},
    {"id": "h40", "subject_id": "history", "question": "What is democracy?", "answer": "A government where people vote", "acceptable_answers": ["people vote", "government where people vote", "a government where people vote"], "difficulty": "easy", "tags": ["history", "government"], "age_range_id": "age_9_12"},

    # ----------------------------
    # Math - Easy (age_13_plus)
    # ----------------------------
    {"id": "m41", "subject_id": "math", "question": "Solve for x: x + 7 = 19", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "algebra"], "age_range_id": "age_13_plus"},
    {"id": "m42", "subject_id": "math", "question": "What is 15% of 80?", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "percentages"], "age_range_id": "age_13_plus"},
    {"id": "m43", "subject_id": "math", "question": "If a triangle has angles 60° and 60°, what is the third angle?", "answer": "60", "acceptable_answers": ["60", "60°", "sixty"], "difficulty": "easy", "tags": ["math", "geometry"], "age_range_id": "age_13_plus"},
    {"id": "m44", "subject_id": "math", "question": "What is the slope between (0, 0) and (2, 4)?", "answer": "2", "acceptable_answers": ["2", "two"], "difficulty": "easy", "tags": ["math", "algebra"], "age_range_id": "age_13_plus"},
    {"id": "m45", "subject_id": "math", "question": "Simplify: 3(2 + 4)", "answer": "18", "acceptable_answers": ["18", "eighteen"], "difficulty": "easy", "tags": ["math", "algebra"], "age_range_id": "age_13_plus"},

    # ----------------------------
    # Science - Easy (age_13_plus)
    # ----------------------------
    {"id": "s41", "subject_id": "science", "question": "What is the basic unit of life?", "answer": "Cell", "acceptable_answers": ["cell", "a cell", "cells"], "difficulty": "easy", "tags": ["science", "biology"], "age_range_id": "age_13_plus"},
    {"id": "s42", "subject_id": "science", "question": "What is the chemical symbol for sodium?", "answer": "Na", "acceptable_answers": ["na"], "difficulty": "easy", "tags": ["science", "chemistry"], "age_range_id": "age_13_plus"},
    {"id": "s43", "subject_id": "science", "question": "What part of the brain controls balance?", "answer": "Cerebellum", "acceptable_answers": ["cerebellum"], "difficulty": "easy", "tags": ["science", "biology"], "age_range_id": "age_13_plus"},
    {"id": "s44", "subject_id": "science", "question": "What is the pH of pure water?", "answer": "7", "acceptable_answers": ["7", "seven"], "difficulty": "easy", "tags": ["science", "chemistry"], "age_range_id": "age_13_plus"},
    {"id": "s45", "subject_id": "science", "question": "What is energy stored in food measured in?", "answer": "Calories", "acceptable_answers": ["calories", "calorie"], "difficulty": "easy", "tags": ["science", "nutrition"], "age_range_id": "age_13_plus"},

    # ----------------------------
    # Reading - Easy (age_13_plus)
    # ----------------------------
    {"id": "r41", "subject_id": "reading", "question": "What is a thesis statement?", "answer": "The main claim of an essay", "acceptable_answers": ["main claim", "main claim of an essay", "main argument"], "difficulty": "easy", "tags": ["reading", "writing"], "age_range_id": "age_13_plus"},
    {"id": "r42", "subject_id": "reading", "question": "What does 'cite' mean in writing?", "answer": "To credit a source", "acceptable_answers": ["credit a source", "to credit a source", "give credit"], "difficulty": "easy", "tags": ["reading", "writing"], "age_range_id": "age_13_plus"},
    {"id": "r43", "subject_id": "reading", "question": "What is plagiarism?", "answer": "Using someone else's work without credit", "acceptable_answers": ["using work without credit", "someone else's work without credit", "copying without credit"], "difficulty": "easy", "tags": ["reading", "writing"], "age_range_id": "age_13_plus"},
    {"id": "r44", "subject_id": "reading", "question": "What is tone in writing?", "answer": "The author's attitude", "acceptable_answers": ["author's attitude", "the author's attitude", "attitude"], "difficulty": "easy", "tags": ["reading", "literature"], "age_range_id": "age_13_plus"},
    {"id": "r45", "subject_id": "reading", "question": "What is a counterargument?", "answer": "An opposing viewpoint", "acceptable_answers": ["opposing viewpoint", "opposing view", "opposition"], "difficulty": "easy", "tags": ["reading", "writing"], "age_range_id": "age_13_plus"},

    # ----------------------------
    # History - Easy (age_13_plus)
    # ----------------------------
    {"id": "h41", "subject_id": "history", "question": "What is the Bill of Rights?", "answer": "The first 10 amendments to the U.S. Constitution", "acceptable_answers": ["first 10 amendments", "the first 10 amendments", "first ten amendments"], "difficulty": "easy", "tags": ["history", "america", "government"], "age_range_id": "age_13_plus"},
    {"id": "h42", "subject_id": "history", "question": "What was the main goal of the Civil Rights Movement?", "answer": "Equal rights under the law", "acceptable_answers": ["equal rights", "equal rights under the law", "civil rights"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_13_plus"},
    {"id": "h43", "subject_id": "history", "question": "What is a primary source?", "answer": "An original document or firsthand account", "acceptable_answers": ["original document", "firsthand account", "original or firsthand"], "difficulty": "easy", "tags": ["history", "skills"], "age_range_id": "age_13_plus"},
    {"id": "h44", "subject_id": "history", "question": "What did the Cold War describe?", "answer": "Tension between the U.S. and the USSR", "acceptable_answers": ["tension", "tension between us and ussr", "us vs ussr", "usa and ussr"], "difficulty": "easy", "tags": ["history", "world-history"], "age_range_id": "age_13_plus"},
    {"id": "h45", "subject_id": "history", "question": "What is a constitution?", "answer": "A set of rules for how a government works", "acceptable_answers": ["rules for government", "set of rules", "how a government works"], "difficulty": "easy", "tags": ["history", "government"], "age_range_id": "age_13_plus"},
]

# ========== AFFIRMATIONS ==========
AFFIRMATIONS_SEED = [
    # age_3_5 (Preschool)
    {"id": "1", "text": "I can try again.", "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6", "tags": ["persistence"], "age_range_id": "age_3_5"},
    {"id": "2", "text": "I am brave.", "gradient_0": "#10B981", "gradient_1": "#3B82F6", "tags": ["confidence"], "age_range_id": "age_3_5"},
    {"id": "3", "text": "I can learn new things.", "gradient_0": "#FB923C", "gradient_1": "#F59E0B", "tags": ["learning"], "age_range_id": "age_3_5"},
    {"id": "4", "text": "I can use kind words.", "gradient_0": "#22C55E", "gradient_1": "#06B6D4", "tags": ["kindness"], "age_range_id": "age_3_5"},
    {"id": "5", "text": "I can take deep breaths.", "gradient_0": "#6366F1", "gradient_1": "#8B5CF6", "tags": ["calm"], "age_range_id": "age_3_5"},
    {"id": "6", "text": "I can share and wait my turn.", "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["patience"], "age_range_id": "age_3_5"},
    {"id": "7", "text": "I am loved.", "gradient_0": "#F97316", "gradient_1": "#EF4444", "tags": ["belonging"], "age_range_id": "age_3_5"},
    {"id": "8", "text": "I can help.", "gradient_0": "#A855F7", "gradient_1": "#EC4899", "tags": ["kindness"], "age_range_id": "age_3_5"},

    # age_6_8 (Early Elementary)
    {"id": "13", "text": "Challenges help me grow.", "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6", "tags": ["growth-mindset"], "age_range_id": "age_6_8"},
    {"id": "14", "text": "I keep trying even when it's hard.", "gradient_0": "#10B981", "gradient_1": "#3B82F6", "tags": ["persistence"], "age_range_id": "age_6_8"},
    {"id": "15", "text": "Every mistake teaches me something.", "gradient_0": "#FB923C", "gradient_1": "#F59E0B", "tags": ["learning"], "age_range_id": "age_6_8"},
    {"id": "16", "text": "I believe in my ability to learn.", "gradient_0": "#22C55E", "gradient_1": "#06B6D4", "tags": ["confidence"], "age_range_id": "age_6_8"},
    {"id": "17", "text": "I can handle setbacks.", "gradient_0": "#6366F1", "gradient_1": "#8B5CF6", "tags": ["resilience"], "age_range_id": "age_6_8"},
    {"id": "18", "text": "My brain gets stronger when I practice.", "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["practice"], "age_range_id": "age_6_8"},
    {"id": "19", "text": "I can learn new things.", "gradient_0": "#F97316", "gradient_1": "#EF4444", "tags": ["growth-mindset"], "age_range_id": "age_6_8"},
    {"id": "20", "text": "Effort is more important than being perfect.", "gradient_0": "#A855F7", "gradient_1": "#EC4899", "tags": ["effort"], "age_range_id": "age_6_8"},

    # age_9_12 (Late Elementary)
    {"id": "21", "text": "I embrace challenges as opportunities.", "gradient_0": "#0EA5E9", "gradient_1": "#22C55E", "tags": ["growth-mindset"], "age_range_id": "age_9_12"},
    {"id": "22", "text": "I stay focused on my goals.", "gradient_0": "#F59E0B", "gradient_1": "#FB923C", "tags": ["focus"], "age_range_id": "age_9_12"},
    {"id": "23", "text": "My mistakes help me find better solutions.", "gradient_0": "#3B82F6", "gradient_1": "#6366F1", "tags": ["learning"], "age_range_id": "age_9_12"},
    {"id": "24", "text": "I trust myself to figure things out.", "gradient_0": "#10B981", "gradient_1": "#14B8A6", "tags": ["confidence"], "age_range_id": "age_9_12"},
    {"id": "25", "text": "I bounce back from disappointment.", "gradient_0": "#EC4899", "gradient_1": "#A855F7", "tags": ["resilience"], "age_range_id": "age_9_12"},
    {"id": "26", "text": "I improve every single day.", "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["growth-mindset"], "age_range_id": "age_9_12"},
    {"id": "27", "text": "I'm becoming stronger through effort.", "gradient_0": "#0EA5E9", "gradient_1": "#22C55E", "tags": ["effort"], "age_range_id": "age_9_12"},
    {"id": "28", "text": "I can overcome obstacles.", "gradient_0": "#F59E0B", "gradient_1": "#FB923C", "tags": ["resilience"], "age_range_id": "age_9_12"},

    # age_13_plus (Teen)
    {"id": "29", "text": "I choose to see challenges as growth opportunities.", "gradient_0": "#3B82F6", "gradient_1": "#6366F1", "tags": ["growth-mindset"], "age_range_id": "age_13_plus"},
    {"id": "30", "text": "I stay committed to my goals.", "gradient_0": "#10B981", "gradient_1": "#14B8A6", "tags": ["focus"], "age_range_id": "age_13_plus"},
    {"id": "31", "text": "I learn from every experience.", "gradient_0": "#EC4899", "gradient_1": "#A855F7", "tags": ["learning"], "age_range_id": "age_13_plus"},
    {"id": "32", "text": "I have confidence in my abilities.", "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6", "tags": ["confidence"], "age_range_id": "age_13_plus"},
    {"id": "33", "text": "I handle failure with grace.", "gradient_0": "#22C55E", "gradient_1": "#06B6D4", "tags": ["resilience"], "age_range_id": "age_13_plus"},
    {"id": "34", "text": "I embrace the process of learning.", "gradient_0": "#F97316", "gradient_1": "#EF4444", "tags": ["growth-mindset"], "age_range_id": "age_13_plus"},
    {"id": "35", "text": "My effort today builds my tomorrow.", "gradient_0": "#A855F7", "gradient_1": "#EC4899", "tags": ["effort"], "age_range_id": "age_13_plus"},
    {"id": "36", "text": "I adapt and keep moving forward.", "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["resilience"], "age_range_id": "age_13_plus"},
]
# ========== Chores ==========
CHORES_SEED = [
    # age_3_5 (Preschool)
    {"id": "bed", "label": "Make my bed", "icon": "home", "is_extra": False, "tags": ["space"], "age_range_id": "age_3_5"},
    {"id": "clothes", "label": "Put away clothes", "icon": "user", "is_extra": False, "tags": ["organization"], "age_range_id": "age_3_5"},
    {"id": "room", "label": "Clean my room", "icon": "trash-2", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_3_5"},

    # age_6_8 (Early Elementary)
    {"id": "backpack", "label": "Organize my backpack", "icon": "package", "is_extra": False, "tags": ["organization"], "age_range_id": "age_6_8"},
    {"id": "feed-pet", "label": "Feed the pets", "icon": "heart", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_6_8"},
    {"id": "set-table", "label": "Set the table", "icon": "coffee", "is_extra": False, "tags": ["helping"], "age_range_id": "age_6_8"},
    {"id": "water-plants", "label": "Water the plants", "icon": "droplet", "is_extra": False, "tags": ["nature"], "age_range_id": "age_6_8"},
    {"id": "small-trash", "label": "Empty small trash cans", "icon": "trash-2", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_6_8"},

    # age_9_12 (Late Elementary)
    {"id": "dishes", "label": "Do the dishes", "icon": "coffee", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_9_12"},
    {"id": "walk-dog", "label": "Walk the dog", "icon": "activity", "is_extra": False, "tags": ["pets"], "age_range_id": "age_9_12"},
    {"id": "vacuum", "label": "Vacuum living room", "icon": "wind", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_9_12"},
    {"id": "fold-laundry", "label": "Fold laundry", "icon": "list", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_9_12"},
    {"id": "clean-sink", "label": "Clean bathroom sink", "icon": "droplets", "is_extra": False, "tags": ["cleaning"], "age_range_id": "age_9_12"},

    # age_13_plus (Teen)
    {"id": "mow-lawn", "label": "Mow the lawn", "icon": "scissors", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_13_plus"},
    {"id": "wash-car", "label": "Wash the car", "icon": "truck", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_13_plus"},
    {"id": "cook-meal", "label": "Cook a meal", "icon": "clock", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_13_plus"},
    {"id": "clean-garage", "label": "Clean the garage", "icon": "tool", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_13_plus"},
    {"id": "do-laundry", "label": "Do laundry", "icon": "rotate-ccw", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_13_plus"},
]

# ========== Outdoor Activities ==========
OUTDOOR_ACTIVITIES_SEED = [
    # age_3_5 (Preschool)
    {"id": "run", "name": "Play Tag", "category": "Active Play", "icon": "zap", "time": "15 min", "points": 20, "is_daily": True, "tags": ["active-play"], "age_range_id": "age_3_5"},
    {"id": "explore", "name": "Nature Walk", "category": "Nature Explorer", "icon": "compass", "time": "20 min", "points": 20, "is_daily": False, "tags": ["nature"], "age_range_id": "age_3_5"},
    {"id": "sports", "name": "Kick the Ball", "category": "Sports & Games", "icon": "circle", "time": "30 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range_id": "age_3_5"},
    {"id": "creative", "name": "Draw with Chalk", "category": "Creative Outside", "icon": "edit-3", "time": "25 min", "points": 20, "is_daily": False, "tags": ["creative"], "age_range_id": "age_3_5"},
    {"id": "bike", "name": "Ride Your Bike", "category": "Active Play", "icon": "activity", "time": "20 min", "points": 20, "is_daily": False, "tags": ["space"], "age_range_id": "age_3_5"},

    # age_6_8 (Early Elementary)
    {"id": "scooter", "name": "Ride a scooter", "category": "Active Play", "icon": "wind", "time": "20 min", "points": 20, "is_daily": False, "tags": ["active-play"], "age_range_id": "age_6_8"},
    {"id": "play-catch", "name": "Play catch", "category": "Sports & Games", "icon": "circle", "time": "15 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range_id": "age_6_8"},
    {"id": "build-fort", "name": "Build a fort", "category": "Creative", "icon": "home", "time": "30 min", "points": 20, "is_daily": False, "tags": ["creative"], "age_range_id": "age_6_8"},
    {"id": "garden-family", "name": "Garden with family", "category": "Nature Explorer", "icon": "sun", "time": "25 min", "points": 20, "is_daily": False, "tags": ["nature"], "age_range_id": "age_6_8"},

    # age_9_12 (Late Elementary)
    {"id": "basketball", "name": "Play basketball", "category": "Sports & Games", "icon": "target", "time": "30 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range_id": "age_9_12"},
    {"id": "bike-ride", "name": "Go for a bike ride", "category": "Active Play", "icon": "activity", "time": "20 min", "points": 20, "is_daily": False, "tags": ["active-play"], "age_range_id": "age_9_12"},
    {"id": "soccer", "name": "Play soccer with friends", "category": "Sports & Games", "icon": "circle", "time": "45 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range_id": "age_9_12"},
    {"id": "scavenger-hunt", "name": "Do a scavenger hunt", "category": "Creative", "icon": "compass", "time": "40 min", "points": 20, "is_daily": False, "tags": ["creative"], "age_range_id": "age_9_12"},

    # age_13_plus (Teen)
    {"id": "go-run", "name": "Go for a run/jog", "category": "Active Play", "icon": "wind", "time": "30 min", "points": 25, "is_daily": False, "tags": ["active-play"], "age_range_id": "age_13_plus"},
    {"id": "play-tennis", "name": "Play tennis", "category": "Sports & Games", "icon": "target", "time": "45 min", "points": 25, "is_daily": False, "tags": ["sports"], "age_range_id": "age_13_plus"},
    {"id": "go-hiking", "name": "Go hiking", "category": "Nature Explorer", "icon": "compass", "time": "60 min", "points": 25, "is_daily": False, "tags": ["nature"], "age_range_id": "age_13_plus"},
    {"id": "take-photos", "name": "Take photos outside", "category": "Creative", "icon": "camera", "time": "45 min", "points": 25, "is_daily": False, "tags": ["creative"], "age_range_id": "age_13_plus"},
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
        await _seed_bulk(conn, AgeRange, AGE_RANGES_SEED, "Age ranges")
        await _seed_bulk(conn, Subject, SUBJECTS_SEED, "Subjects")
        await _seed_bulk(conn, Flashcard, FLASHCARDS_SEED, "Flashcards")
        await _seed_bulk(conn, LevelThreshold, LEVEL_THRESHOLDS_SEED, "Level thresholds")
        await _seed_bulk(conn, DifficultyThreshold, DIFFICULTY_THRESHOLDS_SEED, "Difficulty thresholds")
        await _seed_bulk(conn, PointsValue, POINTS_VALUES_SEED, "Points values")
        await _seed_bulk(conn, AchievementDefinition, ACHIEVEMENTS_SEED, "Achievements")
        await _seed_bulk(conn, Affirmation, AFFIRMATIONS_SEED, "Affirmations")
        await _seed_bulk(conn, Chore, CHORES_SEED, "Chores")
        await _seed_bulk(conn, OutdoorActivity, OUTDOOR_ACTIVITIES_SEED, "Outdoor activities")

    print("Done!")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())
