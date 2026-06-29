"""Tests for application settings and configuration."""

import pytest

from app.core.config import Settings


class TestSettings:
    """Test Pydantic settings defaults and aliases."""

    def test_resend_api_key_setting(self) -> None:
        settings = Settings(RESEND_API_KEY='re_test_key_123')

        assert settings.resend_api_key == 're_test_key_123'

    def test_resend_from_email_defaults_to_noreply(self, monkeypatch) -> None:
        monkeypatch.delenv('RESEND_FROM_EMAIL', raising=False)
        settings = Settings(_env_file=None)

        assert settings.resend_from_email == 'noreply@cortex.local'

    def test_resend_from_email_can_be_overridden(self) -> None:
        settings = Settings(RESEND_FROM_EMAIL='invites@cortex.example.com')

        assert settings.resend_from_email == 'invites@cortex.example.com'

    def test_n8n_chat_webhook_url_defaults_to_none(self, monkeypatch) -> None:
        """Missing webhook URL no longer blocks startup; it becomes None."""
        monkeypatch.delenv('N8N_CHAT_WEBHOOK_URL', raising=False)

        settings = Settings(_env_file=None)

        assert settings.n8n_chat_webhook_url is None

    def test_n8n_chat_webhook_url_empty_string_is_allowed(self, monkeypatch) -> None:
        """TRIANGULATE: Empty env value is accepted; the route treats it as unconfigured."""
        monkeypatch.setenv('N8N_CHAT_WEBHOOK_URL', '')

        settings = Settings(_env_file=None)

        assert settings.n8n_chat_webhook_url == ''

    def test_n8n_chat_webhook_url_can_be_set(self, monkeypatch) -> None:
        """TRIANGULATE: Valid webhook URL is accepted."""
        monkeypatch.setenv('N8N_CHAT_WEBHOOK_URL', 'https://n8n.example.com/webhook/chat')

        settings = Settings(_env_file=None)

        assert settings.n8n_chat_webhook_url == 'https://n8n.example.com/webhook/chat'

    def test_n8n_chat_timeout_seconds_defaults_to_60(self, monkeypatch) -> None:
        """RED: Default timeout is 60 seconds."""
        monkeypatch.setenv('N8N_CHAT_WEBHOOK_URL', 'https://n8n.example.com/webhook/chat')

        settings = Settings(_env_file=None)

        assert settings.n8n_chat_timeout_seconds == 60

    def test_n8n_chat_timeout_seconds_can_be_overridden(self, monkeypatch) -> None:
        """TRIANGULATE: Timeout can be customized."""
        monkeypatch.setenv('N8N_CHAT_WEBHOOK_URL', 'https://n8n.example.com/webhook/chat')

        settings = Settings(N8N_CHAT_TIMEOUT_SECONDS='120', _env_file=None)

        assert settings.n8n_chat_timeout_seconds == 120

    def test_n8n_chat_auth_token_defaults_to_none(self, monkeypatch) -> None:
        """Missing downstream auth token is accepted; the route treats it as unconfigured."""
        monkeypatch.delenv('N8N_CHAT_AUTH_TOKEN', raising=False)

        settings = Settings(_env_file=None)

        assert settings.n8n_chat_auth_token is None

    def test_n8n_chat_auth_token_can_be_set(self, monkeypatch) -> None:
        """TRIANGULATE: Auth token is read from environment."""
        monkeypatch.setenv('N8N_CHAT_AUTH_TOKEN', 'secret-token-123')

        settings = Settings(_env_file=None)

        assert settings.n8n_chat_auth_token == 'secret-token-123'
