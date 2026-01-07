# backend/app/schemas/difficulty.py
from __future__ import annotations

from uuid import UUID

from ._base import APIModel


class DifficultyOut(APIModel):
    id: UUID
    code: str          # DifficultyThreshold.code ("easy")
    name: str          # DifficultyThreshold.name ("Easy" or same as code)
    label: str
    icon: str
    color: str
    threshold: int
    is_active: bool
