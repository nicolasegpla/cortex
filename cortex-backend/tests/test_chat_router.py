"""Tests for chat SSE streaming router after SQL-orchestrator cutover."""

import logging
from unittest.mock import AsyncMock, MagicMock, patch

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


class TestConfigCutover:
    """Config-level cutover assertions."""

    def test_settings_has_no_sql_orchestrator_field(self):
        """RED: Settings must not accept SQL_ORCHESTRATOR_ENABLED anymore."""
        from app.core.config import Settings

        assert "sql_orchestrator_enabled" not in Settings.model_fields

    def test_settings_has_no_sql_orchestrator_property(self):
        """TRIANGULATE: The SQL_ORCHESTRATOR_ENABLED property is gone."""
        from app.core.config import Settings

        settings = Settings()
        assert not hasattr(settings, "SQL_ORCHESTRATOR_ENABLED")

    def test_sql_orchestrator_env_is_ignored(self):
        """TRIANGULATE: The alias no longer populates any field."""
        from app.core.config import Settings

        settings = Settings(SQL_ORCHESTRATOR_ENABLED="true")  # extra='ignore'
        assert not hasattr(settings, "SQL_ORCHESTRATOR_ENABLED")
        assert "sql_orchestrator_enabled" not in settings.model_dump()


class TestChatRouterSolePath:
    """Test chat streaming endpoint routes every request through SqlOrchestrator only."""

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
        """Create a TestClient with only the credential dependency overridden."""
        from app.main import create_app
        from app.routers.chat import get_credential_service

        app = create_app()
        app.dependency_overrides[get_credential_service] = lambda: mock_credential_service
        yield TestClient(app)
        app.dependency_overrides.clear()

    @pytest.fixture
    def mock_sql_orchestrator(self):
        """Patch SqlOrchestrator in the chat router."""
        mock_cls = MagicMock()
        mock_instance = mock_cls.return_value
        mock_instance.run = AsyncMock(return_value="There are 5 breweries.")
        with patch("app.routers.chat.SqlOrchestrator", mock_cls):
            yield mock_cls, mock_instance

    def test_chat_stream_routes_to_sql_orchestrator(
        self,
        client: TestClient,
        auth_token: str,
        mock_sql_orchestrator,
    ):
        """RED: Every request is handled by SqlOrchestrator.run()."""
        mock_cls, mock_instance = mock_sql_orchestrator

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "How many breweries?"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        body = response.text
        assert "event: delta" in body
        assert "There are 5 breweries." in body
        assert "event: done" in body

        mock_cls.assert_called_once()
        mock_instance.run.assert_awaited_once()
        call_kwargs = mock_instance.run.await_args.kwargs
        assert call_kwargs["user_text"] == "How many breweries?"
        assert call_kwargs["model"] == "gpt-4o"
        assert call_kwargs["api_key"] == "sk-test-key"
        assert len(call_kwargs["request_id"]) == 6

    def test_chat_stream_sse_headers_are_defensive(
        self,
        client: TestClient,
        auth_token: str,
        mock_sql_orchestrator,
    ):
        """SSE responses must disable caching/proxy buffering for mobile delivery."""
        _, mock_instance = mock_sql_orchestrator
        mock_instance.run = AsyncMock(return_value="There are 5 breweries.")

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "How many breweries?"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        assert "no-cache" in response.headers.get("cache-control", "")
        assert "no-transform" in response.headers.get("cache-control", "")
        assert response.headers.get("x-accel-buffering") == "no"
        assert response.headers.get("connection") == "keep-alive"

    def test_chat_stream_emits_proxy_safe_ping_before_orchestrator(
        self,
        client: TestClient,
        auth_token: str,
        mock_sql_orchestrator,
    ):
        """A comment ping is sent before long processing to keep proxies/mobile alive."""
        _, mock_instance = mock_sql_orchestrator
        mock_instance.run = AsyncMock(return_value="There are 5 breweries.")

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "How many breweries?"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert body.startswith(": ping\n\n")
        assert "event: delta" in body
        assert "There are 5 breweries." in body
        assert "event: done" in body

    def test_chat_stream_sole_path_for_all_providers(
        self,
        client: TestClient,
        auth_token: str,
        mock_registry_get_adapter,
        mock_sql_orchestrator,
    ):
        """TRIANGULATE: SqlOrchestrator is the only path across providers."""
        mock_cls, mock_instance = mock_sql_orchestrator

        for provider in ("openai", "anthropic", "gemini", "deepseek"):
            mock_cls.reset_mock()
            mock_instance.reset_mock()
            mock_registry_get_adapter.reset_mock()

            response = client.post(
                "/chat/stream",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={
                    "model": "model-id",
                    "provider": provider,
                    "messages": [{"role": "user", "content": "Hi"}],
                },
            )

            assert response.status_code == status.HTTP_200_OK
            mock_registry_get_adapter.assert_called_once_with(provider)
            mock_instance.run.assert_awaited_once()

    def test_chat_stream_ignores_enable_tools(
        self,
        client: TestClient,
        auth_token: str,
        mock_registry_get_adapter,
        mock_sql_orchestrator,
    ):
        """TRIANGULATE: enable_tools no longer triggers tool-loop or system prompt injection."""
        mock_cls, mock_instance = mock_sql_orchestrator
        mock_adapter = mock_registry_get_adapter.return_value
        mock_adapter.supports_tools.return_value = True

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
        mock_instance.run.assert_awaited_once()
        mock_adapter.stream_chat_with_tools.assert_not_called()
        mock_adapter.supports_tools.assert_not_called()

    def test_chat_stream_preserves_sse_contract(
        self,
        client: TestClient,
        auth_token: str,
        mock_sql_orchestrator,
    ):
        """TRIANGULATE: Multiline orchestrator answers are streamed as valid SSE."""
        _, mock_instance = mock_sql_orchestrator
        mock_instance.run = AsyncMock(
            return_value="Line one\nLine two\nLine three"
        )

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "What cities?"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert "event: delta" in body
        assert "data: Line one" in body
        assert "data: Line two" in body
        assert "data: Line three" in body
        assert "event: done" in body

    def test_chat_stream_orchestrator_error_is_streamed(
        self,
        client: TestClient,
        auth_token: str,
        mock_sql_orchestrator,
    ):
        """TRIANGULATE: Grounded orchestrator errors are returned as SSE deltas."""
        _, mock_instance = mock_sql_orchestrator
        mock_instance.run = AsyncMock(
            return_value="SQL validation failed: unsafe keyword detected."
        )

        response = client.post(
            "/chat/stream",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "model": "gpt-4o",
                "provider": "openai",
                "messages": [{"role": "user", "content": "DROP everything"}],
            },
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.text
        assert "event: delta" in body
        assert "SQL validation failed" in body
        assert "event: done" in body

    def test_chat_stream_unauthorized_returns_401(self, client: TestClient) -> None:
        """Auth guard unchanged: no token returns 401."""
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
        """Missing credential still returns 400 before orchestration."""
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
        assert "credencial" in data["detail"].lower() or "proveedor" in data["detail"].lower()

    def test_chat_stream_adapter_resolution_error_returns_400(
        self, client: TestClient, auth_token: str, mock_registry_get_adapter
    ):
        """TRIANGULATE: adapter resolution failure returns 400 before streaming."""
        mock_registry_get_adapter.side_effect = ValueError("Provider API error")

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

    def test_chat_stream_unexpected_orchestrator_error_returns_sse_error(
        self, client: TestClient, auth_token: str
    ):
        """TRIANGULATE: unexpected error inside the stream yields an SSE error event."""
        with patch("app.routers.chat.SqlOrchestrator") as mock_cls:
            mock_instance = mock_cls.return_value
            mock_instance.run = AsyncMock(side_effect=RuntimeError("Boom"))

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
        assert "Boom" in body

    def test_chat_stream_invalid_provider_returns_422(
        self, client: TestClient, auth_token: str
    ):
        """Invalid provider literal is rejected by schema validation."""
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

    def test_chat_stream_logs_sql_orchestrator_path(
        self,
        client: TestClient,
        auth_token: str,
        mock_sql_orchestrator,
        caplog,
    ):
        """TRIANGULATE: The chosen response path is logged as sql-orchestrator."""
        _, mock_instance = mock_sql_orchestrator
        mock_instance.run = AsyncMock(return_value="Answer")

        with caplog.at_level(logging.INFO):
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
        assert "response_path=sql-orchestrator" in caplog.text
        assert "response_path=ai-planner" not in caplog.text
        assert "response_path=model-direct" not in caplog.text
        assert "response_path=model-tools" not in caplog.text


class TestChatModuleCutover:
    """Static assertions that the chat module no longer exposes old paths."""

    @pytest.mark.parametrize(
        "name",
        [
            "get_tool_registry",
            "get_brewery_service",
            "_run_ai_planner_pipeline",
            "_build_system_prompt",
            "_inject_system_prompt",
            "PlannerEngine",
            "SynthesizerEngine",
            "execute_plan",
            "ToolRegistry",
            "BreweryService",
        ],
    )
    def test_old_symbols_removed(self, name: str):
        """RED: Deprecated router symbols are no longer importable."""
        import app.routers.chat as chat_module

        assert not hasattr(chat_module, name), f"{name} should have been removed"

    def test_tool_call_result_not_imported(self):
        """TRIANGULATE: ToolCallResult is no longer used by the router."""
        with pytest.raises(ImportError):
            from app.routers.chat import ToolCallResult  # noqa: F401


class TestStreamSSEHelpers:
    """Keep SSE formatting tests for shared helper functions."""

    def test_stream_sse_multiline_payload(self):
        """SSE multiline data must prefix each line with data: per spec."""
        from app.routers.chat import _stream_sse

        event = _stream_sse("delta", "line1\nline2\nline3")
        lines = [l for l in event.split("\n") if l]
        assert lines == ["event: delta", "data: line1", "data: line2", "data: line3"]

    def test_stream_sse_empty_string(self):
        """SSE empty data should still produce valid event."""
        from app.routers.chat import _stream_sse

        event = _stream_sse("done", "")
        lines = [l for l in event.split("\n") if l]
        assert lines == ["event: done", "data: "]

    def test_stream_sse_single_line(self):
        """SSE single line data works as before."""
        from app.routers.chat import _stream_sse

        event = _stream_sse("delta", "hello")
        lines = [l for l in event.split("\n") if l]
        assert lines == ["event: delta", "data: hello"]
