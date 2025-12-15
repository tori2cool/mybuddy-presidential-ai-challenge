# deps.py
from __future__ import annotations

from fastapi import Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .db import get_session
from .models import Child
from .security import get_current_user

async def get_child_owned(
    child_id: str = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> Child:
    owner_sub = user.get("sub")
    stmt = select(Child).where(Child.id == child_id, Child.owner_sub == owner_sub)
    result = await session.execute(stmt)
    child = result.scalars().first()
    if child is None:
        # 400 is fine since it's a query param; could also be 404.
        raise HTTPException(status_code=400, detail="Invalid childId; child does not exist.")
    return child
