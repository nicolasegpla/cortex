"""Tests for the email service."""

from unittest.mock import patch

import pytest
import resend

from app.core.config import Settings
from app.services.email_service import EmailService


class TestEmailService:
    """Test Resend-backed email delivery."""

    def test_send_invite_email_configures_resend_api_key(self) -> None:
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-123'}
            service.send_invite_email('new@example.com', 'http://localhost:5173/auth/invite?code=abc')

        assert service.is_configured() is True
        assert resend.api_key == 're_test_key'
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        assert call_args['from'] == 'invites@cortex.io'
        assert call_args['to'] == 'new@example.com'
        assert 'invita' in call_args['subject'].lower()
        assert 'http://localhost:5173/auth/invite?code=abc' in call_args['html']

    def test_send_invite_email_returns_send_response(self) -> None:
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-456'}
            result = service.send_invite_email('new@example.com', 'http://link')

        assert result['id'] == 'email-456'

    def test_send_invite_email_without_api_key_raises(self) -> None:
        settings = Settings(RESEND_API_KEY=None, RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        assert service.is_configured() is False
        with pytest.raises(RuntimeError, match='no está configurado'):
            service.send_invite_email('new@example.com', 'http://link')

    def test_send_invite_email_propagates_resend_errors(self) -> None:
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            from resend.exceptions import ResendError
            mock_send.side_effect = ResendError(
                code=422, error_type='invalid_parameter', message='Invalid email', suggested_action='Fix it'
            )
            with pytest.raises(ResendError, match='Invalid email'):
                service.send_invite_email('new@example.com', 'http://link')
