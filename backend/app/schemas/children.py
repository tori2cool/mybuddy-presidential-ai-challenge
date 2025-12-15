# backend/app/schemas/children.py
from __future__ import annotations

from datetime import date
from typing import List, Optional
from pydantic import Field

from ._base import APIModel

class ChildUpsert(APIModel):
    id: Optional[str] = None
    name: str
    birthday: Optional[date] = None
    interests: List[str] = Field(min_length=1)   # at least one
    avatar: Optional[str] = None

class ChildOut(APIModel):
    id: str
    name: str
    birthday: Optional[date] = None
    interests: List[str] = Field(min_length=1)
    avatar: Optional[str] = None