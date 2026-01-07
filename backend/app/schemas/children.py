# backend/app/schemas/children.py
from __future__ import annotations

from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import Field, field_validator
from ._base import APIModel


class ChildCreateIn(APIModel):
    """
    Create a child profile.
    """
    name: str = Field(min_length=1, max_length=255)
    birthday: date

    # Stored in Child.interests JSONB.
    # Recommended: list of Interest UUIDs.
    interests: List[UUID] = Field(min_length=1)

    # FK to avatars.id
    avatarId: Optional[UUID] = Field(default=None)

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v: List[UUID]) -> List[UUID]:
        cleaned = [x for x in (v or []) if x is not None]
        if len(cleaned) < 1:
            raise ValueError("at least one interest is required")
        return cleaned


class ChildUpdateIn(APIModel):
    """
    Update a child profile.
    Only include fields you want to change.
    """
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    birthday: Optional[date] = None

    interests: Optional[List[UUID]] = None
    avatarId: Optional[UUID] = None  # set null to remove avatar

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v: Optional[List[UUID]]) -> Optional[List[UUID]]:
        if v is None:
            return None
        cleaned = [x for x in v if x is not None]
        if len(cleaned) < 1:
            raise ValueError("at least one interest is required")
        return cleaned


class ChildOut(APIModel):
    """
    Public child representation (matches models.Child).
    """
    id: UUID
    name: str
    birthday: date

    # Mirror what you store in DB (Interest UUIDs).
    interests: List[UUID] = Field(default_factory=list)

    avatarId: Optional[UUID] = None
