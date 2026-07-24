"""Tests for the email service."""

import re
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

    def test_send_support_feedback_propagates_resend_errors(self) -> None:
        """ResendError from the SDK propagates unchanged (router maps it to 502)."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            from resend.exceptions import ResendError
            mock_send.side_effect = ResendError(
                code=422, error_type='invalid_parameter', message='Invalid email', suggested_action='Fix it'
            )
            with pytest.raises(ResendError, match='Invalid email'):
                service.send_support_feedback(
                    feedback_type='bug',
                    subject='s',
                    message='m',
                    user_email='user@example.com',
                    user_id='id-1',
                )

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
                user_email='u@e.com',
                user_id='id-1',
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
                user_email='u@e.com',
                user_id='id-1',
            )

        call_args = mock_send.call_args[0][0]
        assert '\r' not in call_args['subject']
        assert '\n' not in call_args['subject']

    def test_support_feedback_reply_to_is_user_email(self) -> None:
        """E1: reply_to header is the RAW user email (never html-escaped)."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e1'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='s',
                message='m',
                user_email='user@example.com',
                user_id='id-1',
            )

        captured = mock_send.call_args[0][0]
        assert captured['reply_to'] == 'user@example.com'

    def test_support_feedback_from_is_verified_sender(self) -> None:
        """E2: from is the verified Resend sender, never the user's email (anti-swap)."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e2'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='s',
                message='m',
                user_email='user@example.com',
                user_id='id-1',
            )

        captured = mock_send.call_args[0][0]
        assert captured['from'] == settings.resend_from_email
        assert captured['from'] != 'user@example.com'

    def test_support_feedback_template_has_type_label(self) -> None:
        """E3: rich template renders the human-readable feedback type label."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e3'}
            service.send_support_feedback(
                feedback_type='mejora',
                subject='s',
                message='m',
                user_email='user@example.com',
                user_id='id-1',
            )

        captured = mock_send.call_args[0][0]
        assert 'Mejora' in captured['html']

    def test_support_feedback_template_has_escaped_subject(self) -> None:
        """E4: user subject is HTML-escaped inside the template body."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e4'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='<script>alert(1)</script>',
                message='m',
                user_email='user@example.com',
                user_id='id-1',
            )

        captured = mock_send.call_args[0][0]
        assert '&lt;script&gt;alert(1)&lt;/script&gt;' in captured['html']
        assert '<script>' not in captured['html']

    def test_support_feedback_template_has_escaped_message(self) -> None:
        """E5: user message is HTML-escaped inside the template body."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e5'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='s',
                message='<script>alert(2)</script>',
                user_email='user@example.com',
                user_id='id-1',
            )

        captured = mock_send.call_args[0][0]
        assert '&lt;script&gt;alert(2)&lt;/script&gt;' in captured['html']
        assert '<script>' not in captured['html']

    def test_support_feedback_template_has_user_email(self) -> None:
        """E6: rich template includes the submitting user's email."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e6'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='s',
                message='m',
                user_email='user@example.com',
                user_id='id-1',
            )

        captured = mock_send.call_args[0][0]
        assert 'user@example.com' in captured['html']

    def test_support_feedback_template_has_user_id(self) -> None:
        """E7: rich template includes the submitting user's ID."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)
        user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e7'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='s',
                message='m',
                user_email='user@example.com',
                user_id=user_id,
            )

        captured = mock_send.call_args[0][0]
        assert user_id in captured['html']

    def test_support_feedback_template_has_iso_timestamp(self) -> None:
        """E8: rich template includes an ISO-8601 UTC timestamp."""
        settings = Settings(RESEND_API_KEY='re_test_key', RESEND_FROM_EMAIL='invites@cortex.io')
        service = EmailService(settings)

        with patch('app.services.email_service.resend.Emails.send') as mock_send:
            mock_send.return_value = {'id': 'email-e8'}
            service.send_support_feedback(
                feedback_type='bug',
                subject='s',
                message='m',
                user_email='user@example.com',
                user_id='id-1',
            )

        captured = mock_send.call_args[0][0]
        assert re.search(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', captured['html'])
