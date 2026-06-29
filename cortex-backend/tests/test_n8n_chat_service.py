"""Tests for the n8n chat proxy service."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.n8n_chat_service import N8NChatProxyError, N8NChatService, N8NChatTimeoutError


class TestN8NChatService:
    """Unit tests for N8NChatService with mocked httpx."""

    @pytest.fixture
    def settings(self, monkeypatch):
        """Settings with a configured webhook URL and auth token."""
        monkeypatch.setenv('N8N_CHAT_WEBHOOK_URL', 'https://n8n.example.com/webhook/chat')
        monkeypatch.setenv('N8N_CHAT_TIMEOUT_SECONDS', '30')
        monkeypatch.setenv('N8N_CHAT_AUTH_TOKEN', 'test-auth-token')
        from app.core.config import Settings

        return Settings()

    @pytest.fixture
    def service(self, settings):
        """Service instance using explicit settings."""
        return N8NChatService(settings=settings)

    def _create_mock_response(self, body: dict) -> MagicMock:
        """Build a mock httpx response with a synchronous json() method."""
        mock_response = MagicMock()
        mock_response.json = MagicMock(return_value=body)
        mock_response.raise_for_status = MagicMock()
        return mock_response

    @pytest.mark.asyncio
    async def test_send_message_payload_shape(self, service):
        """RED: Outbound payload is exactly { message, sessionId }."""
        mock_response = self._create_mock_response({"ok": True, "answer": "do this"})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            answer = await service.send_message("hello", "user-123")

        assert answer == "do this"
        mock_client.post.assert_awaited_once()
        assert mock_client.post.await_args.args[0] == service.settings.n8n_chat_webhook_url
        call_kwargs = mock_client.post.await_args.kwargs
        assert call_kwargs['json'] == {"message": "hello", "sessionId": "user-123"}

    @pytest.mark.asyncio
    async def test_send_message_includes_authorization_bearer_header(self, service):
        """RED: Outbound request sends the configured auth token as an Authorization Bearer header."""
        mock_response = self._create_mock_response({"ok": True, "answer": "ok"})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            await service.send_message("hello", "user-123")

        call_kwargs = mock_client.post.await_args.kwargs
        assert call_kwargs['headers'] == {"Authorization": "Bearer test-auth-token"}

    @pytest.mark.asyncio
    async def test_send_message_maps_successful_answer(self, service):
        """TRIANGULATE: Different answer content is returned."""
        mock_response = self._create_mock_response({"ok": True, "answer": "another answer"})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            answer = await service.send_message("hi", "session-42")

        assert answer == "another answer"

    @pytest.mark.asyncio
    async def test_send_message_uses_configured_timeout(self, service, settings):
        """TRIANGULATE: Per-request client honors configured timeout."""
        mock_response = self._create_mock_response({"ok": True, "answer": "ok"})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client) as mock_cls:
            await service.send_message("hello", "user-1")

        mock_cls.assert_called_once_with(timeout=settings.n8n_chat_timeout_seconds)

    @pytest.mark.asyncio
    async def test_send_message_raises_proxy_error_on_malformed_body(self, service):
        """RED: Malformed n8n body raises N8NChatProxyError."""
        mock_response = self._create_mock_response({"ok": False})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            with pytest.raises(N8NChatProxyError):
                await service.send_message("hello", "user-1")

    @pytest.mark.asyncio
    async def test_send_message_does_not_log_session_id(self, service, caplog):
        """TRIANGULATE: Operational logs must not include the session identifier."""
        mock_response = self._create_mock_response({"ok": False})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with caplog.at_level('WARNING', logger='uvicorn.error'):
            with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
                with pytest.raises(N8NChatProxyError):
                    await service.send_message("hello", "session-123")

        assert "session-123" not in caplog.text

    @pytest.mark.asyncio
    async def test_send_message_does_not_log_message_content(self, service, caplog):
        """TRIANGULATE: Operational logs must not include the raw user message."""
        mock_response = self._create_mock_response({"ok": True, "answer": "ok"})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with caplog.at_level('INFO', logger='uvicorn.error'):
            with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
                await service.send_message("super-secret-prompt-42", "user-1")

        assert "super-secret-prompt-42" not in caplog.text

    @pytest.mark.asyncio
    async def test_send_message_raises_proxy_error_on_non_json_body(self, service):
        """TRIANGULATE: Non-JSON n8n response raises N8NChatProxyError."""
        mock_response = MagicMock()
        mock_response.json = MagicMock(side_effect=json.JSONDecodeError("not json", "foo", 0))
        mock_response.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            with pytest.raises(N8NChatProxyError):
                await service.send_message("hello", "user-1")

    @pytest.mark.asyncio
    async def test_send_message_raises_proxy_error_when_answer_missing(self, service):
        """TRIANGULATE: Missing answer field raises N8NChatProxyError."""
        mock_response = self._create_mock_response({"ok": True})

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_response)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            with pytest.raises(N8NChatProxyError):
                await service.send_message("hello", "user-1")

    @pytest.mark.asyncio
    async def test_send_message_raises_timeout_error_on_httpx_timeout(self, service):
        """RED: httpx.TimeoutException raises N8NChatTimeoutError."""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("Request timed out"))

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            with pytest.raises(N8NChatTimeoutError):
                await service.send_message("hello", "user-1")

    @pytest.mark.asyncio
    async def test_send_message_raises_proxy_error_on_request_error(self, service):
        """TRIANGULATE: Network-level failure raises N8NChatProxyError."""
        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=httpx.ConnectError("connection refused"))

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            with pytest.raises(N8NChatProxyError):
                await service.send_message("hello", "user-1")

    @pytest.mark.asyncio
    async def test_send_message_raises_proxy_error_on_http_status_failure(self, service):
        """TRIANGULATE: Upstream non-2xx response raises N8NChatProxyError."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        request = httpx.Request("POST", "https://n8n.example.com/webhook/chat")
        exc = httpx.HTTPStatusError("server error", request=request, response=mock_response)

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=exc)

        with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
            with pytest.raises(N8NChatProxyError):
                await service.send_message("hello", "user-1")

    @pytest.mark.asyncio
    async def test_send_message_does_not_log_request_error_details(self, service, caplog):
        """TRIANGULATE: Failure logs must not include the webhook URL or auth token."""
        request = httpx.Request("POST", "https://n8n.example.com/webhook/chat")
        exc = httpx.ConnectError("connection refused", request=request)

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=exc)

        with caplog.at_level('WARNING', logger='uvicorn.error'):
            with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
                with pytest.raises(N8NChatProxyError):
                    await service.send_message("hello", "user-1")

        assert "https://n8n.example.com/webhook/chat" not in caplog.text
        assert "test-auth-token" not in caplog.text

    @pytest.mark.asyncio
    async def test_send_message_logs_status_code_on_http_error(self, service, caplog):
        """TRIANGULATE: HTTP error path logs the status code but not the webhook URL or token."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        request = httpx.Request("POST", "https://n8n.example.com/webhook/chat")
        exc = httpx.HTTPStatusError("server error", request=request, response=mock_response)

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=exc)

        with caplog.at_level('WARNING', logger='uvicorn.error'):
            with patch('app.services.n8n_chat_service.httpx.AsyncClient', return_value=mock_client):
                with pytest.raises(N8NChatProxyError):
                    await service.send_message("hello", "user-1")

        assert "500" in caplog.text
        assert "https://n8n.example.com/webhook/chat" not in caplog.text
        assert "test-auth-token" not in caplog.text
