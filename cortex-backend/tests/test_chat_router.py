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
    def client(self, mock_credential_service, mock_tool_registry):
        """Create a TestClient with dependency overrides."""
        from app.main import create_app
        from app.routers.chat import get_credential_service, get_tool_registry

        app = create_app()
        app.dependency_overrides[get_credential_service] = lambda: mock_credential_service
        app.dependency_overrides[get_tool_registry] = lambda: mock_tool_registry
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

    # --- Tool path tests (Phase 3: chat-db-access) ---

    def test_chat_stream_with_tools_uses_tool_path(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter
    ):
        """RED: When enable_tools=True and adapter supports tools, use stream_chat_with_tools."""
        mock_adapter = mock_registry_get_adapter.return_value
        mock_adapter.supports_tools.return_value = True

        called_with_tools = False

        async def mock_stream_with_tools(*args, **kwargs):
            nonlocal called_with_tools
            called_with_tools = True
            yield "Hello"

        mock_adapter.stream_chat_with_tools = mock_stream_with_tools

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Hi"}],
                "enable_tools": True,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert called_with_tools is True

    def test_chat_stream_with_tools_executes_tool_and_restreams(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter, mock_brewery_service
    ):
        """RED: Tool call results in tool execution and second stream with final answer."""
        mock_adapter = mock_registry_get_adapter.return_value
        mock_adapter.supports_tools.return_value = True

        async def first_stream(*args, **kwargs):
            from app.schemas.chat import ToolCallResult
            yield ToolCallResult(tool_call_id="call_1", name="count_breweries", arguments={})

        async def second_stream(*args, **kwargs):
            yield "There are 42 breweries."

        mock_adapter.stream_chat_with_tools.side_effect = [first_stream(), second_stream()]

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "How many breweries?"}],
                "enable_tools": True,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert "event: delta" in body
        assert "There are 42 breweries." in body
        assert "event: done" in body

        # Verify tool was executed via mock service
        mock_brewery_service.count.assert_called_once()

    def test_chat_stream_enable_tools_false_uses_regular_path(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter
    ):
        """TRIANGULATE: enable_tools=False uses regular stream_chat (backward compat)."""
        mock_adapter = mock_registry_get_adapter.return_value
        mock_adapter.supports_tools.return_value = True  # Even if adapter supports tools

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Hi"}],
                "enable_tools": False,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert "event: delta" in body
        assert "data: Hello" in body
        assert "event: done" in body

    def test_chat_stream_unsupported_adapter_uses_regular_path(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter
    ):
        """TRIANGULATE: adapter without tool support falls back to stream_chat."""
        mock_adapter = mock_registry_get_adapter.return_value
        mock_adapter.supports_tools.return_value = False

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Hi"}],
                "enable_tools": True,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert "event: delta" in body
        assert "data: Hello" in body
        assert "event: done" in body

    def test_chat_stream_with_tools_two_turn_loop(
        self, client: TestClient, auth_token: str, mock_credential_service, mock_registry_get_adapter, mock_brewery_service
    ):
        """INTEGRATION: Two-turn loop — first tool_call, then final text. Both adapter calls made."""
        mock_adapter = mock_registry_get_adapter.return_value
        mock_adapter.supports_tools.return_value = True

        async def first_stream(*args, **kwargs):
            from app.schemas.chat import ToolCallResult
            yield ToolCallResult(tool_call_id="call_1", name="search_breweries", arguments={"city": "Bogotá"})

        async def second_stream(*args, **kwargs):
            yield "Found Test Brewery in Bogotá."

        mock_adapter.stream_chat_with_tools.side_effect = [first_stream(), second_stream()]

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "Find breweries in Bogotá"}],
                "enable_tools": True,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert "Found Test Brewery in Bogotá." in body
        assert "event: done" in body

        # Both adapter calls were made
        assert mock_adapter.stream_chat_with_tools.call_count == 2

        # Tool was executed via mock service
        mock_brewery_service.search.assert_called_once_with(city="Bogotá", country=None, operation_type=None)
