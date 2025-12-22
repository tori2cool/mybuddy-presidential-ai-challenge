# app/services/progress_rules.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Literal, Optional, Tuple

# NOTE: SubjectId is intentionally a plain string so subjects can be DB-driven.
SubjectId = str
DifficultyTier = Literal["easy", "medium", "hard"]

# TODO(aqueryus): Replace hardcoded SUBJECTS with subjects loaded from the DB.
# Keep constants for now since achievement/balanced logic assumes a fixed set.
SUBJECTS: list[str] = ["math", "science", "reading", "history"]

DIFFICULTY_THRESHOLDS = {
    "easy": 0,
    "medium": 20,
    "hard": 40,
}

LEVEL_THRESHOLDS: Dict[str, int] = {
    "New Kid": 0,
    "Good Kid": 50,
    "Great Kid": 200,
    "Awesome Kid": 500,
    "Amazing Kid": 1000,
    "Super Star Kid": 2000,
}

POINTS = {
    "flashcard_correct": 10,
    "flashcard_wrong": 2,
    "chore_completed": 15,
    "outdoor_completed": 20,
    "affirmation_viewed": 5,
}

@dataclass(frozen=True)
class AchievementDef:
    id: str
    title: str
    description: str
    icon: str
    type: Literal["daily", "weekly", "monthly", "special"]

ACHIEVEMENTS: List[AchievementDef] = [
    AchievementDef("first_flashcard", "Brain Starter", "Complete your first flashcard", "zap", "special"),
    AchievementDef("first_chore", "Helper Bee", "Complete your first chore", "check-circle", "special"),
    AchievementDef("first_outdoor", "Nature Explorer", "Complete your first outdoor activity", "sun", "special"),
    AchievementDef("streak_3", "On Fire!", "Keep a 3-day streak", "flame", "daily"),
    AchievementDef("streak_7", "Super Star", "Keep a 7-day streak", "star", "weekly"),
    AchievementDef("streak_30", "Champion", "Keep a 30-day streak", "award", "monthly"),
    AchievementDef("points_100", "Rising Star", "Earn 100 points", "trending-up", "daily"),
    AchievementDef("points_500", "Superstar", "Earn 500 points", "star", "weekly"),
    AchievementDef("points_2000", "Legend", "Earn 2000 points", "award", "monthly"),
    AchievementDef("flashcards_10", "Quick Learner", "Complete 10 flashcards", "book", "daily"),
    AchievementDef("flashcards_50", "Knowledge Seeker", "Complete 50 flashcards", "book-open", "weekly"),
    AchievementDef("chores_7", "Tidy Champion", "Complete 7 chores", "home", "weekly"),
    AchievementDef("outdoor_5", "Adventure Kid", "Complete 5 outdoor activities", "compass", "weekly"),
    AchievementDef("perfect_day", "Perfect Day", "Complete activities in all categories in one day", "sun", "daily"),
    AchievementDef("medium_math", "Math Whiz", "Reach Medium difficulty in Math", "grid", "special"),
    AchievementDef("medium_science", "Science Star", "Reach Medium difficulty in Science", "zap", "special"),
    AchievementDef("medium_reading", "Bookworm", "Reach Medium difficulty in Reading", "book-open", "special"),
    AchievementDef("medium_history", "History Buff", "Reach Medium difficulty in History", "globe", "special"),
    AchievementDef("hard_unlocked", "Master Student", "Reach Hard difficulty in any subject", "award", "special"),
    AchievementDef("balanced_learner", "Balanced Learner", "Get 10+ correct in all subjects", "target", "special"),
]

def calculate_difficulty(correct: int) -> DifficultyTier:
    if correct >= DIFFICULTY_THRESHOLDS["hard"]:
        return "hard"
    if correct >= DIFFICULTY_THRESHOLDS["medium"]:
        return "medium"
    return "easy"

def compute_balanced_progress(subject_correct: Dict[SubjectId, int], subjects: Optional[List[SubjectId]] = None) -> dict:
    subjects = subjects or SUBJECTS
    subject_corrects = [subject_correct.get(s, 0) for s in subjects]
    min_correct = min(subject_corrects) if subject_corrects else 0

    levels = sorted(LEVEL_THRESHOLDS.items(), key=lambda kv: kv[1], reverse=True)

    current_level = "New Kid"
    next_level: Optional[str] = None
    next_threshold = LEVEL_THRESHOLDS["Good Kid"]

    # ported from your TS logic (reverse scan)
    for i in range(len(levels) - 1, -1, -1):
        level_name, threshold = levels[i]
        required_per_subject = (threshold + len(subjects) - 1) // len(subjects) if subjects else 0
        if min_correct >= required_per_subject:
            current_level = level_name
            if i > 0:
                next_level = levels[i - 1][0]
                next_threshold = levels[i - 1][1]
            else:
                next_level = None
                next_threshold = 0

    required_per_subject = (
        (next_threshold + len(subjects) - 1) // len(subjects) if (next_level and subjects) else 0
    )

    subject_progress: Dict[SubjectId, dict] = {}
    lowest_subject: Optional[SubjectId] = None
    lowest_value = 10**9

    for s in subjects:
        cur = subject_correct.get(s, 0)
        met = cur >= required_per_subject if next_level else True
        subject_progress[s] = {"current": cur, "required": required_per_subject, "met": met}
        if cur < lowest_value:
            lowest_value = cur
            lowest_subject = s

    can_level_up = (next_level is None) or all(subject_progress[s]["met"] for s in subjects)

    if next_level is None:
        message = "You've reached the highest level!"
    elif can_level_up:
        message = f"Ready to become {next_level}!"
    else:
        needed = [s for s in subjects if not subject_progress[s]["met"]]
        subject_names = ", ".join([s.capitalize() for s in needed])
        message = f"Need more correct answers in: {subject_names}"

    return {
        "canLevelUp": can_level_up,
        "currentLevel": current_level,
        "nextLevel": next_level,
        "requiredPerSubject": required_per_subject,
        "subjectProgress": subject_progress,
        "lowestSubject": lowest_subject,
        "message": message,
    }

def reward_for_level(
    current_level: str,
    subject_correct: Dict[SubjectId, int],
    subjects: Optional[List[SubjectId]] = None,
) -> dict:
    level_colors = {
        "Super Star Kid": {"icon": "star", "color": "#F59E0B"},
        "Amazing Kid": {"icon": "award", "color": "#8B5CF6"},
        "Awesome Kid": {"icon": "sun", "color": "#3B82F6"},
        "Great Kid": {"icon": "thumbs-up", "color": "#10B981"},
        "Good Kid": {"icon": "smile", "color": "#FB923C"},
        "New Kid": {"icon": "user", "color": "#9CA3AF"},
    }
    icon = level_colors.get(current_level, level_colors["New Kid"])["icon"]
    color = level_colors.get(current_level, level_colors["New Kid"])["color"]

    subjects = subjects or SUBJECTS

    balanced = compute_balanced_progress(subject_correct, subjects=subjects)
    next_level = balanced["nextLevel"]
    next_at = LEVEL_THRESHOLDS.get(next_level) if next_level else None
    current_threshold = LEVEL_THRESHOLDS.get(current_level, 0)

    min_correct = min((subject_correct.get(s, 0) for s in subjects), default=0)
    effective_progress = min_correct * len(subjects)

    if next_at is None or next_at == current_threshold:
        pct = 100
    else:
        pct = int(min(max(((effective_progress - current_threshold) / (next_at - current_threshold)) * 100, 0), 100))

    return {"level": current_level, "icon": icon, "color": color, "nextAt": next_at, "progress": pct}

def evaluate_achievement_conditions(
    *,
    total_points: int,
    current_streak: int,
    total_flashcards: int,
    total_chores: int,
    total_outdoor: int,
    today_has_flashcards: bool,
    today_has_chores: bool,
    today_has_outdoor: bool,
    subject_difficulty: Dict[SubjectId, DifficultyTier],
    subject_correct: Dict[SubjectId, int],
) -> List[str]:
    unlocked: List[str] = []

    def add(id: str, cond: bool):
        if cond:
            unlocked.append(id)

    add("first_flashcard", total_flashcards >= 1)
    add("first_chore", total_chores >= 1)
    add("first_outdoor", total_outdoor >= 1)

    add("streak_3", current_streak >= 3)
    add("streak_7", current_streak >= 7)
    add("streak_30", current_streak >= 30)

    add("points_100", total_points >= 100)
    add("points_500", total_points >= 500)
    add("points_2000", total_points >= 2000)

    add("flashcards_10", total_flashcards >= 10)
    add("flashcards_50", total_flashcards >= 50)

    add("chores_7", total_chores >= 7)
    add("outdoor_5", total_outdoor >= 5)

    add("perfect_day", today_has_flashcards and today_has_chores and today_has_outdoor)

    add("medium_math", subject_difficulty.get("math") in ("medium", "hard"))
    add("medium_science", subject_difficulty.get("science") in ("medium", "hard"))
    add("medium_reading", subject_difficulty.get("reading") in ("medium", "hard"))
    add("medium_history", subject_difficulty.get("history") in ("medium", "hard"))

    any_hard = any(subject_difficulty.get(s) == "hard" for s in SUBJECTS)
    add("hard_unlocked", any_hard)

    all_subjects_min10 = all((subject_correct.get(s, 0) >= 10) for s in SUBJECTS)
    add("balanced_learner", all_subjects_min10)

    return unlocked
