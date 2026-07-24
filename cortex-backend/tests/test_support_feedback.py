"""RED tests for the support feedback router (R1-R10)."""

from unittest.mock import MagicMock
from uuid import UUID

import pytest
import resend
from fastapi import status
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import User, get_current_user
from app.dependencies import get_email_service
from app.main import create_app
from app.routers import support
from app.services.email_service import EmailService


def create_mock_user(user_id: str = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") -> User:
    """Create a test user for dependency override."""
    return User(id=UUID(user_id), email="user@example.com", role="operativo")


VALID_PAYLOAD = {
    "type": "bug",
    "subject": "Issue title",
    "message": "Details",
}


class TestSupportFeedbackRouter:
    """Integration tests for POST /support/feedback."""

    @pytest.fixture
    def mock_email_service(self):
        """Mock EmailService for dependency override."""
        mock = MagicMock()
        mock.send_support_feedback.return_value = {"id": "email-123"}
        return mock

    @pytest.fixture
    def client(self, mock_email_service):
        """TestClient with auth and email-service dependencies overridden."""
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        app.dependency_overrides[get_email_service] = lambda: mock_email_service
        yield TestClient(app)
        app.dependency_overrides.clear()

    def test_r1_unauthenticated_returns_401(self, mock_email_service):
        """R1: No JWT → 401; the seam is never invoked."""
        app = create_app()
        app.dependency_overrides[get_email_service] = lambda: mock_email_service
        test_client = TestClient(app)

        response = test_client.post("/support/feedback", json=VALID_PAYLOAD)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        mock_email_service.send_support_feedback.assert_not_called()
        app.dependency_overrides.clear()

    def test_r2_empty_message_returns_422(self, client, mock_email_service):
        """R2: Empty message fails payload validation; service NOT called."""
        response = client.post(
            "/support/feedback",
            json={"type": "bug", "subject": "Issue title", "message": ""},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_email_service.send_support_feedback.assert_not_called()

    def test_r2b_empty_subject_returns_422(self, client, mock_email_service):
        """R2b: Empty subject fails payload validation at the endpoint; service NOT called."""
        response = client.post(
            "/support/feedback",
            json={"type": "bug", "subject": "", "message": "Details"},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_email_service.send_support_feedback.assert_not_called()

    def test_r3_extra_field_returns_422(self, client, mock_email_service):
        """R3: extra="forbid" at the API layer; service NOT called."""
        response = client.post(
            "/support/feedback",
            json={**VALID_PAYLOAD, "email": "x@y.com"},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        mock_email_service.send_support_feedback.assert_not_called()

    def test_r4_valid_payload_returns_200(self, client):
        """R4: Happy path → 200 with the documented response body."""
        response = client.post("/support/feedback", json=VALID_PAYLOAD)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "success": True,
            "message": "Gracias por tu feedback.",
        }

    def test_r5_seam_called_without_recipient(self, client, mock_email_service):
        """R5: Router calls the seam with NO to_email — recipient is internal."""
        response = client.post("/support/feedback", json=VALID_PAYLOAD)

        assert response.status_code == status.HTTP_200_OK
        mock_email_service.send_support_feedback.assert_called_once_with(
            feedback_type="bug",
            subject="Issue title",
            message="Details",
            user_email="user@example.com",
            user_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        )

    def test_r6_seam_success_returns_200(self, client, mock_email_service):
        """R6: Seam returning a dict maps to 200."""
        mock_email_service.send_support_feedback.return_value = {"id": "email-123"}

        response = client.post("/support/feedback", json=VALID_PAYLOAD)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True

    def test_r7_seam_failure_returns_502(self, client, mock_email_service, caplog):
        """R7: Seam raising maps to 502; WARNING logged with context, no payload content."""
        mock_email_service.send_support_feedback.side_effect = Exception("resend down")

        with caplog.at_level("WARNING", logger=support.logger.name):
            response = client.post(
                "/support/feedback",
                json={
                    "type": "bug",
                    "subject": "Issue title",
                    "message": "super-secret-user-text",
                },
            )

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert response.json()["detail"] == "No se pudo enviar el mensaje de feedback"
        mock_email_service.send_support_feedback.assert_called_once()

        warning_records = [
            record for record in caplog.records if record.levelname == "WARNING"
        ]
        assert any(
            "SUPPORT-FEEDBACK: failed" in record.getMessage()
            and "status=502" in record.getMessage()
            and "error=Exception" in record.getMessage()
            for record in warning_records
        )
        assert "super-secret-user-text" not in caplog.text

    def test_r8_recipient_resolved_from_support_to_email_default(self, monkeypatch):
        """R8: Seam resolves the recipient internally from settings.support_to_email."""
        monkeypatch.delenv("SUPPORT_TO_EMAIL", raising=False)
        captured = {}

        def fake_send(payload):
            captured.update(payload)
            return {"id": "email-123"}

        monkeypatch.setattr(resend.Emails, "send", fake_send)
        settings = Settings(_env_file=None, RESEND_API_KEY="rk_test_key")
        service = EmailService(settings)

        result = service.send_support_feedback(
            feedback_type="bug",
            subject="s",
            message="m",
            user_email="user@example.com",
            user_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        )

        assert result == {"id": "email-123"}
        assert captured["to"] == settings.support_to_email
        assert captured["subject"] == "[Cortex Feedback - bug] s"
        assert "m" in captured["html"]

    def test_r9_message_content_never_logged(self, client, mock_email_service, caplog):
        """R9: Neither message nor subject text appears in logs; subject_len does."""
        with caplog.at_level("INFO", logger=support.logger.name):
            response = client.post(
                "/support/feedback",
                json={
                    "type": "bug",
                    "subject": "secret-subject-text",
                    "message": "super-secret-user-text",
                },
            )

        assert response.status_code == status.HTTP_200_OK
        assert "super-secret-user-text" not in caplog.text
        assert "secret-subject-text" not in caplog.text
        assert "subject_len=" in caplog.text
        assert "type=bug" in caplog.text
        assert "user_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890" in caplog.text
        assert "status=success" in caplog.text

    def test_r10_email_unconfigured_returns_503(self, monkeypatch, mock_email_service):
        """R10: Unconfigured email → 503 from the dependency guard; seam NOT called."""
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        monkeypatch.setattr(
            "app.dependencies.get_settings",
            lambda: Settings(_env_file=None),
        )
        # Real dependency used — no override for get_email_service.
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: create_mock_user()
        test_client = TestClient(app)
        monkeypatch.setattr(
            EmailService,
            "send_support_feedback",
            mock_email_service.send_support_feedback,
        )

        response = test_client.post("/support/feedback", json=VALID_PAYLOAD)

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json()["detail"] == "El servicio de email no está configurado"
        mock_email_service.send_support_feedback.assert_not_called()
        app.dependency_overrides.clear()
