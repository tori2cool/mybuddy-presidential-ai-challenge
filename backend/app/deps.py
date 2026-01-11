# deps.py
from uuid import UUID

from fastapi import Depends, HTTPException, Path, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .db import get_session
from .models import Child
from .security import get_current_user


async def _get_child_owned(
    *,
    request: Request,
    child_id: UUID,
    session: AsyncSession,
    user: dict,
    not_found_status: int,
) -> Child:
    """Fetch a child row owned by the current user.

    FastAPI can evaluate the same dependency multiple times in a single request
    (e.g., nested dependencies). Cache the lookup on `request.state` so we only
    hit the DB once per (owner_sub, child_id) per request.
    """

    owner_sub = user.get("sub")

    cache = getattr(request.state, "child_owned_cache", None)
    if cache is None:
        cache = {}
        request.state.child_owned_cache = cache

    cache_key = (owner_sub, child_id)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    child = (
        await session.execute(select(Child).where(Child.id == child_id, Child.owner_sub == owner_sub))
    ).scalars().first()
    if child is None:
        raise HTTPException(status_code=not_found_status, detail="Child not found")

    cache[cache_key] = child
    return child


async def get_child_owned_path(
    request: Request,
    child_id: UUID = Path(..., description="Child UUID (id)"),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> Child:
    return await _get_child_owned(
        request=request,
        child_id=child_id,
        session=session,
        user=user,
        not_found_status=404,
    )


async def get_child_owned_query(
    request: Request,
    child_id: UUID = Query(..., alias="childId"),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> Child:
    return await _get_child_owned(
        request=request,
        child_id=child_id,
        session=session,
        user=user,
        not_found_status=400,
    )
