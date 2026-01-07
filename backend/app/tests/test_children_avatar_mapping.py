import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_child_avatar_id_roundtrip(async_client: AsyncClient, auth_headers: dict):
    # Create with avatarId and interests, ensure response returns same avatarId.
    payload = {
        "name": "Ava",
        "birthday": "2019-01-01",
        "interests": ["00000000-0000-0000-0000-000000000001"],
        "avatarId": "00000000-0000-0000-0000-000000000010",
    }

    resp = await async_client.post("/api/v1/children", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["avatarId"] == payload["avatarId"]
    assert data["interests"] == payload["interests"]


@pytest.mark.anyio
async def test_child_avatar_id_present_in_list(async_client: AsyncClient, auth_headers: dict):
    payload = {
        "name": "Ben",
        "birthday": "2018-05-05",
        "interests": ["00000000-0000-0000-0000-000000000002"],
        "avatarId": "00000000-0000-0000-0000-000000000011",
    }

    create = await async_client.post("/api/v1/children", json=payload, headers=auth_headers)
    assert create.status_code == 200, create.text

    resp = await async_client.get("/api/v1/children", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    rows = resp.json()

    found = next(r for r in rows if r["id"] == create.json()["id"])
    assert found["avatarId"] == payload["avatarId"]
