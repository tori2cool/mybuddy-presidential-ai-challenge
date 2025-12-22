# deps.py
from __future__ import annotations

from fastapi import Depends, Query, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .db import get_session
from .models import Child
from .security import get_current_user

async def _get_child_owned_by_id(
    *,
    child_id: str,
    session: AsyncSession,
    user: dict,
    not_found_status: int,
) -> Child:
    owner_sub = user.get("sub")
    stmt = select(Child).where(Child.id == child_id, Child.owner_sub == owner_sub)
    result = await session.execute(stmt)
    child = result.scalars().first()
    if child is None:
        raise HTTPException(status_code=not_found_status, detail="Child not found")
    return child


async def get_child_owned_path(
    child_id: str = Path(...),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> Child:
    return await _get_child_owned_by_id(
        child_id=child_id,
        session=session,
        user=user,
        not_found_status=404,
    )


async def get_child_owned_query(
    child_id: str = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> Child:
    # Keep 400 for invalid/missing query selection to preserve prior contract.
    return await _get_child_owned_by_id(
        child_id=child_id,
        session=session,
        user=user,
        not_found_status=400,
    )


# Backwards-compatible alias: existing callers expect query param `childId`.
get_child_owned = get_child_owned_query
