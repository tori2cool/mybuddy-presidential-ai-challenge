from __future__ import annotations
from pydantic import BaseModel, ConfigDict

class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,  # <-- REQUIRED for ORM objects (SQLModel)
        populate_by_name=True, # allows aliasing later if you want camelCase
    )
