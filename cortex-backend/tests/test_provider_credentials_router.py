"""Tests for provider credentials router."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import create_app


def create_mock_user_response(user_id: str, email: str, role: str = "operativo"):
    """Create a mock UserResponse from Supabase."""
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = email
    mock_user.user_metadata = {"role": role}
    mock_response = MagicMock()
    mock_response.user = mock_user
    return mock_response


class TestProviderCredentialsRouter:
    """Test provider credential CRUD endpoints."""

    @pytest.fixture
    def auth_token(self) -> str:
        return "test-mock-token"

    @pytest.fixture(autouse=True)
    def mock_supabase_auth(self):
        """Mock Supabase auth service for all tests."""
        with patch("app.core.security.get_supabase_service") as mock_get_service:
            mock_client = MagicMock()

            def mock_get_user(token):
                if token == "test-mock-token":
                    return create_mock_user_response(
                        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
    def mock_credential_service(self):
        """Mock ProviderCredentialService via dependency override."""
        mock_instance = MagicMock()
        mock_instance.get_credentials.return_value = []
        mock_instance.save_credential.return_value = MagicMock(
            id="cred-1", provider="openai", label="My Key", validated_at="2024-06-06T12:00:00+00:00"
        )
        mock_instance.delete_credential.return_value = True
        from unittest.mock import AsyncMock
        mock_instance.test_credential = AsyncMock(return_value=True)
        yield mock_instance

    @pytest.fixture
    def client(self, mock_credential_service):
        """Create a TestClient with dependency overrides."""
        from app.routers.provider_credentials import get_credential_service

        app = create_app()
        app.dependency_overrides[get_credential_service] = lambda: mock_credential_service
        from fastapi.testclient import TestClient
        yield TestClient(app)
        app.dependency_overrides.clear()

    def test_list_credentials_returns_200(self, client: TestClient, auth_token: str, mock_credential_service) -> None:
        """RED: GET /provider-credentials returns list without encrypted keys."""
        mock_credential_service.get_credentials.return_value = [
            MagicMock(id="cred-1", provider="openai", label="My Key", validated_at=None),
            MagicMock(id="cred-2", provider="anthropic", label=None, validated_at="2024-01-01T00:00:00Z"),
        ]

        response = client.get(
            "/provider-credentials",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        assert data[0]["provider"] == "openai"
        assert data[0]["label"] == "My Key"
        assert "encrypted_api_key" not in data[0]
        assert "api_key" not in data[0]

    def test_list_credentials_without_auth_returns_401(self, client: TestClient) -> None:
        """TRIANGULATE: no auth returns 401."""
        response = client.get("/provider-credentials")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_credential_returns_201(self, client: TestClient, auth_token: str, mock_credential_service) -> None:
        """RED: POST /provider-credentials creates a credential."""
        mock_credential_service.save_credential.return_value = MagicMock(
            id="cred-1", provider="openai", label="My OpenAI Key", validated_at="2024-06-06T12:00:00+00:00"
        )

        response = client.post(
            "/provider-credentials",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "provider": "openai",
                "api_key": "sk-test-key",
                "label": "My OpenAI Key",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["provider"] == "openai"
        assert data["label"] == "My OpenAI Key"
        assert "api_key" not in data

        mock_credential_service.save_credential.assert_called_once()
        call_args = mock_credential_service.save_credential.call_args
        assert call_args.kwargs["provider"] == "openai"
        assert call_args.kwargs["api_key"] == "sk-test-key"

    def test_create_credential_without_auth_returns_401(self, client: TestClient) -> None:
        """TRIANGULATE: no auth returns 401."""
        response = client.post(
            "/provider-credentials",
            json={"provider": "openai", "api_key": "sk-test"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_credential_returns_204(self, client: TestClient, auth_token: str, mock_credential_service) -> None:
        """RED: DELETE /provider-credentials/{provider} deletes credential."""
        response = client.delete(
            "/provider-credentials/openai",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_credential_service.delete_credential.assert_called_once_with(
            user_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            provider="openai",
        )

    def test_delete_credential_not_found_returns_404(self, client: TestClient, auth_token: str, mock_credential_service) -> None:
        """TRIANGULATE: deleting non-existent credential returns 404."""
        mock_credential_service.delete_credential.return_value = False

        response = client.delete(
            "/provider-credentials/openai",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "No se encontró una credencial para el proveedor 'openai'"

    def test_test_credential_returns_200(self, client: TestClient, auth_token: str, mock_credential_service) -> None:
        """RED: POST /provider-credentials/test validates a credential."""
        response = client.post(
            "/provider-credentials/test",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "provider": "openai",
                "api_key": "sk-test-key",
                "model": "gpt-4o",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is True
        mock_credential_service.test_credential.assert_called_once_with(
            provider="openai", api_key="sk-test-key", model="gpt-4o"
        )

    def test_test_credential_invalid_returns_200_with_valid_false(
        self, client: TestClient, auth_token: str, mock_credential_service
    ) -> None:
        """TRIANGULATE: invalid credential returns valid: false."""
        mock_credential_service.test_credential.return_value = False

        response = client.post(
            "/provider-credentials/test",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "provider": "openai",
                "api_key": "sk-bad-key",
                "model": "gpt-4o",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
