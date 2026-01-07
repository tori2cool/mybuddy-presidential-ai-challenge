# deps.py
from uuid import UUID
from fastapi import Depends, Path, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .db import get_session
from .models import Child
from .security import get_current_user

async def _get_child_owned(*, child_id: UUID, session: AsyncSession, user: dict, not_found_status: int) -> Child:
    owner_sub = user.get("sub")
    child = (await session.execute(
        select(Child).where(Child.id == child_id, Child.owner_sub == owner_sub)
    )).scalars().first()
    if child is None:
        raise HTTPException(status_code=not_found_status, detail="Child not found")
    return child

async def get_child_owned_path(
    child_id: UUID = Path(..., description="Child UUID (id)"),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> Child:
    return await _get_child_owned(child_id=child_id, session=session, user=user, not_found_status=404)

async def get_child_owned_query(
    child_id: UUID = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> Child:
    return await _get_child_owned(child_id=child_id, session=session, user=user, not_found_status=400)
