import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_child_get_enforces_ownership(mock_user_sub):
    # user A creates a child
    mock_user_sub("user-a")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        created = await ac.post(
            "/v1/children",
            json={"name": "Alice", "interests": ["space"], "avatar": "astronaut"},
            headers={"Authorization": "Bearer test"},
        )
        assert created.status_code == 200
        child_id = created.json()["id"]

    # user B cannot fetch it
    mock_user_sub("user-b")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get(
            f"/v1/children/{child_id}",
            headers={"Authorization": "Bearer test"},
        )
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_child_upsert_rejects_updating_other_users_child(mock_user_sub):
    # user A creates a child with explicit id
    mock_user_sub("user-a")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        created = await ac.post(
            "/v1/children",
            json={"id": "fixed-id", "name": "Alice", "interests": []},
            headers={"Authorization": "Bearer test"},
        )
        assert created.status_code == 200

    # user B tries to upsert using same id -> forbidden
    mock_user_sub("user-b")
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.post(
            "/v1/children",
            json={"id": "fixed-id", "name": "Mallory", "interests": []},
            headers={"Authorization": "Bearer test"},
        )
        assert res.status_code == 403
