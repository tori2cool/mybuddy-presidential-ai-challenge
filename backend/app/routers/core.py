# routers/core.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..db import get_session
from ..models import Project, ProjectCreate, ProjectRead, ProjectUpdate
from ..security import get_current_user
from ..tasks import long_running_task

router = APIRouter(tags=["core"])

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

def create_job_payload(user: dict) -> dict:
    subject = user.get("sub", "anonymous")
    result = long_running_task.delay(f"user:{subject}")
    return {"job_id": result.id}

def get_job_status_payload(job_id: str) -> dict:
    from ..celery_app import celery_app
    async_result = celery_app.AsyncResult(job_id)
    return {
        "job_id": job_id,
        "state": async_result.state,
        "result": async_result.result if async_result.ready() else None,
    }

@router.get("/v1/me")
async def me_v1(user: dict = Depends(get_current_user)):
    return me_payload(user)

@router.post("/v1/jobs")
def create_job_v1(user: dict = Depends(get_current_user)):
    return create_job_payload(user)

@router.get("/v1/jobs/{job_id}")
def get_job_status_v1(job_id: str, user: dict = Depends(get_current_user)):
    return get_job_status_payload(job_id)

@router.post("/v1/projects", response_model=ProjectRead)
async def create_project_v1(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    tenant_id = data.tenant_id or get_tenant_id_from_claims(user)
    project = Project(name=data.name, description=data.description, tenant_id=tenant_id)
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

@router.get("/v1/projects", response_model=List[ProjectRead])
async def list_projects_v1(
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    tenant_id = get_tenant_id_from_claims(user)
    stmt = (
        select(Project)
        .where(Project.is_deleted == False, Project.tenant_id == tenant_id)
        .order_by(Project.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()
