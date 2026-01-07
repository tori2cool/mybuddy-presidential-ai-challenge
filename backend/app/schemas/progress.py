# app/schemas/progress.py
from __future__ import annotations

from typing import List, Literal, Optional
from uuid import UUID

from pydantic import Field
from ._base import APIModel

EventKind = Literal["flashcard", "chore", "outdoor", "affirmation"]


class FlashcardAnsweredIn(APIModel):
    flashcardId: UUID
    correct: bool
    answer: Optional[str] = None


class ChoreCompletedIn(APIModel):
    choreId: UUID
    isExtra: Optional[bool] = None  # backend can also derive from Chore.is_extra


class OutdoorCompletedIn(APIModel):
    outdoorActivityId: UUID
    isDaily: Optional[bool] = None  # backend can also derive from OutdoorActivity.is_daily


class AffirmationViewedIn(APIModel):
    affirmationId: UUID


class PostEventIn(APIModel):
    """
    Generic wrapper that matches your existing client shape:
    postEvent({ kind: "...", body: {...} })
    """
    kind: EventKind
    body: FlashcardAnsweredIn | ChoreCompletedIn | OutdoorCompletedIn | AffirmationViewedIn


class EventAckOut(APIModel):
    pointsAwarded: int = Field(ge=0)

    # unlocked achievements from this event
    newAchievementCodes: List[str] = Field(default_factory=list)
