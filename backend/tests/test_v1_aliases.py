import pytest
from httpx import AsyncClient

from backend.app.main import app


@pytest.mark.asyncio
async def test_jobs_v1_alias_matches_unversioned(mock_user_sub):
    mock_user_sub("user-a")

    async with AsyncClient(app=app, base_url="http://test") as ac:
        res_v1 = await ac.post("/v1/jobs", headers={"Authorization": "Bearer test"})
        assert res_v1.status_code == 200
        job_id = res_v1.json()["job_id"]

        res_unversioned = await ac.get(
            f"/jobs/{job_id}", headers={"Authorization": "Bearer test"}
        )
        assert res_unversioned.status_code == 200

        res_v1_status = await ac.get(
            f"/v1/jobs/{job_id}", headers={"Authorization": "Bearer test"}
        )
        assert res_v1_status.status_code == 200
        assert res_v1_status.json() == res_unversioned.json()


@pytest.mark.asyncio
async def test_projects_v1_alias_matches_unversioned(mock_user_sub):
    mock_user_sub("tenant-a")

    async with AsyncClient(app=app, base_url="http://test") as ac:
        created_v1 = await ac.post(
            "/v1/projects",
            json={"name": "P1", "description": "desc"},
            headers={"Authorization": "Bearer test"},
        )
        assert created_v1.status_code == 200
        project_id = created_v1.json()["id"]

        listed_unversioned = await ac.get(
            "/projects",
            headers={"Authorization": "Bearer test"},
        )
        assert listed_unversioned.status_code == 200
        assert any(p["id"] == project_id for p in listed_unversioned.json())

        listed_v1 = await ac.get(
            "/v1/projects",
            headers={"Authorization": "Bearer test"},
        )
        assert listed_v1.status_code == 200
        assert listed_v1.json() == listed_unversioned.json()

        get_unversioned = await ac.get(
            f"/projects/{project_id}",
            headers={"Authorization": "Bearer test"},
        )
        get_v1 = await ac.get(
            f"/v1/projects/{project_id}",
            headers={"Authorization": "Bearer test"},
        )
        assert get_unversioned.status_code == 200
        assert get_v1.status_code == 200
        assert get_v1.json() == get_unversioned.json()
