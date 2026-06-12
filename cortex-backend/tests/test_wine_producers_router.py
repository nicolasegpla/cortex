"""Tests for wine producers router endpoints."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas.wine_producers import WineProducerCreate, WineProducerUpdate


def create_mock_user_response(user_id: str, email: str, role: str = "operativo"):
    """Create a mock UserResponse from Supabase."""
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = email
    mock_user.user_metadata = {"role": role}
    mock_response = MagicMock()
    mock_response.user = mock_user
    return mock_response


class TestWineProducersRouter:
    """Test wine producer CRUD endpoints with mocked dependencies."""

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
    def sample_producer_id(self) -> UUID:
        return uuid4()

    @pytest.fixture
    def sample_producer(self, sample_producer_id) -> dict:
        return {
            "id": str(sample_producer_id),
            "nombre_comercial": "Viñedos del Valle",
            "razon_social": "Viñedos del Valle S.A.S.",
            "nit": "123456789",
            "ciudad": "Bogotá",
            "pais": "Colombia",
            "marcas": ["Valle Tinto", "Valle Blanco"],
            "tipo_uva": ["Cabernet Sauvignon", "Chardonnay"],
            "tipo_vino": ["Tinto", "Blanco"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def test_create_wine_producer_returns_201(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        def mock_create(_self, payload: WineProducerCreate):
            return {
                "id": str(uuid4()),
                "nombre_comercial": payload.nombre_comercial,
                "ciudad": payload.ciudad,
                "marcas": payload.marcas,
                "tipo_uva": payload.tipo_uva,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.create", mock_create
        )

        response = client.post(
            "/wine-producers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "nombre_comercial": "Viñedos del Valle",
                "ciudad": "Bogotá",
                "marcas": ["Valle Tinto", "Valle Blanco"],
                "tipo_uva": ["Cabernet Sauvignon", "Chardonnay"],
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["nombre_comercial"] == "Viñedos del Valle"
        assert data["marcas"] == ["Valle Tinto", "Valle Blanco"]
        assert data["tipo_uva"] == ["Cabernet Sauvignon", "Chardonnay"]

    def test_create_wine_producer_without_nombre_comercial_returns_422(
        self, client: TestClient, admin_token: str
    ) -> None:
        response = client.post(
            "/wine-producers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"ciudad": "Bogotá"},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_wine_producers_returns_200(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        def mock_list_all(_self):
            now = datetime.now(timezone.utc).isoformat()
            return [
                {"id": str(uuid4()), "nombre_comercial": "Viñedos del Valle", "created_at": now, "updated_at": now},
                {"id": str(uuid4()), "nombre_comercial": "Bodega Real", "created_at": now, "updated_at": now},
            ]

        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.list_all",
            mock_list_all,
        )

        response = client.get(
            "/wine-producers",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2

    def test_get_wine_producer_by_id_returns_200(
        self,
        client: TestClient,
        admin_token: str,
        sample_producer_id: UUID,
        sample_producer: dict,
        monkeypatch,
    ) -> None:
        def mock_get_by_id(_self, producer_id):
            if producer_id == sample_producer_id:
                return sample_producer
            return None

        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.get_by_id",
            mock_get_by_id,
        )

        response = client.get(
            f"/wine-producers/{sample_producer_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nombre_comercial"] == "Viñedos del Valle"
        assert data["marcas"] == ["Valle Tinto", "Valle Blanco"]

    def test_get_wine_producer_by_id_nonexistent_returns_404(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.get_by_id",
            lambda _self, _id: None,
        )

        response = client.get(
            f"/wine-producers/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró el productor de vinos"

    def test_update_wine_producer_returns_200(
        self,
        client: TestClient,
        admin_token: str,
        sample_producer_id: UUID,
        sample_producer: dict,
        monkeypatch,
    ) -> None:
        def mock_update(_self, producer_id, payload: WineProducerUpdate):
            if producer_id == sample_producer_id:
                updated = sample_producer.copy()
                updated["nombre_comercial"] = payload.nombre_comercial or updated["nombre_comercial"]
                return updated
            return None

        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.update",
            mock_update,
        )

        response = client.put(
            f"/wine-producers/{sample_producer_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_comercial": "Viñedos del Valle Actualizado"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["nombre_comercial"] == "Viñedos del Valle Actualizado"

    def test_update_wine_producer_nonexistent_returns_404(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.update",
            lambda _self, _id, _payload: None,
        )

        response = client.put(
            f"/wine-producers/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_comercial": "Actualizado"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró el productor de vinos"

    def test_delete_wine_producer_returns_204(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.delete",
            lambda _self, _id: True,
        )

        response = client.delete(
            f"/wine-producers/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_wine_producer_nonexistent_returns_404(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        monkeypatch.setattr(
            "app.services.wine_producer_service.WineProducerService.delete",
            lambda _self, _id: False,
        )

        response = client.delete(
            f"/wine-producers/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró el productor de vinos"

    def test_create_wine_producer_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.post("/wine-producers", json={"nombre_comercial": "Test"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
