import json
from datetime import datetime
from typing import Dict, List

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from redis import asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .config import settings
from .db import get_session, init_db
from .models import Project, ProjectCreate, ProjectRead, ProjectUpdate
from .api import router as mybuddy_router
from .security import get_current_user, decode_token, AuthError
from .tasks import long_running_task

app = FastAPI(title="Base Backend for Vite Apps")

# Public MyBuddy content API (no auth)
app.include_router(mybuddy_router)

# simple in-memory echo clients
connected_clients: Dict[str, WebSocket] = {}


def get_tenant_id_from_claims(user: dict) -> str | None:
    """Derive a tenant identifier from JWT claims.

    Falls back to subject if no explicit tenant claim is present.
    """
    return user.get("tenant") or user.get("sub")


@app.on_event("startup")
async def on_startup():
    # auto-create tables in dev
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """
    Return info about the current user based on the Keycloak JWT.
    Requires a valid Bearer token in the Authorization header.
    """
    return {
        "sub": user.get("sub"),
        "username": user.get("preferred_username") or user.get("email"),
        "email": user.get("email"),
        "name": user.get("name"),
        "realm_roles": user.get("realm_access", {}).get("roles", []),
        "client_roles": user.get("resource_access", {}),
        "raw_claims": user,  # handy for debugging, remove later if you want
    }

# ---------- AUTHED JOB ENDPOINTS ----------

@app.post("/jobs")
def create_job(user: dict = Depends(get_current_user)):
    subject = user.get("sub", "anonymous")
    result = long_running_task.delay(f"user:{subject}")
    return {"job_id": result.id}


@app.get("/jobs/{job_id}")
def get_job_status(job_id: str, user: dict = Depends(get_current_user)):
    from .celery_app import celery_app

    async_result = celery_app.AsyncResult(job_id)
    return {
        "job_id": job_id,
        "state": async_result.state,
        "result": async_result.result if async_result.ready() else None,
    }


# ---------- PROJECT CRUD (async SQLModel, tenant + soft delete) ----------

@app.post("/projects", response_model=ProjectRead)
async def create_project(
    data: ProjectCreate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    # derive tenant_id from token if not set explicitly
    tenant_id = data.tenant_id or get_tenant_id_from_claims(user)

    project = Project(
        name=data.name,
        description=data.description,
        tenant_id=tenant_id,
    )

    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


@app.get("/projects", response_model=List[ProjectRead])
async def list_projects(
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    tenant_id = get_tenant_id_from_claims(user)

    stmt = (
        select(Project)
        .where(
            Project.is_deleted == False,  # noqa: E712
            Project.tenant_id == tenant_id,
        )
        .order_by(Project.created_at.desc())
    )

    result = await session.execute(stmt)
    projects = result.scalars().all()
    return projects


@app.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    tenant_id = get_tenant_id_from_claims(user)
    project = await session.get(Project, project_id)
    if (
        not project
        or project.is_deleted
        or project.tenant_id != tenant_id
    ):
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.patch("/projects/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    tenant_id = get_tenant_id_from_claims(user)
    project = await session.get(Project, project_id)
    if (
        not project
        or project.is_deleted
        or project.tenant_id != tenant_id
    ):
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    await session.commit()
    await session.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: int,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    tenant_id = get_tenant_id_from_claims(user)
    project = await session.get(Project, project_id)
    if (
        not project
        or project.is_deleted
        or project.tenant_id != tenant_id
    ):
        # idempotent delete
        return JSONResponse(status_code=204, content=None)

    project.is_deleted = True
    project.deleted_at = datetime.utcnow()

    await session.commit()
    return JSONResponse(status_code=204, content=None)


# ---------- WEBSOCKETS ----------

@app.websocket("/ws/echo")
async def websocket_echo(websocket: WebSocket):
    await websocket.accept()
    client_id = f"{id(websocket)}"
    connected_clients[client_id] = websocket
    try:
        await websocket.send_text("Connected to websocket /ws/echo")
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        connected_clients.pop(client_id, None)
    except Exception:
        connected_clients.pop(client_id, None)
        await websocket.close()


@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_updates(
    websocket: WebSocket,
    job_id: str,
    token: str | None = Query(None),
):
    """Streams job progress via Redis pub/sub for authenticated clients."""
    if not token:
        await websocket.close(code=1008)
        return

    try:
        claims = decode_token(token)
    except AuthError:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    redis = aioredis.from_url(settings.redis_url)
    pubsub = redis.pubsub()
    channel_name = f"job_progress:{job_id}"
    await pubsub.subscribe(channel_name)

    try:
        await websocket.send_json(
            {"event": "subscribed", "channel": channel_name, "job_id": job_id}
        )

        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            data = message["data"]
            if isinstance(data, bytes):
                data = data.decode("utf-8")

            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                payload = {"raw": data}

            await websocket.send_json(payload)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
        await redis.close()
        await websocket.close()
