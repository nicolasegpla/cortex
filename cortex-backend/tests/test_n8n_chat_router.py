"""Tests for the n8n chat proxy router."""

from unittest.mock import AsyncMock, MagicMock
from uuid import UUID

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.security import User, get_current_user
from app.main import create_app
from app.routers import n8n_chat


def create_mock_user(user_id: str = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") -> User:
    """Create a test user for dependency override."""
    return User(id=UUID(user_id), email="user@example.com", role="operativo")


class TestN8NChatRouter:
    """Integration tests for POST /chat/n8n."""

    @pytest.fixture
    def mock_service(self):
        """Mock N8NChatService for dependency override."""
        mock = MagicMock()
        mock.send_message = AsyncMock(return_value="do this")
        return mock

    @pytest.fixture
    def mock_service_unconfigured(self):
        """Mock N8NChatService used to prove the downstream service is not called."""
        mock = MagicMock()
        mock.send_message = AsyncMock(return_value="do this")
        return mock

    @pytest.fixture
    def client(self, mock_service):
        """Create a TestClient with auth and service dependencies overridden."""
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        app.dependency_overrides[n8n_chat.get_n8n_chat_service] = lambda: mock_service
        yield TestClient(app)
        app.dependency_overrides.clear()

    def test_n8n_chat_unauthorized_returns_401(self):
        """RED: No JWT returns 401 before service is called."""
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        test_client = TestClient(app)
        test_client.app.dependency_overrides.clear()

        response = test_client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_n8n_chat_returns_503_when_webhook_unconfigured(self, monkeypatch, mock_service_unconfigured):
        """TRIANGULATE: Route fails gracefully when the webhook is not configured and does not call downstream."""
        monkeypatch.delenv('N8N_CHAT_WEBHOOK_URL', raising=False)

        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
        app.dependency_overrides[n8n_chat.get_n8n_chat_service] = lambda svc=mock_service_unconfigured: svc
        test_client = TestClient(app)

        response = test_client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        detail = response.json()["detail"].lower()
        assert "configurado" in detail
        mock_service_unconfigured.send_message.assert_not_called()
        test_client.app.dependency_overrides.clear()

    def test_n8n_chat_returns_503_when_auth_token_unconfigured(self, monkeypatch, mock_service_unconfigured):
        """TRIANGULATE: Route fails gracefully when downstream auth is not configured and does not call downstream."""
        monkeypatch.delenv('N8N_CHAT_AUTH_TOKEN', raising=False)

        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
        app.dependency_overrides[n8n_chat.get_n8n_chat_service] = lambda svc=mock_service_unconfigured: svc
        test_client = TestClient(app)

        response = test_client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        detail = response.json()["detail"].lower()
        assert "configurado" in detail
        mock_service_unconfigured.send_message.assert_not_called()
        test_client.app.dependency_overrides.clear()

    def test_n8n_chat_returns_503_when_webhook_is_empty_string(self, monkeypatch, mock_service_unconfigured):
        """TRIANGULATE: Empty webhook env is treated as unconfigured and does not call downstream."""
        monkeypatch.setenv('N8N_CHAT_WEBHOOK_URL', '')

        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
        app.dependency_overrides[n8n_chat.get_n8n_chat_service] = lambda svc=mock_service_unconfigured: svc
        test_client = TestClient(app)

        response = test_client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        detail = response.json()["detail"].lower()
        assert "configurado" in detail
        mock_service_unconfigured.send_message.assert_not_called()
        test_client.app.dependency_overrides.clear()

    def test_n8n_chat_returns_503_when_auth_token_is_empty_string(self, monkeypatch, mock_service_unconfigured):
        """TRIANGULATE: Empty auth token env is treated as unconfigured and does not call downstream."""
        monkeypatch.setenv('N8N_CHAT_AUTH_TOKEN', '')

        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None)
        app.dependency_overrides[n8n_chat.get_n8n_chat_service] = lambda svc=mock_service_unconfigured: svc
        test_client = TestClient(app)

        response = test_client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        detail = response.json()["detail"].lower()
        assert "configurado" in detail
        mock_service_unconfigured.send_message.assert_not_called()
        test_client.app.dependency_overrides.clear()

    def test_n8n_chat_happy_path_returns_answer(self, client, mock_service):
        """RED: Successful proxy returns 200 { answer }."""
        response = client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"answer": "do this"}
        mock_service.send_message.assert_awaited_once_with("hello", "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

    def test_n8n_chat_logs_request_lifecycle_without_pii(self, client, mock_service, caplog):
        """TRIANGULATE: Logs include request id and timing but never message text or session id."""
        from app.routers import n8n_chat

        with caplog.at_level('INFO', logger=n8n_chat.logger.name):
            response = client.post("/chat/n8n", json={"message": "super-secret-user-text"})

        assert response.status_code == status.HTTP_200_OK
        assert 'N8N-CHAT: start' in caplog.text
        assert 'N8N-CHAT: done status=success duration_ms=' in caplog.text
        assert 'super-secret-user-text' not in caplog.text
        assert 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' not in caplog.text

    def test_n8n_chat_failure_logs_include_duration(self, client, mock_service, caplog):
        """TRIANGULATE: Failure logs include duration and status without exposing the message."""
        from app.routers import n8n_chat
        from app.services.n8n_chat_service import N8NChatProxyError

        mock_service.send_message = AsyncMock(side_effect=N8NChatProxyError("malformed"))

        with caplog.at_level('WARNING', logger=n8n_chat.logger.name):
            response = client.post("/chat/n8n", json={"message": "secret"})

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert 'N8N-CHAT: proxy_error status=502 duration_ms=' in caplog.text
        assert 'secret' not in caplog.text

    def test_n8n_chat_injects_session_id_from_current_user(self, client, mock_service):
        """TRIANGULATE: sessionId equals current_user.id."""
        custom_user = create_mock_user("b2c3d4e5-f6a7-8901-bcde-f23456789012")
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: custom_user
        app.dependency_overrides[n8n_chat.get_n8n_chat_service] = lambda: mock_service
        test_client = TestClient(app)

        response = test_client.post("/chat/n8n", json={"message": "hi"})

        assert response.status_code == status.HTTP_200_OK
        mock_service.send_message.assert_awaited_once_with("hi", "b2c3d4e5-f6a7-8901-bcde-f23456789012")
        test_client.app.dependency_overrides.clear()

    def test_n8n_chat_rejects_empty_message(self, client, mock_service):
        """TRIANGULATE: Empty message is rejected by schema before service call."""
        response = client.post("/chat/n8n", json={"message": ""})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        mock_service.send_message.assert_not_called()

    def test_n8n_chat_rejects_whitespace_only_message(self, client, mock_service):
        """TRIANGULATE: Whitespace-only message is rejected by schema."""
        response = client.post("/chat/n8n", json={"message": "   "})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        mock_service.send_message.assert_not_called()

    def test_n8n_chat_returns_502_on_proxy_error(self, client, mock_service):
        """RED: Malformed n8n response maps to 502."""
        from app.services.n8n_chat_service import N8NChatProxyError

        mock_service.send_message = AsyncMock(side_effect=N8NChatProxyError("malformed"))

        response = client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert "proxy" in response.json()["detail"].lower() or "n8n" in response.json()["detail"].lower()

    def test_n8n_chat_returns_504_on_timeout_error(self, client, mock_service):
        """RED: Timeout maps to 504."""
        from app.services.n8n_chat_service import N8NChatTimeoutError

        mock_service.send_message = AsyncMock(side_effect=N8NChatTimeoutError("timeout"))

        response = client.post("/chat/n8n", json={"message": "hello"})

        assert response.status_code == status.HTTP_504_GATEWAY_TIMEOUT
        detail = response.json()["detail"].lower()
        assert "timeout" in detail or "tiempo" in detail

    def test_n8n_chat_payload_contract_rejects_extra_fields(self, client, mock_service):
        """TRIANGULATE: Frontend cannot pass sessionId or other extra fields."""
        response = client.post("/chat/n8n", json={"message": "hello", "sessionId": "hijacked"})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        mock_service.send_message.assert_not_called()
