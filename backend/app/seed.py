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
    # Math - Easy (age_3_5)
    {"id": "m1", "subject_id": "math", "question": "What is 7 + 5?", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "addition"], "age_range_id": "age_3_5"},
    {"id": "m2", "subject_id": "math", "question": "What is 8 + 6?", "answer": "14", "acceptable_answers": ["14", "fourteen"], "difficulty": "easy", "tags": ["math", "addition"], "age_range_id": "age_3_5"},
    {"id": "m3", "subject_id": "math", "question": "What is 15 - 9?", "answer": "6", "acceptable_answers": ["6", "six"], "difficulty": "easy", "tags": ["math", "subtraction"], "age_range_id": "age_3_5"},
    {"id": "m4", "subject_id": "math", "question": "What is 4 + 9?", "answer": "13", "acceptable_answers": ["13", "thirteen"], "difficulty": "easy", "tags": ["math", "addition"], "age_range_id": "age_3_5"},
    {"id": "m5", "subject_id": "math", "question": "What is 20 - 8?", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "subtraction"], "age_range_id": "age_3_5"},
    {"id": "m6", "subject_id": "math", "question": "What is 3 x 4?", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "easy", "tags": ["math", "multiplication"], "age_range_id": "age_3_5"},
    {"id": "m7", "subject_id": "math", "question": "What is 5 x 2?", "answer": "10", "acceptable_answers": ["10", "ten"], "difficulty": "easy", "tags": ["math", "multiplication"], "age_range_id": "age_3_5"},
    {"id": "m8", "subject_id": "math", "question": "What is 16 / 4?", "answer": "4", "acceptable_answers": ["4", "four"], "difficulty": "easy", "tags": ["math", "division"], "age_range_id": "age_3_5"},
    {"id": "m9", "subject_id": "math", "question": "What is 18 / 2?", "answer": "9", "acceptable_answers": ["9", "nine"], "difficulty": "easy", "tags": ["math", "division"], "age_range_id": "age_3_5"},
    {"id": "m10", "subject_id": "math", "question": "What is 25 - 11?", "answer": "14", "acceptable_answers": ["14", "fourteen"], "difficulty": "easy", "tags": ["math", "subtraction"], "age_range_id": "age_3_5"},
    # Math - Medium (age_6_8)
    {"id": "m11", "subject_id": "math", "question": "What is 8 x 7?", "answer": "56", "acceptable_answers": ["56", "fifty six", "fifty-six"], "difficulty": "medium", "tags": ["math", "multiplication"], "age_range_id": "age_6_8"},
    {"id": "m12", "subject_id": "math", "question": "What is 9 x 9?", "answer": "81", "acceptable_answers": ["81", "eighty one", "eighty-one"], "difficulty": "medium", "tags": ["math", "multiplication"], "age_range_id": "age_6_8"},
    {"id": "m13", "subject_id": "math", "question": "What is 72 / 8?", "answer": "9", "acceptable_answers": ["9", "nine"], "difficulty": "medium", "tags": ["math", "division"], "age_range_id": "age_6_8"},
    {"id": "m14", "subject_id": "math", "question": "What is 15 x 4?", "answer": "60", "acceptable_answers": ["60", "sixty"], "difficulty": "medium", "tags": ["math", "multiplication"], "age_range_id": "age_6_8"},
    {"id": "m15", "subject_id": "math", "question": "What is 144 / 12?", "answer": "12", "acceptable_answers": ["12", "twelve"], "difficulty": "medium", "tags": ["math", "division"], "age_range_id": "age_6_8"},
    {"id": "m16", "subject_id": "math", "question": "If you have 45 apples and give away 18, how many are left?", "answer": "27", "acceptable_answers": ["27", "twenty seven", "twenty-seven"], "difficulty": "medium", "tags": ["math", "word-problems"], "age_range_id": "age_6_8"},
    {"id": "m17", "subject_id": "math", "question": "What is 7 x 8 + 6?", "answer": "62", "acceptable_answers": ["62", "sixty two", "sixty-two"], "difficulty": "medium", "tags": ["math", "multiplication"], "age_range_id": "age_6_8"},
    {"id": "m18", "subject_id": "math", "question": "What is 100 - 37?", "answer": "63", "acceptable_answers": ["63", "sixty three", "sixty-three"], "difficulty": "medium", "tags": ["math", "subtraction"], "age_range_id": "age_6_8"},
    {"id": "m19", "subject_id": "math", "question": "What is 11 x 11?", "answer": "121", "acceptable_answers": ["121", "one hundred twenty one"], "difficulty": "medium", "tags": ["math", "multiplication"], "age_range_id": "age_6_8"},
    {"id": "m20", "subject_id": "math", "question": "What is half of 86?", "answer": "43", "acceptable_answers": ["43", "forty three", "forty-three"], "difficulty": "medium", "tags": ["math", "division"], "age_range_id": "age_6_8"},
    # Math - Hard (age_9_12)
    {"id": "m21", "subject_id": "math", "question": "If a book costs $12 and you have $50, how many books can you buy?", "answer": "4", "acceptable_answers": ["4", "four"], "difficulty": "hard", "tags": ["math", "word-problems"], "age_range_id": "age_9_12"},
    {"id": "m22", "subject_id": "math", "question": "What is 25 x 25?", "answer": "625", "acceptable_answers": ["625", "six hundred twenty five"], "difficulty": "hard", "tags": ["math", "multiplication"], "age_range_id": "age_9_12"},
    {"id": "m23", "subject_id": "math", "question": "What is (8 + 12) x 5?", "answer": "100", "acceptable_answers": ["100", "one hundred"], "difficulty": "hard", "tags": ["math", "word-problems"], "age_range_id": "age_9_12"},
    {"id": "m24", "subject_id": "math", "question": "A train travels 60 miles per hour. How far does it go in 3 hours?", "answer": "180", "acceptable_answers": ["180", "180 miles", "one hundred eighty", "one hundred eighty miles"], "difficulty": "hard", "tags": ["math", "word-problems"], "age_range_id": "age_9_12"},
    {"id": "m25", "subject_id": "math", "question": "What is 15% of 200?", "answer": "30", "acceptable_answers": ["30", "thirty"], "difficulty": "hard", "tags": ["math", "percentages"], "age_range_id": "age_9_12"},
    {"id": "m26", "subject_id": "math", "question": "What is 144 / 6 + 18?", "answer": "42", "acceptable_answers": ["42", "forty two", "forty-two"], "difficulty": "hard", "tags": ["math", "division"], "age_range_id": "age_9_12"},
    {"id": "m27", "subject_id": "math", "question": "If 3 pencils cost $1.50, how much do 10 pencils cost?", "answer": "5", "acceptable_answers": ["5", "$5", "$5.00", "five", "five dollars", "5 dollars"], "difficulty": "hard", "tags": ["math", "word-problems"], "age_range_id": "age_9_12"},
    {"id": "m28", "subject_id": "math", "question": "What is the area of a rectangle with length 8 and width 6?", "answer": "48", "acceptable_answers": ["48", "forty eight", "forty-eight"], "difficulty": "hard", "tags": ["math", "geometry"], "age_range_id": "age_9_12"},
    {"id": "m29", "subject_id": "math", "question": "What is 999 + 111?", "answer": "1110", "acceptable_answers": ["1110", "one thousand one hundred ten"], "difficulty": "hard", "tags": ["math", "addition"], "age_range_id": "age_9_12"},
    {"id": "m30", "subject_id": "math", "question": "What number times itself equals 169?", "answer": "13", "acceptable_answers": ["13", "thirteen"], "difficulty": "hard", "tags": ["math", "multiplication"], "age_range_id": "age_9_12"},

    # Science - Easy (age_3_5)
    {"id": "s1", "subject_id": "science", "question": "What planet is known as the Red Planet?", "answer": "Mars", "acceptable_answers": ["mars"], "difficulty": "easy", "tags": ["science", "space", "planets"], "age_range_id": "age_3_5"},
    {"id": "s2", "subject_id": "science", "question": "How many legs does a spider have?", "answer": "8", "acceptable_answers": ["8", "eight"], "difficulty": "easy", "tags": ["science", "animals", "biology"], "age_range_id": "age_3_5"},
    {"id": "s3", "subject_id": "science", "question": "What gas do we breathe in?", "answer": "Oxygen", "acceptable_answers": ["oxygen", "o2"], "difficulty": "easy", "tags": ["science", "biology"], "age_range_id": "age_3_5"},
    {"id": "s4", "subject_id": "science", "question": "What is the closest star to Earth?", "answer": "The Sun", "acceptable_answers": ["sun", "the sun"], "difficulty": "easy", "tags": ["science", "space", "planets"], "age_range_id": "age_3_5"},
    {"id": "s5", "subject_id": "science", "question": "How many planets are in our solar system?", "answer": "8", "acceptable_answers": ["8", "eight"], "difficulty": "easy", "tags": ["science", "space", "planets"], "age_range_id": "age_3_5"},
    {"id": "s6", "subject_id": "science", "question": "What animal is known as the King of the Jungle?", "answer": "Lion", "acceptable_answers": ["lion", "a lion"], "difficulty": "easy", "tags": ["science", "animals", "biology"], "age_range_id": "age_3_5"},
    {"id": "s7", "subject_id": "science", "question": "What is water made of?", "answer": "Hydrogen and Oxygen", "acceptable_answers": ["hydrogen and oxygen", "h2o", "water"], "difficulty": "easy", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_3_5"},
    {"id": "s8", "subject_id": "science", "question": "What do bees make?", "answer": "Honey", "acceptable_answers": ["honey"], "difficulty": "easy", "tags": ["science", "animals", "biology"], "age_range_id": "age_3_5"},
    {"id": "s9", "subject_id": "science", "question": "What is the largest mammal?", "answer": "Blue Whale", "acceptable_answers": ["blue whale", "whale"], "difficulty": "easy", "tags": ["science", "animals", "biology"], "age_range_id": "age_3_5"},
    {"id": "s10", "subject_id": "science", "question": "How many bones are in the human body?", "answer": "206", "acceptable_answers": ["206", "two hundred six"], "difficulty": "easy", "tags": ["science", "biology"], "age_range_id": "age_3_5"},
    # Science - Medium (age_6_8)
    {"id": "s11", "subject_id": "science", "question": "What is the largest organ in the human body?", "answer": "Skin", "acceptable_answers": ["skin", "the skin"], "difficulty": "medium", "tags": ["science", "biology"], "age_range_id": "age_6_8"},
    {"id": "s12", "subject_id": "science", "question": "What force keeps us on the ground?", "answer": "Gravity", "acceptable_answers": ["gravity"], "difficulty": "medium", "tags": ["science", "physics", "gravity"], "age_range_id": "age_6_8"},
    {"id": "s13", "subject_id": "science", "question": "What is the process plants use to make food?", "answer": "Photosynthesis", "acceptable_answers": ["photosynthesis"], "difficulty": "medium", "tags": ["science", "plants", "photosynthesis"], "age_range_id": "age_6_8"},
    {"id": "s14", "subject_id": "science", "question": "What is the hardest natural substance on Earth?", "answer": "Diamond", "acceptable_answers": ["diamond", "diamonds"], "difficulty": "medium", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_6_8"},
    {"id": "s15", "subject_id": "science", "question": "What planet has the most moons?", "answer": "Saturn", "acceptable_answers": ["saturn"], "difficulty": "medium", "tags": ["science", "space", "planets"], "age_range_id": "age_6_8"},
    {"id": "s16", "subject_id": "science", "question": "What is the chemical symbol for gold?", "answer": "Au", "acceptable_answers": ["au"], "difficulty": "medium", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_6_8"},
    {"id": "s17", "subject_id": "science", "question": "What type of animal is a dolphin?", "answer": "Mammal", "acceptable_answers": ["mammal", "a mammal"], "difficulty": "medium", "tags": ["science", "animals", "biology"], "age_range_id": "age_6_8"},
    {"id": "s18", "subject_id": "science", "question": "What is the center of an atom called?", "answer": "Nucleus", "acceptable_answers": ["nucleus", "the nucleus"], "difficulty": "medium", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_6_8"},
    {"id": "s19", "subject_id": "science", "question": "What is the main gas in Earth's atmosphere?", "answer": "Nitrogen", "acceptable_answers": ["nitrogen"], "difficulty": "medium", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_6_8"},
    {"id": "s20", "subject_id": "science", "question": "How long does it take Earth to orbit the Sun?", "answer": "365 days", "acceptable_answers": ["365 days", "365", "1 year", "one year", "a year"], "difficulty": "medium", "tags": ["science", "space", "planets"], "age_range_id": "age_6_8"},
    # Science - Hard (age_9_12)
    {"id": "s21", "subject_id": "science", "question": "What are the three states of matter?", "answer": "Solid, Liquid, Gas", "acceptable_answers": ["solid liquid gas", "solid, liquid, gas", "solid liquid and gas"], "difficulty": "hard", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_9_12"},
    {"id": "s22", "subject_id": "science", "question": "What is the speed of light in miles per second?", "answer": "186,000", "acceptable_answers": ["186000", "186,000", "186000 miles"], "difficulty": "hard", "tags": ["science", "physics", "gravity"], "age_range_id": "age_9_12"},
    {"id": "s23", "subject_id": "science", "question": "What part of the cell contains genetic information?", "answer": "Nucleus", "acceptable_answers": ["nucleus", "the nucleus", "dna"], "difficulty": "hard", "tags": ["science", "biology"], "age_range_id": "age_9_12"},
    {"id": "s24", "subject_id": "science", "question": "What causes the tides on Earth?", "answer": "The Moon's gravity", "acceptable_answers": ["moon", "the moon", "moon's gravity", "gravity of the moon"], "difficulty": "hard", "tags": ["science", "physics", "gravity"], "age_range_id": "age_9_12"},
    {"id": "s25", "subject_id": "science", "question": "What is Newton's First Law also known as?", "answer": "Law of Inertia", "acceptable_answers": ["law of inertia", "inertia"], "difficulty": "hard", "tags": ["science", "physics", "gravity"], "age_range_id": "age_9_12"},
    {"id": "s26", "subject_id": "science", "question": "What is the boiling point of water in Fahrenheit?", "answer": "212", "acceptable_answers": ["212", "212 degrees", "212f"], "difficulty": "hard", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_9_12"},
    {"id": "s27", "subject_id": "science", "question": "What type of rock is formed from cooled lava?", "answer": "Igneous", "acceptable_answers": ["igneous", "igneous rock"], "difficulty": "hard", "tags": ["science", "plants", "photosynthesis"], "age_range_id": "age_9_12"},
    {"id": "s28", "subject_id": "science", "question": "What is the unit of electrical resistance?", "answer": "Ohm", "acceptable_answers": ["ohm", "ohms"], "difficulty": "hard", "tags": ["science", "physics", "gravity"], "age_range_id": "age_9_12"},
    {"id": "s29", "subject_id": "science", "question": "What is the chemical formula for table salt?", "answer": "NaCl", "acceptable_answers": ["nacl", "sodium chloride"], "difficulty": "hard", "tags": ["science", "chemistry", "elements"], "age_range_id": "age_9_12"},
    {"id": "s30", "subject_id": "science", "question": "What is the function of white blood cells?", "answer": "Fight infection", "acceptable_answers": ["fight infection", "fight infections", "protect the body", "immunity", "immune system"], "difficulty": "hard", "tags": ["science", "biology"], "age_range_id": "age_9_12"},

    # Reading - Easy (age_3_5)
    {"id": "r1", "subject_id": "reading", "question": "What punctuation mark ends a question?", "answer": "Question mark", "acceptable_answers": ["question mark", "?", "a question mark"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_3_5"},
    {"id": "r2", "subject_id": "reading", "question": "What do we call words that sound the same but have different meanings?", "answer": "Homophones", "acceptable_answers": ["homophones", "homophone"], "difficulty": "easy", "tags": ["reading", "vocabulary"], "age_range_id": "age_3_5"},
    {"id": "r3", "subject_id": "reading", "question": "What is the opposite of a synonym?", "answer": "Antonym", "acceptable_answers": ["antonym", "an antonym"], "difficulty": "easy", "tags": ["reading", "vocabulary"], "age_range_id": "age_3_5"},
    {"id": "r4", "subject_id": "reading", "question": "What do we call a word that describes a noun?", "answer": "Adjective", "acceptable_answers": ["adjective", "an adjective"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_3_5"},
    {"id": "r5", "subject_id": "reading", "question": "What punctuation mark shows excitement?", "answer": "Exclamation mark", "acceptable_answers": ["exclamation mark", "exclamation point", "!"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_3_5"},
    {"id": "r6", "subject_id": "reading", "question": "How many letters are in the alphabet?", "answer": "26", "acceptable_answers": ["26", "twenty six", "twenty-six"], "difficulty": "easy", "tags": ["reading", "vocabulary"], "age_range_id": "age_3_5"},
    {"id": "r7", "subject_id": "reading", "question": "What do we call a story that is not true?", "answer": "Fiction", "acceptable_answers": ["fiction", "a fiction"], "difficulty": "easy", "tags": ["reading", "literature"], "age_range_id": "age_3_5"},
    {"id": "r8", "subject_id": "reading", "question": "What are the five vowels?", "answer": "A, E, I, O, U", "acceptable_answers": ["a e i o u", "aeiou", "a, e, i, o, u"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_3_5"},
    {"id": "r9", "subject_id": "reading", "question": "What do we call a word that shows action?", "answer": "Verb", "acceptable_answers": ["verb", "a verb"], "difficulty": "easy", "tags": ["reading", "grammar"], "age_range_id": "age_3_5"},
    {"id": "r10", "subject_id": "reading", "question": "What is the name for the main character in a story?", "answer": "Protagonist", "acceptable_answers": ["protagonist", "the protagonist", "main character"], "difficulty": "easy", "tags": ["reading", "literature"], "age_range_id": "age_3_5"},
    # Reading - Medium (age_6_8)
    {"id": "r11", "subject_id": "reading", "question": "What is a group of sentences about one topic called?", "answer": "Paragraph", "acceptable_answers": ["paragraph", "a paragraph"], "difficulty": "medium", "tags": ["reading", "writing"], "age_range_id": "age_6_8"},
    {"id": "r12", "subject_id": "reading", "question": "What do we call a word that replaces a noun?", "answer": "Pronoun", "acceptable_answers": ["pronoun", "a pronoun"], "difficulty": "medium", "tags": ["reading", "grammar"], "age_range_id": "age_6_8"},
    {"id": "r13", "subject_id": "reading", "question": "What is the name for the bad character in a story?", "answer": "Antagonist", "acceptable_answers": ["antagonist", "the antagonist", "villain"], "difficulty": "medium", "tags": ["reading", "literature"], "age_range_id": "age_6_8"},
    {"id": "r14", "subject_id": "reading", "question": "What do we call a comparison using 'like' or 'as'?", "answer": "Simile", "acceptable_answers": ["simile", "a simile"], "difficulty": "medium", "tags": ["reading", "writing"], "age_range_id": "age_6_8"},
    {"id": "r15", "subject_id": "reading", "question": "What is the setting of a story?", "answer": "Where and when it takes place", "acceptable_answers": ["where and when", "time and place", "place and time", "location"], "difficulty": "medium", "tags": ["reading", "comprehension"], "age_range_id": "age_6_8"},
    {"id": "r16", "subject_id": "reading", "question": "What do we call words with opposite meanings?", "answer": "Antonyms", "acceptable_answers": ["antonyms", "antonym"], "difficulty": "medium", "tags": ["reading", "vocabulary"], "age_range_id": "age_6_8"},
    {"id": "r17", "subject_id": "reading", "question": "What is a biography?", "answer": "A story about someone's life", "acceptable_answers": ["story of someone's life", "story about someone's life", "life story", "about someone's life"], "difficulty": "medium", "tags": ["reading", "literature"], "age_range_id": "age_6_8"},
    {"id": "r18", "subject_id": "reading", "question": "What punctuation separates items in a list?", "answer": "Comma", "acceptable_answers": ["comma", "commas", ","], "difficulty": "medium", "tags": ["reading", "grammar"], "age_range_id": "age_6_8"},
    {"id": "r19", "subject_id": "reading", "question": "What is the plural of 'child'?", "answer": "Children", "acceptable_answers": ["children"], "difficulty": "medium", "tags": ["reading", "grammar"], "age_range_id": "age_6_8"},
    {"id": "r20", "subject_id": "reading", "question": "What do we call a word that modifies a verb?", "answer": "Adverb", "acceptable_answers": ["adverb", "an adverb"], "difficulty": "medium", "tags": ["reading", "grammar"], "age_range_id": "age_6_8"},
    # Reading - Hard (age_9_12)
    {"id": "r21", "subject_id": "reading", "question": "What is a metaphor?", "answer": "A direct comparison without using like or as", "acceptable_answers": ["direct comparison", "comparison without like or as", "comparing things directly"], "difficulty": "hard", "tags": ["reading", "writing"], "age_range_id": "age_9_12"},
    {"id": "r22", "subject_id": "reading", "question": "What is the theme of a story?", "answer": "The main message or lesson", "acceptable_answers": ["main message", "lesson", "moral", "central idea", "main idea"], "difficulty": "hard", "tags": ["reading", "comprehension"], "age_range_id": "age_9_12"},
    {"id": "r23", "subject_id": "reading", "question": "What is personification?", "answer": "Giving human traits to non-human things", "acceptable_answers": ["giving human traits to things", "making things human", "human traits to objects"], "difficulty": "hard", "tags": ["reading", "writing"], "age_range_id": "age_9_12"},
    {"id": "r24", "subject_id": "reading", "question": "What is the climax of a story?", "answer": "The most exciting part", "acceptable_answers": ["most exciting part", "turning point", "peak", "high point"], "difficulty": "hard", "tags": ["reading", "comprehension"], "age_range_id": "age_9_12"},
    {"id": "r25", "subject_id": "reading", "question": "What is alliteration?", "answer": "Repeating the same starting sound", "acceptable_answers": ["same starting sound", "repeated sounds", "same beginning sounds"], "difficulty": "hard", "tags": ["reading", "writing"], "age_range_id": "age_9_12"},
    {"id": "r26", "subject_id": "reading", "question": "What is the difference between 'affect' and 'effect'?", "answer": "Affect is a verb, effect is a noun", "acceptable_answers": ["affect is verb effect is noun", "affect verb effect noun"], "difficulty": "hard", "tags": ["reading", "grammar"], "age_range_id": "age_9_12"},
    {"id": "r27", "subject_id": "reading", "question": "What is irony?", "answer": "When the opposite of what you expect happens", "acceptable_answers": ["opposite of expected", "unexpected outcome", "opposite of what's expected"], "difficulty": "hard", "tags": ["reading", "comprehension"], "age_range_id": "age_9_12"},
    {"id": "r28", "subject_id": "reading", "question": "What is a prefix?", "answer": "Letters added to the beginning of a word", "acceptable_answers": ["beginning of word", "letters before word", "added to beginning"], "difficulty": "hard", "tags": ["reading", "vocabulary"], "age_range_id": "age_9_12"},
    {"id": "r29", "subject_id": "reading", "question": "What is a suffix?", "answer": "Letters added to the end of a word", "acceptable_answers": ["end of word", "letters after word", "added to end"], "difficulty": "hard", "tags": ["reading", "vocabulary"], "age_range_id": "age_9_12"},
    {"id": "r30", "subject_id": "reading", "question": "What is the resolution of a story?", "answer": "How the story ends", "acceptable_answers": ["how it ends", "ending", "conclusion", "how the conflict is solved"], "difficulty": "hard", "tags": ["reading", "comprehension"], "age_range_id": "age_9_12"},

    # History - Easy (age_3_5)
    {"id": "h1", "subject_id": "history", "question": "Who was the first President of the United States?", "answer": "George Washington", "acceptable_answers": ["george washington", "washington"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h2", "subject_id": "history", "question": "What ancient wonder was built in Egypt?", "answer": "The Pyramids", "acceptable_answers": ["pyramids", "the pyramids", "great pyramids"], "difficulty": "easy", "tags": ["history", "ancient", "egypt"], "age_range_id": "age_3_5"},
    {"id": "h3", "subject_id": "history", "question": "What is the name of the ship the Pilgrims sailed on?", "answer": "The Mayflower", "acceptable_answers": ["mayflower", "the mayflower"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h4", "subject_id": "history", "question": "In what year did Columbus sail to America?", "answer": "1492", "acceptable_answers": ["1492"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h5", "subject_id": "history", "question": "What holiday celebrates America's independence?", "answer": "Fourth of July", "acceptable_answers": ["fourth of july", "july 4th", "july fourth", "independence day"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h6", "subject_id": "history", "question": "Who invented the light bulb?", "answer": "Thomas Edison", "acceptable_answers": ["thomas edison", "edison"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h7", "subject_id": "history", "question": "What country gave the Statue of Liberty to America?", "answer": "France", "acceptable_answers": ["france"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h8", "subject_id": "history", "question": "What ocean did the Titanic sink in?", "answer": "Atlantic Ocean", "acceptable_answers": ["atlantic", "the atlantic", "atlantic ocean"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h9", "subject_id": "history", "question": "Who was known for saying 'I have a dream'?", "answer": "Martin Luther King Jr.", "acceptable_answers": ["martin luther king", "mlk", "martin luther king jr", "dr king"], "difficulty": "easy", "tags": ["history", "america"], "age_range_id": "age_3_5"},
    {"id": "h10", "subject_id": "history", "question": "What did the ancient Romans speak?", "answer": "Latin", "acceptable_answers": ["latin"], "difficulty": "easy", "tags": ["history", "ancient", "rome"], "age_range_id": "age_3_5"},
    # History - Medium (age_6_8)
    {"id": "h11", "subject_id": "history", "question": "What war was fought between the North and South in America?", "answer": "Civil War", "acceptable_answers": ["civil war", "the civil war", "american civil war"], "difficulty": "medium", "tags": ["history", "war", "civil-war"], "age_range_id": "age_6_8"},
    {"id": "h12", "subject_id": "history", "question": "Who wrote the Declaration of Independence?", "answer": "Thomas Jefferson", "acceptable_answers": ["thomas jefferson", "jefferson"], "difficulty": "medium", "tags": ["history", "america"], "age_range_id": "age_6_8"},
    {"id": "h13", "subject_id": "history", "question": "What empire built the Colosseum?", "answer": "Roman Empire", "acceptable_answers": ["roman", "roman empire", "romans", "rome"], "difficulty": "medium", "tags": ["history", "ancient", "rome"], "age_range_id": "age_6_8"},
    {"id": "h14", "subject_id": "history", "question": "What was the name of the first airplane?", "answer": "Wright Flyer", "acceptable_answers": ["wright flyer", "flyer", "wright brothers plane"], "difficulty": "medium", "tags": ["history", "america"], "age_range_id": "age_6_8"},
    {"id": "h15", "subject_id": "history", "question": "Who was the President during the Civil War?", "answer": "Abraham Lincoln", "acceptable_answers": ["abraham lincoln", "lincoln", "abe lincoln"], "difficulty": "medium", "tags": ["history", "america"], "age_range_id": "age_6_8"},
    {"id": "h16", "subject_id": "history", "question": "What ancient civilization built the Parthenon?", "answer": "Greeks", "acceptable_answers": ["greeks", "greek", "ancient greece", "greece"], "difficulty": "medium", "tags": ["history", "ancient", "rome"], "age_range_id": "age_6_8"},
    {"id": "h17", "subject_id": "history", "question": "What year did World War II end?", "answer": "1945", "acceptable_answers": ["1945"], "difficulty": "medium", "tags": ["history", "war", "world-war"], "age_range_id": "age_6_8"},
    {"id": "h18", "subject_id": "history", "question": "Who was the first person to walk on the moon?", "answer": "Neil Armstrong", "acceptable_answers": ["neil armstrong", "armstrong"], "difficulty": "medium", "tags": ["history", "america"], "age_range_id": "age_6_8"},
    {"id": "h19", "subject_id": "history", "question": "What was the Boston Tea Party protesting?", "answer": "Taxes", "acceptable_answers": ["taxes", "taxation", "tax", "british taxes"], "difficulty": "medium", "tags": ["history", "america"], "age_range_id": "age_6_8"},
    {"id": "h20", "subject_id": "history", "question": "What is the oldest civilization in Mesopotamia?", "answer": "Sumer", "acceptable_answers": ["sumer", "sumerian", "sumerians"], "difficulty": "medium", "tags": ["history", "ancient", "egypt"], "age_range_id": "age_6_8"},
    # History - Hard (age_9_12)
    {"id": "h21", "subject_id": "history", "question": "What were the causes of World War I?", "answer": "Nationalism, alliances, imperialism", "acceptable_answers": ["nationalism", "alliances", "imperialism", "assassination"], "difficulty": "hard", "tags": ["history", "war", "world-war"], "age_range_id": "age_9_12"},
    {"id": "h22", "subject_id": "history", "question": "What was the Renaissance?", "answer": "A rebirth of art and learning in Europe", "acceptable_answers": ["rebirth", "rebirth of art", "cultural movement", "rebirth of learning"], "difficulty": "hard", "tags": ["history", "ancient", "rome"], "age_range_id": "age_9_12"},
    {"id": "h23", "subject_id": "history", "question": "Who was Cleopatra?", "answer": "The last pharaoh of Egypt", "acceptable_answers": ["pharaoh", "queen of egypt", "egyptian queen", "last pharaoh"], "difficulty": "hard", "tags": ["history", "ancient", "egypt"], "age_range_id": "age_9_12"},
    {"id": "h24", "subject_id": "history", "question": "What was the Cold War?", "answer": "Political tension between USA and USSR", "acceptable_answers": ["tension between usa and ussr", "usa vs soviet union", "america vs russia"], "difficulty": "hard", "tags": ["history", "war", "world-war"], "age_range_id": "age_9_12"},
    {"id": "h25", "subject_id": "history", "question": "What did the Magna Carta establish?", "answer": "Limits on the king's power", "acceptable_answers": ["limits on king", "rights", "limited monarchy", "rights of people"], "difficulty": "hard", "tags": ["history", "ancient", "rome"], "age_range_id": "age_9_12"},
    {"id": "h26", "subject_id": "history", "question": "What was the Industrial Revolution?", "answer": "Shift from farming to factory work", "acceptable_answers": ["factories", "machines", "manufacturing", "industrial change"], "difficulty": "hard", "tags": ["history", "america"], "age_range_id": "age_9_12"},
    {"id": "h27", "subject_id": "history", "question": "Who were the Vikings?", "answer": "Seafaring Norse people from Scandinavia", "acceptable_answers": ["norse", "scandinavian", "seafarers", "warriors from scandinavia"], "difficulty": "hard", "tags": ["history", "ancient", "rome"], "age_range_id": "age_9_12"},
    {"id": "h28", "subject_id": "history", "question": "What was the Silk Road?", "answer": "Ancient trade route between East and West", "acceptable_answers": ["trade route", "trading route", "route between east and west"], "difficulty": "hard", "tags": ["history", "ancient", "egypt"], "age_range_id": "age_9_12"},
    {"id": "h29", "subject_id": "history", "question": "What caused the fall of the Roman Empire?", "answer": "Invasions, economic trouble, and overexpansion", "acceptable_answers": ["invasions", "barbarians", "economic problems", "overexpansion"], "difficulty": "hard", "tags": ["history", "ancient", "rome"], "age_range_id": "age_9_12"},
    {"id": "h30", "subject_id": "history", "question": "What was the effect of the printing press?", "answer": "Spread of knowledge and literacy", "acceptable_answers": ["spread knowledge", "more books", "literacy", "education"], "difficulty": "hard", "tags": ["history", "america"], "age_range_id": "age_9_12"},
]

# ========== AFFIRMATIONS ==========
AFFIRMATIONS_SEED = [
    {"id": "1", "text": "I can do hard things.", "gradient_0": "#8B5CF6", "gradient_1": "#3B82F6", "tags": ["persistence"], "age_range_id": "age_3_5"},
    {"id": "2", "text": "I am learning every day.", "gradient_0": "#10B981", "gradient_1": "#3B82F6", "tags": ["learning"], "age_range_id": "age_3_5"},
    {"id": "3", "text": "I'm proud of my effort.", "gradient_0": "#FB923C", "gradient_1": "#F59E0B", "tags": ["effort"], "age_range_id": "age_3_5"},
    {"id": "4", "text": "Progress matters more than perfection.", "gradient_0": "#22C55E", "gradient_1": "#06B6D4", "tags": ["growth-mindset"], "age_range_id": "age_3_5"},
    {"id": "5", "text": "I show up even when it's uncomfortable.", "gradient_0": "#6366F1", "gradient_1": "#8B5CF6", "tags": ["resilience"], "age_range_id": "age_3_5"},
    {"id": "6", "text": "I am capable of figuring this out.", "gradient_0": "#14B8A6", "gradient_1": "#3B82F6", "tags": ["confidence"], "age_range_id": "age_3_5"},
    {"id": "7", "text": "Small steps still move me forward.", "gradient_0": "#F97316", "gradient_1": "#EF4444", "tags": ["growth-mindset"], "age_range_id": "age_3_5"},
    {"id": "8", "text": "I give myself permission to grow.", "gradient_0": "#A855F7", "gradient_1": "#EC4899", "tags": ["self-compassion"], "age_range_id": "age_3_5"},
    {"id": "9", "text": "My effort today supports my future self.", "gradient_0": "#0EA5E9", "gradient_1": "#22C55E", "tags": ["future"], "age_range_id": "age_3_5"},
    {"id": "10", "text": "I don't need all the answers to begin.", "gradient_0": "#F59E0B", "gradient_1": "#FB923C", "tags": ["starting"], "age_range_id": "age_3_5"},
    {"id": "11", "text": "I am improving through practice.", "gradient_0": "#3B82F6", "gradient_1": "#6366F1", "tags": ["practice"], "age_range_id": "age_3_5"},
    {"id": "12", "text": "I trust myself to adapt and adjust.", "gradient_0": "#10B981", "gradient_1": "#14B8A6", "tags": ["trust", "adaptability"], "age_range_id": "age_3_5"},
]


# ========== Chores ==========
CHORES_SEED = [
    {"id": "bed", "label": "Make my bed", "icon": "home", "is_extra": False, "tags": ["tidying"], "age_range_id": "age_3_5"},
    {"id": "clothes", "label": "Put away clothes", "icon": "user", "is_extra": False, "tags": ["organization"], "age_range_id": "age_3_5"},
    {"id": "room", "label": "Clean my room", "icon": "trash-2", "is_extra": False, "tags": ["responsibility"], "age_range_id": "age_3_5"},
]

# ========== Outdoor Activities ==========
OUTDOOR_ACTIVITIES_SEED = [
    {"id": "run", "name": "Play Tag", "category": "Active Play", "icon": "zap", "time": "15 min", "points": 20, "is_daily": True, "tags": ["active-play"], "age_range_id": "age_3_5"},
    {"id": "explore", "name": "Nature Walk", "category": "Nature Explorer", "icon": "compass", "time": "20 min", "points": 20, "is_daily": False, "tags": ["nature"], "age_range_id": "age_3_5"},
    {"id": "sports", "name": "Kick the Ball", "category": "Sports & Games", "icon": "circle", "time": "30 min", "points": 20, "is_daily": False, "tags": ["sports"], "age_range_id": "age_3_5"},
    {"id": "creative", "name": "Draw with Chalk", "category": "Creative Outside", "icon": "edit-3", "time": "25 min", "points": 20, "is_daily": False, "tags": ["creative"], "age_range_id": "age_3_5"},
    {"id": "bike", "name": "Ride Your Bike", "category": "Active Play", "icon": "activity", "time": "20 min", "points": 20, "is_daily": False, "tags": ["active-play"], "age_range_id": "age_3_5"},
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
