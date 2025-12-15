import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_v1_me_alias_matches_me(mock_user_sub):
    mock_user_sub("user-a")

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res_me = await ac.get("/me", headers={"Authorization": "Bearer test"})
        res_v1 = await ac.get("/v1/me", headers={"Authorization": "Bearer test"})

    assert res_me.status_code == 200
    assert res_v1.status_code == 200
    assert res_me.json() == res_v1.json()
