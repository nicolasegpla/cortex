"""Tests for application settings and configuration."""

from app.core.config import Settings


class TestSettings:
    """Test Pydantic settings defaults and aliases."""

    def test_resend_api_key_setting(self) -> None:
        settings = Settings(RESEND_API_KEY='re_test_key_123')

        assert settings.resend_api_key == 're_test_key_123'

    def test_resend_from_email_defaults_to_noreply(self) -> None:
        settings = Settings()

        assert settings.resend_from_email == 'noreply@cortex.local'

    def test_resend_from_email_can_be_overridden(self) -> None:
        settings = Settings(RESEND_FROM_EMAIL='invites@cortex.example.com')

        assert settings.resend_from_email == 'invites@cortex.example.com'
