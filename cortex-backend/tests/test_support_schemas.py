"""RED tests for the support feedback Pydantic schemas (S1-S10)."""

import pytest
from pydantic import ValidationError

from app.schemas.support import (
    SupportFeedbackRequest,
    SupportFeedbackResponse,
)


class TestSupportFeedbackRequest:
    """Schema contract for POST /support/feedback payloads."""

    def test_s1_valid_request_accepted(self):
        """S1: A fully valid payload constructs without error."""
        request = SupportFeedbackRequest(
            type="bug",
            subject="Crash on login",
            message="Steps to reproduce...",
        )

        assert request.type == "bug"
        assert request.subject == "Crash on login"
        assert request.message == "Steps to reproduce..."

    def test_s2_rejects_extra_field(self):
        """S2: extra="forbid" — unknown fields raise ValidationError."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(
                type="bug",
                subject="Crash on login",
                message="Steps to reproduce...",
                email="x@y.com",
            )

    def test_s3_rejects_empty_subject(self):
        """S3: subject min_length=1 — empty string rejected."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(type="bug", subject="", message="Details")

    def test_s4_rejects_empty_message(self):
        """S4: message min_length=1 — empty string rejected."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(type="bug", subject="Crash", message="")

    def test_s5_rejects_whitespace_only_subject(self):
        """S5: whitespace-only subject is rejected."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(type="bug", subject="   ", message="Details")

    def test_s6_rejects_whitespace_only_message(self):
        """S6: whitespace-only message is rejected."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(type="bug", subject="Crash", message="   ")

    def test_s7_rejects_subject_over_200_chars(self):
        """S7: subject max_length=200 — 201 chars rejected."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(type="bug", subject="x" * 201, message="Details")

    def test_s7b_accepts_subject_of_exactly_200_chars(self):
        """S7b: subject at the max_length boundary (200 chars) is accepted."""
        request = SupportFeedbackRequest(type="bug", subject="x" * 200, message="Details")

        assert len(request.subject) == 200

    def test_s7c_accepts_message_of_exactly_5000_chars(self):
        """S7c: message at the max_length boundary (5000 chars, after strip) is accepted."""
        request = SupportFeedbackRequest(type="bug", subject="Crash", message=f" {'x' * 5000} ")

        assert len(request.message) == 5000

    def test_s7d_rejects_message_over_5000_chars(self):
        """S7d: message max_length=5000 — 5001 chars rejected."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(type="bug", subject="Crash", message="x" * 5001)

    def test_s8_rejects_invalid_type(self):
        """S8: type must be one of the Literal values."""
        with pytest.raises(ValidationError):
            SupportFeedbackRequest(type="invalid", subject="Crash", message="Details")

    def test_s9_all_four_types_accepted(self):
        """S9: bug, mejora, nueva_funcion, otro each construct."""
        for feedback_type in ("bug", "mejora", "nueva_funcion", "otro"):
            request = SupportFeedbackRequest(
                type=feedback_type,
                subject="Subject",
                message="Message",
            )
            assert request.type == feedback_type

    def test_s10_response_serializes(self):
        """S10: SupportFeedbackResponse.model_dump() matches the contract."""
        response = SupportFeedbackResponse(success=True, message="Gracias por tu feedback.")

        assert response.model_dump() == {
            "success": True,
            "message": "Gracias por tu feedback.",
        }
