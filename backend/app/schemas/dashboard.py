# app/schemas/dashboard.py
from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Literal, Optional
from uuid import UUID

from pydantic import Field
from ._base import APIModel

# You intentionally keep Subject.code as a stable enum-like identifier.
SubjectCode = str
DifficultyCode = str  # e.g. "easy" | "medium" | "hard" (DB-driven via difficulty_thresholds.code)


class AchievementOut(APIModel):
    """
    Mirrors AchievementDefinition + ChildAchievement(unlocked_at).
    """
    id: UUID
    code: str
    title: str
    description: str
    icon: str

    # matches AchievementDefinition.achievement_type
    type: Literal["daily", "weekly", "monthly", "special"] = "special"

    unlockedAt: Optional[datetime] = None


class TodayStatsOut(APIModel):
    date: date
    flashcardsCompleted: int = 0
    flashcardsCorrect: int = 0
    choresCompleted: int = 0
    outdoorActivities: int = 0
    affirmationsViewed: int = 0
    totalPoints: int = 0


class WeekStatsOut(APIModel):
    weekStart: date
    totalPoints: int = 0
    daysActive: int = 0
    flashcardsCompleted: int = 0
    choresCompleted: int = 0
    outdoorActivities: int = 0
    accuracyPct: int = 0


class SubjectStatsOut(APIModel):
    """
    Per-subject flashcard stats; keyed by Subject.code in DashboardOut.flashcardsBySubject.
    """
    completed: int = 0
    correct: int = 0
    correctStreak: int = 0
    longestStreak: int = 0

    # Backend-chosen, DB-driven.
    difficultyCode: Optional[DifficultyCode] = None

    # Backend-chosen target (e.g. 20/40/...)
    nextDifficultyAtStreak: Optional[int] = None

    # Backend-chosen tier start (e.g. 0/20/40)
    currentTierStartAtStreak: int = 0


class SubjectProgressOut(APIModel):
    correct: int = 0
    required: int = 0
    meetsRequirement: bool = False


class BalancedProgressOut(APIModel):
    canLevelUp: bool
    currentLevel: str
    nextLevel: Optional[str] = None
    requiredPerSubject: int

    # Key by Subject.code (stable), not UUID
    subjectProgress: Dict[SubjectCode, SubjectProgressOut]

    lowestSubject: Optional[SubjectCode] = None


class RewardOut(APIModel):
    """
    Reward/level UI card.
    This is derived from LevelThreshold + ChildProgress.total_points, etc.
    """
    level: str
    icon: str
    color: str
    nextAt: Optional[int] = None
    progress: int = Field(ge=0, le=100)


class DashboardOut(APIModel):
    # From ChildProgress
    totalPoints: int
    currentStreak: int
    longestStreak: int
    lastActiveDate: Optional[date] = None

    today: TodayStatsOut
    week: WeekStatsOut

    # Keyed by Subject.code (stable)
    flashcardsBySubject: Dict[SubjectCode, SubjectStatsOut]

    # From ChildProgress totals
    totalChoresCompleted: int
    totalOutdoorActivities: int
    totalAffirmationsViewed: int

    # Daily completion state (UTC day), for persisted checkboxes/buttons
    todayCompletedChoreIds: List[UUID] = Field(default_factory=list)
    todayCompletedOutdoorActivityIds: List[UUID] = Field(default_factory=list)

    # Derived from achievements + child_achievements join
    achievementsUnlocked: List[AchievementOut]
    achievementsLocked: List[AchievementOut]

    balanced: BalancedProgressOut
    reward: RewardOut
