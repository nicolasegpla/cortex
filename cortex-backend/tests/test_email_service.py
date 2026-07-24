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

    def test_send_support_feedback_escapes_message_html(self) -> None:
        """User message is HTML-escaped so injected markup cannot break out of <pre>."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-789'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='s',
                message='</pre><div>injected</div><pre>',
            )

        call_args = mock_send.call_args[0][0]
        assert '&lt;/pre&gt;&lt;div&gt;injected&lt;/div&gt;&lt;pre&gt;' in call_args['html']
        assert '<div>injected</div>' not in call_args['html']

    def test_send_support_feedback_sanitizes_subject_crlf(self) -> None:
        """CR/LF in the subject is stripped so headers cannot be injected."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-790'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='hello\r\nBCC: evil@x.com',
                message='m',
            )

        call_args = mock_send.call_args[0][0]
        assert '\r' not in call_args['subject']
        assert '\n' not in call_args['subject']
