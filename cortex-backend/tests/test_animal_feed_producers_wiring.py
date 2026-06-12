"""Minimal TDD coverage for animal feed producers router wiring."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient


def create_mock_user_response(user_id: str, email: str, role: str = "operativo"):
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = email
    mock_user.user_metadata = {"role": role}
    mock_response = MagicMock()
    mock_response.user = mock_user
    return mock_response


class TestAnimalFeedProducersWiring:
    @pytest.fixture
    def operativo_token(self) -> str:
        return "operativo-mock-token"

    @pytest.fixture(autouse=True)
    def mock_supabase_auth(self):
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()

            def mock_get_user(token):
                if token == "operativo-mock-token":
                    return create_mock_user_response(
                        "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        "user@example.com",
                        "operativo",
                    )
                raise ValueError("invalid token")

            mock_client.auth.get_user = mock_get_user
            mock_service = MagicMock()
            mock_service.get_client.return_value = mock_client
            mock_get_service.return_value = mock_service

            yield

    def test_create_app_includes_animal_feed_producer_routes(self) -> None:
        from app.main import create_app

        app = create_app()
        route_map = {
            (route.path, method)
            for route in app.routes
            if hasattr(route, "methods")
            for method in route.methods
        }

        assert ("/animal-feed-producers", "POST") in route_map
        assert ("/animal-feed-producers", "GET") in route_map
        assert ("/animal-feed-producers/{producer_id}", "GET") in route_map
        assert ("/animal-feed-producers/{producer_id}", "PUT") in route_map
        assert ("/animal-feed-producers/{producer_id}", "DELETE") in route_map

    def test_delete_animal_feed_producer_for_operativo_returns_403(
        self, client: TestClient, operativo_token: str, monkeypatch
    ) -> None:
        from app.services.animal_feed_producer_service import AnimalFeedProducerService

        now = datetime.now(timezone.utc).isoformat()

        def mock_delete(_self, _producer_id):
            return True

        def mock_list_all(_self):
            return [
                {"id": str(uuid4()), "razon_social": "Nutri Feed S.A.", "created_at": now, "updated_at": now}
            ]

        monkeypatch.setattr(AnimalFeedProducerService, "delete", mock_delete)
        monkeypatch.setattr(AnimalFeedProducerService, "list_all", mock_list_all)

        response = client.delete(
            f"/animal-feed-producers/{uuid4()}",
            headers={"Authorization": f"Bearer {operativo_token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
