"""Tests for breweries router endpoints."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import create_app
from app.routers.breweries import _payload_has_semantic_changes
from app.schemas.breweries import BreweryCreate, BreweryUpdate


def create_mock_user_response(user_id: str, email: str, role: str = "operativo"):
    """Create a mock UserResponse from Supabase."""
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = email
    mock_user.user_metadata = {"role": role}
    mock_response = MagicMock()
    mock_response.user = mock_user
    return mock_response


@pytest.fixture

def admin_token() -> str:
    return "admin-mock-token"


@pytest.fixture
def operativo_token() -> str:
    return "operativo-mock-token"


@pytest.fixture(autouse=True)
def mock_supabase_auth():
    """Mock Supabase auth service for all tests in this module."""
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
def sample_brewery_id() -> UUID:
    return uuid4()


@pytest.fixture
def sample_brewery(sample_brewery_id: UUID) -> dict:
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


class TestSemanticEmbeddingChanges:
    """Tests for the semantic-change detector used on brewery updates."""

    def test_empty_payload_has_no_semantic_changes(self) -> None:
        payload = BreweryUpdate()
        assert _payload_has_semantic_changes(payload) is False

    def test_excluded_field_only_has_no_semantic_changes(self) -> None:
        payload = BreweryUpdate(nit="900123456-7", correo="brew@example.com")
        assert _payload_has_semantic_changes(payload) is False

    def test_direccion_only_has_no_semantic_changes(self) -> None:
        payload = BreweryUpdate(direccion="Calle 123")
        assert _payload_has_semantic_changes(payload) is False

    def test_phone_only_has_no_semantic_changes(self) -> None:
        payload = BreweryUpdate(celular_1="3001234567", celular_2="3007654321")
        assert _payload_has_semantic_changes(payload) is False

    def test_nombre_contacto_is_semantic(self) -> None:
        payload = BreweryUpdate(nombre_contacto="Maria Gomez")
        assert _payload_has_semantic_changes(payload) is True

    def test_semantic_field_triggers_change(self) -> None:
        payload = BreweryUpdate(nombre_cerveceria="Updated Brewery")
        assert _payload_has_semantic_changes(payload) is True

    def test_mixed_excluded_and_semantic_triggers_change(self) -> None:
        payload = BreweryUpdate(
            nombre_cerveceria="Updated Brewery",
            nit="900123456-7",
        )
        assert _payload_has_semantic_changes(payload) is True

    def test_none_value_for_semantic_field_is_ignored(self) -> None:
        payload = BreweryUpdate(nombre_cerveceria=None)
        assert _payload_has_semantic_changes(payload) is False


class TestBreweriesRouter:
    """Test brewery CRUD endpoints with mocked dependencies."""


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

    def test_list_breweries_does_not_redirect(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        """Ensure /breweries matches the other routers and returns 200, not 307."""

        def mock_list_all(_self):
            return []

        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.list_all", mock_list_all
        )

        response = client.get(
            "/breweries",
            headers={"Authorization": f"Bearer {admin_token}"},
            follow_redirects=False,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers.get("location") is None

    def test_list_breweries_with_trailing_slash_does_not_redirect(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        def mock_list_all(_self):
            return []

        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.list_all", mock_list_all
        )

        response = client.get(
            "/breweries/",
            headers={"Authorization": f"Bearer {admin_token}"},
            follow_redirects=False,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers.get("location") is None

    def test_create_brewery_does_not_redirect(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        """Ensure POST /breweries matches the other routers and returns 201, not 307."""
        from datetime import datetime, timezone

        def mock_create(_self, payload):
            return {
                "id": str(uuid4()),
                "nombre_cerveceria": payload.nombre_cerveceria,
                "ciudad": payload.ciudad,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.create", mock_create
        )

        response = client.post(
            "/breweries",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "New Brewery", "ciudad": "Medellín"},
            follow_redirects=False,
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.headers.get("location") is None

    def test_create_brewery_with_trailing_slash_does_not_redirect(
        self, client: TestClient, admin_token: str, monkeypatch
    ) -> None:
        from datetime import datetime, timezone

        def mock_create(_self, payload):
            return {
                "id": str(uuid4()),
                "nombre_cerveceria": payload.nombre_cerveceria,
                "ciudad": payload.ciudad,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.create", mock_create
        )

        response = client.post(
            "/breweries/",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "New Brewery", "ciudad": "Medellín"},
            follow_redirects=False,
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.headers.get("location") is None

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
        assert response.json()["detail"] == "No se encontró la cervecería"

    def test_update_brewery_returns_200(self, client: TestClient, admin_token: str, sample_brewery_id: UUID, sample_brewery: dict, monkeypatch) -> None:
        def mock_update(_self, brewery_id, payload, mark_embedding_pending=False):
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
            "app.services.brewery_service.BreweryService.update", lambda _self, _id, _payload, mark_embedding_pending=False: None
        )

        response = client.put(
            f"/breweries/{uuid4()}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "Updated"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró la cervecería"

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
        assert response.json()["detail"] == "No se encontró la cervecería"

    def test_create_brewery_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.post("/breweries", json={"nombre_cerveceria": "Test"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_breweries_without_auth_returns_401(self, client: TestClient) -> None:
        response = client.get("/breweries")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # --- embedding background task wiring ---

    @pytest.fixture(autouse=True)
    def mock_settings(self):
        """Patch settings so tests do not depend on real defaults."""
        with patch("app.routers.breweries.get_settings") as mock_get_settings:
            mock_settings = MagicMock()
            mock_settings.embeddings_enabled = False
            mock_get_settings.return_value = mock_settings
            yield mock_get_settings

    @pytest.fixture
    def mock_background_tasks(self):
        """Patch BackgroundTasks.add_task to capture scheduled work."""
        with patch("app.routers.breweries.BackgroundTasks.add_task") as mock_add_task:
            yield mock_add_task

    def test_create_brewery_schedules_embedding_refresh(
        self,
        client: TestClient,
        admin_token: str,
        monkeypatch,
        mock_background_tasks: MagicMock,
    ) -> None:
        from datetime import datetime, timezone

        new_id = str(uuid4())

        def mock_create(_self, payload):
            return {
                "id": new_id,
                "nombre_cerveceria": payload.nombre_cerveceria,
                "ciudad": payload.ciudad,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

        monkeypatch.setattr("app.services.brewery_service.BreweryService.create", mock_create)

        mock_settings = MagicMock()
        mock_settings.embeddings_enabled = True
        monkeypatch.setattr("app.routers.breweries.get_settings", lambda: mock_settings)

        response = client.post(
            "/breweries",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "New Brewery", "ciudad": "Medellín"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        mock_background_tasks.assert_called_once()
        scheduled_call = mock_background_tasks.call_args
        assert scheduled_call[0][0].__func__.__name__ == "refresh_embedding"
        assert scheduled_call[0][1] == new_id

    def test_update_brewery_schedules_embedding_refresh(
        self,
        client: TestClient,
        admin_token: str,
        sample_brewery_id: UUID,
        sample_brewery: dict,
        monkeypatch,
        mock_background_tasks: MagicMock,
    ) -> None:
        def mock_update(_self, brewery_id, payload, mark_embedding_pending=False):
            if brewery_id == sample_brewery_id:
                updated = sample_brewery.copy()
                updated["nombre_cerveceria"] = payload.nombre_cerveceria or updated["nombre_cerveceria"]
                updated["embedding_status"] = "pending" if mark_embedding_pending else updated.get("embedding_status")
                return updated
            return None

        monkeypatch.setattr("app.services.brewery_service.BreweryService.update", mock_update)

        mock_settings = MagicMock()
        mock_settings.embeddings_enabled = True
        monkeypatch.setattr("app.routers.breweries.get_settings", lambda: mock_settings)

        response = client.put(
            f"/breweries/{sample_brewery_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "Updated Brewery"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["embedding_status"] == "pending"
        mock_background_tasks.assert_called_once()
        scheduled_call = mock_background_tasks.call_args
        assert scheduled_call[0][0].__func__.__name__ == "refresh_embedding"
        assert scheduled_call[0][1] == str(sample_brewery_id)

    def test_update_brewery_excluded_field_does_not_schedule_embedding_refresh(
        self,
        client: TestClient,
        admin_token: str,
        sample_brewery_id: UUID,
        sample_brewery: dict,
        monkeypatch,
        mock_background_tasks: MagicMock,
    ) -> None:
        def mock_update(_self, brewery_id, payload, mark_embedding_pending=False):
            if brewery_id == sample_brewery_id:
                updated = sample_brewery.copy()
                updated["nit"] = payload.nit or updated.get("nit")
                updated["embedding_status"] = (
                    "pending" if mark_embedding_pending else updated.get("embedding_status")
                )
                return updated
            return None

        monkeypatch.setattr("app.services.brewery_service.BreweryService.update", mock_update)

        mock_settings = MagicMock()
        mock_settings.embeddings_enabled = True
        monkeypatch.setattr("app.routers.breweries.get_settings", lambda: mock_settings)

        response = client.put(
            f"/breweries/{sample_brewery_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nit": "900999999-9"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["embedding_status"] is None
        mock_background_tasks.assert_not_called()

    def test_update_brewery_disabled_embeddings_keeps_existing_status(
        self,
        client: TestClient,
        admin_token: str,
        sample_brewery_id: UUID,
        sample_brewery: dict,
        monkeypatch,
        mock_background_tasks: MagicMock,
    ) -> None:
        def mock_update(_self, brewery_id, payload, mark_embedding_pending=False):
            if brewery_id == sample_brewery_id:
                updated = sample_brewery.copy()
                updated["nombre_cerveceria"] = payload.nombre_cerveceria or updated["nombre_cerveceria"]
                return updated
            return None

        monkeypatch.setattr("app.services.brewery_service.BreweryService.update", mock_update)

        mock_settings = MagicMock()
        mock_settings.embeddings_enabled = False
        monkeypatch.setattr("app.routers.breweries.get_settings", lambda: mock_settings)

        response = client.put(
            f"/breweries/{sample_brewery_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "Updated Brewery"},
        )

        assert response.status_code == status.HTTP_200_OK
        mock_background_tasks.assert_not_called()

    def test_create_brewery_skips_embedding_when_disabled(
        self,
        client: TestClient,
        admin_token: str,
        monkeypatch,
        mock_background_tasks: MagicMock,
    ) -> None:
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

        mock_settings = MagicMock()
        mock_settings.embeddings_enabled = False
        monkeypatch.setattr("app.routers.breweries.get_settings", lambda: mock_settings)

        response = client.post(
            "/breweries",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "New Brewery", "ciudad": "Medellín"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        mock_background_tasks.assert_not_called()

    def test_update_brewery_skips_embedding_when_disabled(
        self,
        client: TestClient,
        admin_token: str,
        sample_brewery_id: UUID,
        sample_brewery: dict,
        monkeypatch,
        mock_background_tasks: MagicMock,
    ) -> None:
        def mock_update(_self, brewery_id, payload, mark_embedding_pending=False):
            if brewery_id == sample_brewery_id:
                updated = sample_brewery.copy()
                updated["nombre_cerveceria"] = payload.nombre_cerveceria or updated["nombre_cerveceria"]
                return updated
            return None

        monkeypatch.setattr("app.services.brewery_service.BreweryService.update", mock_update)

        mock_settings = MagicMock()
        mock_settings.embeddings_enabled = False
        monkeypatch.setattr("app.routers.breweries.get_settings", lambda: mock_settings)

        response = client.put(
            f"/breweries/{sample_brewery_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"nombre_cerveceria": "Updated Brewery"},
        )

        assert response.status_code == status.HTTP_200_OK
        mock_background_tasks.assert_not_called()


class TestReprocessEmbedding:
    """Tests for the admin-only reprocess embedding endpoint."""

    def test_reprocess_embedding_super_admin_returns_202(
        self,
        client: TestClient,
        admin_token: str,
        sample_brewery_id: UUID,
        sample_brewery: dict,
        monkeypatch,
    ) -> None:
        with patch("app.routers.breweries.BackgroundTasks.add_task") as mock_add_task:

            def mock_get_by_id(_self, brewery_id):
                if brewery_id == sample_brewery_id:
                    return sample_brewery
                return None

            monkeypatch.setattr(
                "app.services.brewery_service.BreweryService.get_by_id", mock_get_by_id
            )

            response = client.post(
                f"/breweries/{sample_brewery_id}/reprocess-embedding",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

            assert response.status_code == status.HTTP_202_ACCEPTED
            mock_add_task.assert_called_once()
            scheduled_call = mock_add_task.call_args
            assert scheduled_call[0][0].__func__.__name__ == "refresh_embedding"
            assert scheduled_call[0][1] == sample_brewery_id
            assert scheduled_call.kwargs.get("force") is True

    def test_reprocess_embedding_operativo_returns_403(
        self,
        client: TestClient,
        operativo_token: str,
        sample_brewery_id: UUID,
    ) -> None:
        response = client.post(
            f"/breweries/{sample_brewery_id}/reprocess-embedding",
            headers={"Authorization": f"Bearer {operativo_token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_reprocess_embedding_unknown_brewery_returns_404(
        self,
        client: TestClient,
        admin_token: str,
        monkeypatch,
    ) -> None:
        monkeypatch.setattr(
            "app.services.brewery_service.BreweryService.get_by_id", lambda _self, _id: None
        )

        response = client.post(
            f"/breweries/{uuid4()}/reprocess-embedding",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_reprocess_embedding_without_auth_returns_401(
        self,
        client: TestClient,
        sample_brewery_id: UUID,
    ) -> None:
        response = client.post(
            f"/breweries/{sample_brewery_id}/reprocess-embedding",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reprocess_embedding_runs_even_when_embeddings_disabled(
        self,
        client: TestClient,
        admin_token: str,
        sample_brewery_id: UUID,
        sample_brewery: dict,
        monkeypatch,
    ) -> None:
        """Forced reprocess is independent of the EMBEDDINGS_ENABLED flag."""
        with patch("app.routers.breweries.BackgroundTasks.add_task") as mock_add_task:

            def mock_get_by_id(_self, brewery_id):
                if brewery_id == sample_brewery_id:
                    return sample_brewery
                return None

            monkeypatch.setattr(
                "app.services.brewery_service.BreweryService.get_by_id", mock_get_by_id
            )
            monkeypatch.setattr(
                "app.routers.breweries.get_settings",
                lambda: MagicMock(embeddings_enabled=False),
            )

            response = client.post(
                f"/breweries/{sample_brewery_id}/reprocess-embedding",
                headers={"Authorization": f"Bearer {admin_token}"},
            )

            assert response.status_code == status.HTTP_202_ACCEPTED
            mock_add_task.assert_called_once()
            scheduled_call = mock_add_task.call_args
            assert scheduled_call.kwargs.get("force") is True
