# routers/core.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..db import get_session
from ..security import get_current_user

router = APIRouter(prefix="/v1", tags=["core"])

def get_tenant_id_from_claims(user: dict) -> str | None:
    return user.get("tenant") or user.get("sub")

def me_payload(user: dict) -> dict:
    return {
        "sub": user.get("sub"),
        "username": user.get("preferred_username") or user.get("email"),
        "email": user.get("email"),
        "name": user.get("name"),
        "realm_roles": user.get("realm_access", {}).get("roles", []),
        "client_roles": user.get("resource_access", {}),
        "raw_claims": user,
    }

def get_job_status_payload(job_id: str) -> dict:
    from ..celery_app import celery_app
    async_result = celery_app.AsyncResult(job_id)
    return {
        "job_id": job_id,
        "state": async_result.state,
        "result": async_result.result if async_result.ready() else None,
    }

@router.get("/me")
async def me_v1(user: dict = Depends(get_current_user)):
    return me_payload(user)

@router.post("/jobs")
def create_job_v1(user: dict = Depends(get_current_user)):
    return create_job_payload(user)

@router.get("/jobs/{job_id}")
def get_job_status_v1(job_id: str, user: dict = Depends(get_current_user)):
    return get_job_status_payload(job_id)