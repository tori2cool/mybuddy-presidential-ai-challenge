import os
import pytest


@pytest.fixture(autouse=True, scope="session")
def _set_test_env():
    # Prevent accidental JWKS fetch in tests.
    os.environ.setdefault("KEYCLOAK_JWKS_URL", "http://invalid.local/jwks")
    os.environ.setdefault("KEYCLOAK_ISSUER", "")
    os.environ.setdefault("KEYCLOAK_AUDIENCE", "")


@pytest.fixture
def mock_user_sub(monkeypatch):
    """Patch get_current_user so tests can control ownership scoping."""
    from app import api as api_module
    from app import main as main_module

    def _apply(sub: str):
        async def _fake_user():
            return {"sub": sub}

        # Override on both the router (for api.py endpoints) and app (for main.py endpoints)
        api_module.router.dependency_overrides[api_module.get_current_user] = _fake_user
        main_module.app.dependency_overrides[main_module.get_current_user] = _fake_user

    yield _apply

    api_module.router.dependency_overrides.pop(api_module.get_current_user, None)
    main_module.app.dependency_overrides.pop(main_module.get_current_user, None)
