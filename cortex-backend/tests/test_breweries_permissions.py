"""Tests for role-based access control on brewery endpoints."""

from uuid import uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient


class TestBreweryPermissions:
    """Test that role-based access control works correctly on brewery endpoints."""

    @pytest.fixture
    def admin_token(self) -> str:
        from app.core.config import get_settings
        from jwt import encode as jwt_encode

        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "email": "admin@example.com",
            "user_metadata": {"role": "super_admin"},
        }
        return jwt_encode(payload, secret, algorithm="HS256")

    @pytest.fixture
    def operativo_token(self) -> str:
        from app.core.config import get_settings
        from jwt import encode as jwt_encode

        settings = get_settings()
        secret = settings.supabase_service_key or "test-secret"
        payload = {
            "sub": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
            "email": "user@example.com",
            "user_metadata": {"role": "operativo"},
        }
        return jwt_encode(payload, secret, algorithm="HS256")

    @pytest.fixture(autouse=True)
    def mock_brewery_service(self, monkeypatch):
        """Mock BreweryService to avoid real Supabase calls."""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()

        def mock_create(_self, payload):
            return {
                "id": str(uuid4()),
                "nombre_cerveceria": payload.nombre_cerveceria,
                "created_at": now,
                "updated_at": now,
            }

        def mock_list_all(_self):
            return [
                {"id": str(uuid4()), "nombre_cerveceria": "Brewery 1", "created_at": now, "updated_at": now},
            ]

        def mock_get_by_id(_self, brewery_id):
            return {
                "id": str(brewery_id),
                "nombre_cerveceria": "Test Brewery",
                "created_at": now,
                "updated_at": now,
            }

        def mock_update(_self, brewery_id, payload):
            return {
                "id": str(brewery_id),
                "nombre_cerveceria": payload.nombre_cerveceria or "Test",
                "created_at": now,
                "updated_at": now,
            }

        def mock_delete(_self, brewery_id):
            return True

        monkeypatch.setattr("app.services.brewery_service.BreweryService.create", mock_create)
        monkeypatch.setattr("app.services.brewery_service.BreweryService.list_all", mock_list_all)
        monkeypatch.setattr("app.services.brewery_service.BreweryService.get_by_id", mock_get_by_id)
        monkeypatch.setattr("app.services.brewery_service.BreweryService.update", mock_update)
        monkeypatch.setattr("app.services.brewery_service.BreweryService.delete", mock_delete)

    @pytest.mark.parametrize("endpoint,method,payload", [
        ("/breweries", "post", {"nombre_cerveceria": "Test"}),
        ("/breweries", "get", None),
        (f"/breweries/{uuid4()}", "get", None),
        (f"/breweries/{uuid4()}", "put", {"nombre_cerveceria": "Updated"}),
    ])
    def test_super_admin_can_access_cru_endpoints(
        self, client: TestClient, admin_token: str, endpoint: str, method: str, payload: dict | None
    ) -> None:
        """super_admin should be able to access all CRU endpoints."""
        kwargs = {"headers": {"Authorization": f"Bearer {admin_token}"}}
        if payload:
            kwargs["json"] = payload

        response = getattr(client, method)(endpoint, **kwargs)

        assert response.status_code not in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ], f"super_admin should access {method.upper()} {endpoint}"

    @pytest.mark.parametrize("endpoint,method,payload", [
        ("/breweries", "post", {"nombre_cerveceria": "Test"}),
        ("/breweries", "get", None),
        (f"/breweries/{uuid4()}", "get", None),
        (f"/breweries/{uuid4()}", "put", {"nombre_cerveceria": "Updated"}),
    ])
    def test_operativo_can_access_cru_endpoints(
        self, client: TestClient, operativo_token: str, endpoint: str, method: str, payload: dict | None
    ) -> None:
        """operativo should be able to access CRU endpoints (but not Delete)."""
        kwargs = {"headers": {"Authorization": f"Bearer {operativo_token}"}}
        if payload:
            kwargs["json"] = payload

        response = getattr(client, method)(endpoint, **kwargs)

        assert response.status_code not in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ], f"operativo should access {method.upper()} {endpoint}"

    def test_super_admin_can_delete_brewery(self, client: TestClient, admin_token: str) -> None:
        """super_admin should be able to delete breweries."""
        response = client.delete(
            f"/breweries/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_operativo_cannot_delete_brewery(self, client: TestClient, operativo_token: str) -> None:
        """operativo should get 403 when trying to delete breweries."""
        response = client.delete(
            f"/breweries/{uuid4()}",
            headers={"Authorization": f"Bearer {operativo_token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_without_auth_returns_401(self, client: TestClient) -> None:
        """Unauthenticated requests to delete should return 401."""
        response = client.delete(f"/breweries/{uuid4()}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
