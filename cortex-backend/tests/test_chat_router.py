"""Tests for chat SSE streaming router."""

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


class TestChatRouter:
    """Test chat streaming endpoint with mocked dependencies."""

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
                elif token == "admin-mock-token":
                    return create_mock_user_response(
                        "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        "admin@example.com",
                        "super_admin",
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
        mock_instance.get_decrypted_key.return_value = "sk-test-key"
        yield mock_instance

    @pytest.fixture
    def mock_registry_get_adapter(self):
        """Mock ProviderRegistry.get_adapter to return a mock adapter."""
        with patch("app.routers.chat.registry.get_adapter") as mock_get:
            mock_adapter = MagicMock()

            async def mock_stream(*args, **kwargs):
                yield "Hello"
                yield " world"
                yield "!"

            mock_adapter.stream_chat = mock_stream
            mock_get.return_value = mock_adapter
            yield mock_get

    @pytest.fixture
    def client(self, mock_credential_service):
        """Create a TestClient with dependency overrides."""
        from app.main import create_app
        from app.routers.chat import get_credential_service

        app = create_app()
        app.dependency_overrides[get_credential_service] = lambda: mock_credential_service
        from fastapi.testclient import TestClient
        yield TestClient(app)
        app.dependency_overrides.clear()

    def test_chat_stream_returns_sse_delta_events(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter
    ):
        """RED: POST /chat/stream returns SSE with event: delta chunks."""
        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

        # Parse SSE events
        body = response.text
        assert "event: delta" in body
        assert "data: Hello" in body
        assert "event: done" in body

    def test_chat_stream_gemini_returns_sse_delta_events(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter
    ):
        """TRIANGULATE: POST /chat/stream with gemini provider returns SSE deltas."""
        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gemini-2.0-flash",
                "provider": "gemini",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        body = response.text
        assert "event: delta" in body
        assert "data: Hello" in body
        assert "event: done" in body
        mock_registry_get_adapter.assert_called_once_with("gemini")

    def test_chat_stream_deepseek_returns_sse_delta_events(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter
    ):
        """TRIANGULATE: POST /chat/stream with deepseek provider returns SSE deltas."""
        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "deepseek-chat",
                "provider": "deepseek",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        body = response.text
        assert "event: delta" in body
        assert "data: Hello" in body
        assert "event: done" in body
        mock_registry_get_adapter.assert_called_once_with("deepseek")

    def test_chat_stream_unauthorized_returns_401(self, client: TestClient) -> None:
        """TRIANGULATE: no auth token returns 401."""
        response = client.post(
            "/chat/stream",
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_chat_stream_missing_credential_returns_400(
        self, client: TestClient, auth_token: str, mock_credential_service
    ):
        """TRIANGULATE: missing credential returns 400 with error."""
        mock_credential_service.get_decrypted_key.return_value = None

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "credential" in data["detail"].lower() or "provider" in data["detail"].lower()

    def test_chat_stream_provider_error_returns_sse_error(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter
    ):
        """TRIANGULATE: adapter error returns SSE event: error."""
        async def error_stream(*args, **kwargs):
            raise ValueError("Provider API error")
            yield ""  # noqa: unreachable

        mock_registry_get_adapter.return_value.stream_chat = error_stream

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert "event: error" in body

    def test_chat_stream_invalid_provider_returns_422(
        self, client: TestClient, auth_token: str
    ):
        """TRIANGULATE: invalid provider literal is rejected by schema validation (422)."""
        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "invalid-provider",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_chat_stream_invalid_model_returns_400(self, client: TestClient, auth_token: str):
        """TRIANGULATE: invalid model in request is rejected by schema validation."""
        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "not-a-provider",  # Invalid literal
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_chat_stream_resolves_adapter_by_provider(
        self, client: TestClient, auth_token: str, mock_registry_get_adapter, mock_credential_service
    ):
        """TRIANGULATE: correct adapter is resolved based on provider."""
        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "claude-3-5-sonnet-20241022",
                "provider": "anthropic",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        mock_registry_get_adapter.assert_called_once_with("anthropic")
        mock_credential_service.get_decrypted_key.assert_called_once()
        call_args = mock_credential_service.get_decrypted_key.call_args
        assert call_args[0][1] == "anthropic"
