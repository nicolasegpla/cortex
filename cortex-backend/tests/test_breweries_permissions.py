"""Tests for role-based access control on brewery endpoints."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient


def create_mock_user_response(user_id: str, email: str, role: str = "operativo"):
    """Create a mock UserResponse from Supabase."""
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = email
    mock_user.user_metadata = {"role": role}
    mock_response = MagicMock()
    mock_response.user = mock_user
    return mock_response


class TestBreweryPermissions:
    """Test that role-based access control works correctly on brewery endpoints."""

    @pytest.fixture
    def admin_token(self) -> str:
        return "admin-mock-token"

    @pytest.fixture
    def operativo_token(self) -> str:
        return "operativo-mock-token"

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

    @pytest.fixture(autouse=True)
    def mock_supabase_auth(self):
        """Mock Supabase auth service for all tests."""
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()

            def mock_get_user(token):
                if token == "admin-mock-token":
                    return create_mock_user_response(
                        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        "admin@example.com",
                        "super_admin",
                    )
                elif token == "operativo-mock-token":
                    return create_mock_user_response(
                        "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        "user@example.com",
                        "operativo",
                    )
                elif token == "invalid-token":
                    from supabase_auth.errors import AuthApiError
                    raise AuthApiError("Invalid token", 401, "invalid_token")
                else:
                    from supabase_auth.errors import AuthApiError
                    raise AuthApiError("Invalid token", 401, "invalid_token")

            mock_client.auth.get_user = mock_get_user
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            yield

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
