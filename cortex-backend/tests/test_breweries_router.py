"""Tests for breweries router endpoints."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.breweries import BreweryCreate, BreweryUpdate


class TestBreweriesRouter:
    """Test brewery CRUD endpoints with mocked dependencies."""

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

    @pytest.fixture
    def sample_brewery_id(self) -> UUID:
        return uuid4()

    @pytest.fixture
    def sample_brewery(self, sample_brewery_id) -> dict:
        return {
            "id": str(sample_brewery_id),
            "nombre_cerveceria": "Test Brewery",
            "razon_social": "Test Brewery S.A.",
            "ciudad": "Bogotá",
            "pais": "Colombia",
            "tipo_operacion": "planta_propia",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def test_create_brewery_returns_201(self, client: TestClient, admin_token: str, monkeypatch) -> None:
        from datetime import datetime, timezone

        def mock_create(_self, payload):
            return {
                "id": str(uuid4()),
                "nombre_cerveceria": payload.nombre_cerveceria,
                "ciudad": payload.ciudad,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        monkeypatch.setattr("app.services.brewery_service.BreweryService.create", mock_create)

        response = client.post(
            "/breweries",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "New Brewery", "ciudad": "Medellín"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["nombre_cerveceria"] == "New Brewery"

    def test_list_breweries_returns_200(self, client: TestClient, admin_token: str, monkeypatch) -> None:
        from datetime import datetime, timezone

        def mock_list_all(_self):
            now = datetime.now(timezone.utc).isoformat()
            return [
                {"id": str(uuid4()), "nombre_cerveceria": "Brewery 1", "created_at": now, "updated_at": now},
                {"id": str(uuid4()), "nombre_cerveceria": "Brewery 2", "created_at": now, "updated_at": now},
            ]

        monkeypatch.setattr("app.services.brewery_service.BreweryService.list_all", mock_list_all)

        response = client.get(
            "/breweries",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2

    def test_get_brewery_by_id_returns_200(self, client: TestClient, admin_token: str, sample_brewery_id: UUID, sample_brewery: dict, monkeypatch) -> None:
        def mock_get_by_id(_self, brewery_id):
            if brewery_id == sample_brewery_id:
                return sample_brewery
            return None

        monkeypatch.setattr("app.services.brewery_service.BreweryService.get_by_id", mock_get_by_id)

        response = client.get(
            f"/breweries/{sample_brewery_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nombre_cerveceria"] == "Test Brewery"

    def test_get_brewery_by_id_nonexistent_returns_404(self, client: TestClient, admin_token: str, monkeypatch) -> None:
        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.get_by_id", lambda _self, _id: None
        )

        response = client.get(
            f"/breweries/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_brewery_returns_200(self, client: TestClient, admin_token: str, sample_brewery_id: UUID, sample_brewery: dict, monkeypatch) -> None:
        def mock_update(_self, brewery_id, payload):
            if brewery_id == sample_brewery_id:
                updated = sample_brewery.copy()
                updated["nombre_cerveceria"] = payload.nombre_cerveceria or updated["nombre_cerveceria"]
                return updated
            return None

        monkeypatch.setattr("app.services.brewery_service.BreweryService.update", mock_update)

        response = client.put(
            f"/breweries/{sample_brewery_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "Updated Brewery"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nombre_cerveceria"] == "Updated Brewery"

    def test_update_brewery_nonexistent_returns_404(self, client: TestClient, admin_token: str, monkeypatch) -> None:
        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.update", lambda _self, _id, _payload: None
        )

        response = client.put(
            f"/breweries/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "Updated"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_brewery_returns_204(self, client: TestClient, admin_token: str, monkeypatch) -> None:
        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.delete", lambda _self, _id: True
        )

        response = client.delete(
            f"/breweries/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_brewery_nonexistent_returns_404(self, client: TestClient, admin_token: str, monkeypatch) -> None:
        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.delete", lambda _self, _id: False
        )

        response = client.delete(
            f"/breweries/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_brewery_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.post("/breweries", json={"nombre_cerveceria": "Test"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_breweries_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.get("/breweries")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
