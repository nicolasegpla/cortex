"""Tests for coffee farms router endpoints."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.coffee_farms import CoffeeFarmCreate, CoffeeFarmUpdate


def create_mock_user_response(user_id: str, email: str, role: str = "operativo"):
    """Create a mock UserResponse from Supabase."""
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = email
    mock_user.user_metadata = {"role": role}
    mock_response = MagicMock()
    mock_response.user = mock_user
    return mock_response


class TestCoffeeFarmsRouter:
    """Test coffee farm CRUD endpoints with mocked dependencies."""

    @pytest.fixture
    def admin_token(self) -> str:
        return "admin-mock-token"

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
                else:
                    from supabase_auth.errors import AuthApiError
                    raise AuthApiError("Invalid token", 401, "invalid_token")

            mock_client.auth.get_user = mock_get_user
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            yield

    @pytest.fixture
    def sample_coffee_farm_id(self) -> UUID:
        return uuid4()

    @pytest.fixture
    def sample_coffee_farm(self, sample_coffee_farm_id) -> dict:
        return {
            "id": str(sample_coffee_farm_id),
            "nombre_finca": "Finca Primavera",
            "razon_social": "Primavera S.A.",
            "ciudad": "Pitalito",
            "departamento": "Huila",
            "pais": "Colombia",
            "tipo_actividad": "Productor",
            "variedades_sembradas": ["Castillo", "Caturra"],
            "tipo_proceso": "Lavado",
            "nivel_tecnificacion": "Manual",
            "equipos": ["Secadero", "Despulpadora"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def test_create_coffee_farm_returns_201(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        def mock_create(_self, payload: CoffeeFarmCreate):
            return {
                "id": str(uuid4()),
                "nombre_finca": payload.nombre_finca,
                "ciudad": payload.ciudad,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        monkeypatch.setattr("app.services.coffee_farm_service.CoffeeFarmService.create", mock_create)

        response = client.post(
            "/coffee-farms",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_finca": "Finca Nueva", "ciudad": "Popayán"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["nombre_finca"] == "Finca Nueva"

    def test_list_coffee_farms_returns_200(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        def mock_list_all(_self):
            now = datetime.now(timezone.utc).isoformat()
            return [
                {"id": str(uuid4()), "nombre_finca": "Finca 1", "created_at": now, "updated_at": now},
                {"id": str(uuid4()), "nombre_finca": "Finca 2", "created_at": now, "updated_at": now},
            ]

        monkeypatch.setattr("app.services.coffee_farm_service.CoffeeFarmService.list_all", mock_list_all)

        response = client.get(
            "/coffee-farms",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2

    def test_get_coffee_farm_by_id_returns_200(
        self, client: TestClient, admin_token: str, sample_coffee_farm_id: UUID, sample_coffee_farm: dict, monkeypatch
    ) -> None:
        def mock_get_by_id(_self, coffee_farm_id):
            if coffee_farm_id == sample_coffee_farm_id:
                return sample_coffee_farm
            return None

        monkeypatch.setattr("app.services.coffee_farm_service.CoffeeFarmService.get_by_id", mock_get_by_id)

        response = client.get(
            f"/coffee-farms/{sample_coffee_farm_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nombre_finca"] == "Finca Primavera"
        assert data["variedades_sembradas"] == ["Castillo", "Caturra"]

    def test_get_coffee_farm_by_id_nonexistent_returns_404(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.coffee_farm_service.CoffeeFarmService.get_by_id", lambda _self, _id: None
        )

        response = client.get(
            f"/coffee-farms/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró la finca cafetera"

    def test_update_coffee_farm_returns_200(
        self, client: TestClient, admin_token: str, sample_coffee_farm_id: UUID, sample_coffee_farm: dict, monkeypatch
    ) -> None:
        def mock_update(_self, coffee_farm_id, payload: CoffeeFarmUpdate):
            if coffee_farm_id == sample_coffee_farm_id:
                updated = sample_coffee_farm.copy()
                updated["nombre_finca"] = payload.nombre_finca or updated["nombre_finca"]
                return updated
            return None

        monkeypatch.setattr("app.services.coffee_farm_service.CoffeeFarmService.update", mock_update)

        response = client.put(
            f"/coffee-farms/{sample_coffee_farm_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_finca": "Finca Actualizada"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nombre_finca"] == "Finca Actualizada"

    def test_update_coffee_farm_nonexistent_returns_404(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.coffee_farm_service.CoffeeFarmService.update", lambda _self, _id, _payload: None
        )

        response = client.put(
            f"/coffee-farms/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_finca": "Actualizada"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró la finca cafetera"

    def test_delete_coffee_farm_returns_204(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.coffee_farm_service.CoffeeFarmService.delete", lambda _self, _id: True
        )

        response = client.delete(
            f"/coffee-farms/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_coffee_farm_nonexistent_returns_404(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.coffee_farm_service.CoffeeFarmService.delete", lambda _self, _id: False
        )

        response = client.delete(
            f"/coffee-farms/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró la finca cafetera"

    def test_create_coffee_farm_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.post("/coffee-farms", json={"nombre_finca": "Test"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
