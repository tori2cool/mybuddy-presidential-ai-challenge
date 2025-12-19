import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client():
    # Import inside fixture so it uses the actual app wiring used in production.
    from backend.app.main import app

    return TestClient(app)


def test_openapi_includes_v1_me(client: TestClient):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()

    paths = schema.get("paths", {})
    assert "/v1/me" in paths, "Expected /v1/me to be present in OpenAPI paths"


def test_openapi_includes_v1_children_get(client: TestClient):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()

    paths = schema.get("paths", {})
    assert "/v1/children" in paths, "Expected /v1/children to be present in OpenAPI paths"
    assert "get" in paths["/v1/children"], "Expected GET /v1/children operation to be present"


def test_get_v1_children_not_405(client: TestClient):
    # We don't assert auth semantics here (depends on Keycloak config),
    # only that the route exists and is a GET handler.
    resp = client.get("/v1/children")
    assert resp.status_code != 405, "GET /v1/children should not return 405 (method not allowed)"
