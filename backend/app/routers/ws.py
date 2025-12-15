# routers/ws.py
from __future__ import annotations

import json
from typing import Dict

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from redis import asyncio as aioredis

from ..config import settings
from ..security import decode_token, AuthError

router = APIRouter(tags=["ws"])

connected_clients: Dict[str, WebSocket] = {}

@router.websocket("/ws/echo")
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

@router.websocket("/ws/jobs/{job_id}")
async def websocket_job_updates(
    websocket: WebSocket,
    job_id: str,
    token: str | None = Query(None),
):
    if not token:
        await websocket.close(code=1008)
        return

    try:
        decode_token(token)
    except AuthError:
        await websocket.close(code=1008)
        return
    except Exception:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    redis = aioredis.from_url(settings.redis_url)
    pubsub = redis.pubsub()
    channel_name = f"job_progress:{job_id}"
    await pubsub.subscribe(channel_name)

    try:
        await websocket.send_json({"event": "subscribed", "channel": channel_name, "job_id": job_id})

        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue

            data = message.get("data")
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
        try:
            await pubsub.unsubscribe(channel_name)
            await pubsub.close()
            await redis.close()
        finally:
            await websocket.close()
