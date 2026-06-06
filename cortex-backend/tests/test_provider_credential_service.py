"""Tests for provider credential service — encrypted CRUD with user isolation."""

from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet

from app.services.encryption_service import EncryptionService
from app.schemas.provider_credentials import CredentialResponse


class TestProviderCredentialService:
    """TDD tests for ProviderCredentialService."""

    @pytest.fixture
    def encryption_service(self):
        key = Fernet.generate_key()
        return EncryptionService(key=key)

    @pytest.fixture
    def mock_supabase(self):
        return MagicMock()

    @pytest.fixture
    def service(self, mock_supabase, encryption_service):
        from app.services.provider_credential_service import ProviderCredentialService
        return ProviderCredentialService(supabase=mock_supabase, encryption=encryption_service)

    def _build_mock_chain(self, return_data=None):
        """Build a mock Supabase query chain that returns return_data on execute()."""
        chain = MagicMock()
        chain.execute.return_value = MagicMock(data=return_data or [])
        return chain

    # ── save_credential ──

    def test_save_credential_encrypts_api_key(self, service, mock_supabase, encryption_service):
        """RED: save_credential must encrypt the api_key before storing."""
        upsert_chain = self._build_mock_chain(return_data=[{
            "id": str(uuid4()),
            "provider": "openai",
            "label": "My OpenAI Key",
            "validated_at": "2024-06-06T12:00:00+00:00",
        }])
        mock_supabase.table.return_value.upsert.return_value = upsert_chain

        result = service.save_credential("user-1", "openai", "sk-test-key-123", "My OpenAI Key")

        mock_supabase.table.assert_called_once_with("provider_credentials")
        mock_supabase.table.return_value.upsert.assert_called_once()
        inserted = mock_supabase.table.return_value.upsert.call_args[0][0]
        assert inserted["user_id"] == "user-1"
        assert inserted["provider"] == "openai"
        assert inserted["label"] == "My OpenAI Key"
        assert inserted["encrypted_api_key"].startswith("v1:")
        # Verify round-trip
        assert encryption_service.decrypt(inserted["encrypted_api_key"]) == "sk-test-key-123"
        assert isinstance(result, CredentialResponse)
        assert result.validated_at is not None

    def test_save_credential_without_label(self, service, mock_supabase):
        """TRIANGULATE: save_credential works without optional label."""
        upsert_chain = self._build_mock_chain(return_data=[{
            "id": str(uuid4()),
            "provider": "kimi",
            "label": None,
            "validated_at": "2024-06-06T12:00:00+00:00",
        }])
        mock_supabase.table.return_value.upsert.return_value = upsert_chain

        service.save_credential("user-1", "kimi", "sk-kimi-key")

        inserted = mock_supabase.table.return_value.upsert.call_args[0][0]
        assert inserted["label"] is None
        assert inserted["validated_at"] is not None

    def test_save_credential_upserts_existing(self, service, mock_supabase, encryption_service):
        """TRIANGULATE: saving same provider updates instead of duplicating."""
        upsert_chain = self._build_mock_chain(return_data=[{
            "id": str(uuid4()),
            "provider": "openai",
            "label": "Updated",
            "validated_at": "2024-06-06T12:00:00+00:00",
        }])
        mock_supabase.table.return_value.upsert.return_value = upsert_chain

        result = service.save_credential("user-1", "openai", "sk-new-key", "Updated")

        mock_supabase.table.return_value.upsert.assert_called_once()
        inserted = mock_supabase.table.return_value.upsert.call_args[0][0]
        assert inserted["encrypted_api_key"].startswith("v1:")
        assert encryption_service.decrypt(inserted["encrypted_api_key"]) == "sk-new-key"
        assert result.validated_at is not None

    # ── get_credentials ──

    def test_get_credentials_excludes_encrypted_key(self, service, mock_supabase):
        """RED: get_credentials must never return the encrypted_api_key field."""
        select_chain = self._build_mock_chain(return_data=[
            {
                "id": "cred-1",
                "provider": "openai",
                "label": "My Key",
                "encrypted_api_key": "v1:should_not_appear",
                "validated_at": "2024-01-01T00:00:00+00:00",
            },
            {
                "id": "cred-2",
                "provider": "anthropic",
                "label": None,
                "encrypted_api_key": "v1:also_hidden",
                "validated_at": None,
            },
        ])
        mock_supabase.table.return_value.select.return_value.eq.return_value = select_chain

        result = service.get_credentials("user-1")

        mock_supabase.table.assert_called_once_with("provider_credentials")
        assert len(result) == 2
        for cred in result:
            assert isinstance(cred, CredentialResponse)
            assert not hasattr(cred, "encrypted_api_key")
            assert "encrypted_api_key" not in cred.model_dump()

    def test_get_credentials_filters_by_user_id(self, service, mock_supabase):
        """TRIANGULATE: get_credentials filters by user_id."""
        select_chain = self._build_mock_chain(return_data=[])
        eq_mock = MagicMock()
        eq_mock.eq.return_value = select_chain
        mock_supabase.table.return_value.select.return_value = eq_mock

        service.get_credentials("user-abc")

        eq_mock.eq.assert_called_once_with("user_id", "user-abc")

    def test_get_credentials_empty_list(self, service, mock_supabase):
        """TRIANGULATE: returns empty list when user has no credentials."""
        select_chain = self._build_mock_chain(return_data=[])
        mock_supabase.table.return_value.select.return_value.eq.return_value = select_chain

        result = service.get_credentials("user-empty")

        assert result == []

    # ── delete_credential ──

    def test_delete_credential_enforces_user_and_provider(self, service, mock_supabase):
        """RED: delete must match both user_id and provider."""
        delete_chain = self._build_mock_chain(return_data=[{"id": "cred-1"}])
        eq_provider = MagicMock()
        eq_provider.eq.return_value = delete_chain
        eq_user = MagicMock()
        eq_user.eq.return_value = eq_provider
        mock_supabase.table.return_value.delete.return_value = eq_user

        result = service.delete_credential("user-1", "openai")

        mock_supabase.table.assert_called_once_with("provider_credentials")
        eq_user.eq.assert_called_once_with("user_id", "user-1")
        eq_provider.eq.assert_called_once_with("provider", "openai")
        assert result is True

    def test_delete_credential_not_found(self, service, mock_supabase):
        """TRIANGULATE: returns False when nothing was deleted."""
        delete_chain = self._build_mock_chain(return_data=[])
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value = delete_chain

        result = service.delete_credential("user-1", "openai")

        assert result is False

    # ── get_decrypted_key ──

    def test_get_decrypted_key_returns_plaintext(self, service, mock_supabase, encryption_service):
        """RED: get_decrypted_key must return the original api_key."""
        encrypted = encryption_service.encrypt("sk-secret-key")
        select_chain = self._build_mock_chain(return_data=[{"encrypted_api_key": encrypted}])
        eq_provider = MagicMock()
        eq_provider.eq.return_value = select_chain
        eq_user = MagicMock()
        eq_user.eq.return_value = eq_provider
        mock_supabase.table.return_value.select.return_value = eq_user

        result = service.get_decrypted_key("user-1", "openai")

        assert result == "sk-secret-key"

    def test_get_decrypted_key_not_found(self, service, mock_supabase):
        """TRIANGULATE: returns None when credential doesn't exist."""
        select_chain = self._build_mock_chain(return_data=[])
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value = select_chain

        result = service.get_decrypted_key("user-1", "openai")

        assert result is None

    # ── test_credential ──

    @pytest.mark.asyncio
    async def test_test_credential_validates_with_adapter(self, service, mock_supabase):
        """RED: test_credential uses the adapter to validate the key."""
        from unittest.mock import patch

        calls = []

        async def mock_stream(*args, **kwargs):
            calls.append("streamed")
            yield "ok"

        with patch("app.services.provider_credential_service.get_adapter") as mock_get_adapter:
            mock_adapter = MagicMock()
            mock_adapter.stream_chat = mock_stream
            mock_get_adapter.return_value = mock_adapter

            result = await service.test_credential("openai", "sk-test", "gpt-4o")

            mock_get_adapter.assert_called_once_with("openai")
            assert calls == ["streamed"]
            assert result is True

    @pytest.mark.asyncio
    async def test_test_credential_invalid_key(self, service):
        """TRIANGULATE: returns False when adapter raises an error."""
        from unittest.mock import patch

        with patch("app.services.provider_credential_service.get_adapter") as mock_get_adapter:
            mock_adapter = MagicMock()
            mock_adapter.stream_chat.side_effect = ValueError("Invalid API key")
            mock_get_adapter.return_value = mock_adapter

            result = await service.test_credential("openai", "sk-bad", "gpt-4o")

            assert result is False
