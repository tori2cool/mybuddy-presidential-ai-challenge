import pytest
from httpx import AsyncClient

from backend.app.main import app


@pytest.mark.asyncio
async def test_children_requires_auth_returns_401():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/v1/children")
    assert res.status_code == 401
