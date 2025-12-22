# app/schemas/dashboard.py
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional
from pydantic import Field
from ._base import APIModel

# NOTE: SubjectId is intentionally a plain string so subjects can be DB-driven.
# TODO(aqueryus): when subjects become fully DB-driven, consider replacing ad-hoc strings
# with a constrained type sourced from the database at the edges.
SubjectId = str
DifficultyTier = Literal["easy", "medium", "hard"]

class AchievementOut(APIModel):
    id: str
    title: str
    description: str
    icon: str
    type: Literal["daily", "weekly", "monthly", "special"]
    unlockedAt: Optional[datetime] = None

class TodayStatsOut(APIModel):
    date: str
    flashcardsCompleted: int = 0
    flashcardsCorrect: int = 0
    choresCompleted: int = 0
    outdoorActivities: int = 0
    affirmationsViewed: int = 0
    totalPoints: int = 0

class WeekStatsOut(APIModel):
    weekStart: str
    totalPoints: int = 0
    daysActive: int = 0
    flashcardsCompleted: int = 0
    choresCompleted: int = 0
    outdoorActivities: int = 0
    accuracyPct: int = 0

class SubjectStatsOut(APIModel):
    completed: int = 0
    correct: int = 0
    difficulty: DifficultyTier = "easy"

class BalancedProgressOut(APIModel):
    canLevelUp: bool
    currentLevel: str
    nextLevel: Optional[str] = None
    requiredPerSubject: int
    subjectProgress: Dict[SubjectId, Dict[str, int | bool]]
    lowestSubject: Optional[SubjectId] = None
    message: str

class RewardOut(APIModel):
    level: str
    icon: str
    color: str
    nextAt: Optional[int] = None
    progress: int = Field(ge=0, le=100)

class DashboardOut(APIModel):
    totalPoints: int
    currentStreak: int
    longestStreak: int
    lastActiveDate: Optional[str] = None

    today: TodayStatsOut
    week: WeekStatsOut

    flashcardsBySubject: Dict[SubjectId, SubjectStatsOut]

    totalChoresCompleted: int
    totalOutdoorActivities: int
    totalAffirmationsViewed: int

    achievementsUnlocked: List[AchievementOut]
    achievementsLocked: List[AchievementOut]

    balanced: BalancedProgressOut
    reward: RewardOut
