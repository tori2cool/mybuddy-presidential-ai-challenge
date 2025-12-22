# app/schemas/progress.py
from __future__ import annotations

from typing import Literal, Optional
from pydantic import Field
from ._base import APIModel

# NOTE: SubjectId is intentionally a plain string so subjects can be DB-driven.
# TODO(aqueryus): when subjects become fully DB-driven, consider replacing ad-hoc strings
# with a constrained type sourced from the database at the edges.
SubjectId = str
DifficultyTier = Literal["easy", "medium", "hard"]

class FlashcardAnsweredIn(APIModel):
    subjectId: SubjectId
    correct: bool
    flashcardId: Optional[str] = None
    answer: Optional[str] = None

class ChoreCompletedIn(APIModel):
    choreId: Optional[str] = None
    isExtra: Optional[bool] = None

class OutdoorCompletedIn(APIModel):
    outdoorActivityId: Optional[str] = None
    isDaily: Optional[bool] = None

class AffirmationViewedIn(APIModel):
    affirmationId: Optional[str] = None

class EventAckOut(APIModel):
    pointsAwarded: int = Field(ge=0)
    # ids of achievements newly unlocked by this event
    newAchievementIds: list[str] = Field(default_factory=list)
