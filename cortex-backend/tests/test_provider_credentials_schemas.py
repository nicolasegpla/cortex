from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.schemas.provider_credentials import CredentialCreate, CredentialResponse


class TestProviderCredentialSchemas:
    def test_credential_create_valid(self):
        cred = CredentialCreate(provider="openai", api_key="sk-12345", label="My Key")
        assert cred.provider == "openai"
        assert cred.api_key == "sk-12345"
        assert cred.label == "My Key"

    def test_credential_create_without_label(self):
        cred = CredentialCreate(provider="anthropic", api_key="sk-abc")
        assert cred.label is None

    def test_credential_response_excludes_api_key(self):
        with pytest.raises(ValidationError):
            CredentialResponse(
                id="550e8400-e29b-41d4-a716-446655440000",
                provider="openai",
                label="My Key",
                validated_at=None,
                api_key="should-not-be-here",
            )

    def test_credential_response_has_no_api_key_field(self):
        fields = CredentialResponse.model_fields.keys()
        assert "api_key" not in fields
        assert "encrypted_api_key" not in fields

    def test_credential_response_valid(self):
        now = datetime.now(timezone.utc)
        resp = CredentialResponse(
            id="550e8400-e29b-41d4-a716-446655440000",
            provider="openai",
            label="My Key",
            validated_at=now,
        )
        assert resp.provider == "openai"
        assert resp.label == "My Key"
        assert resp.validated_at == now
