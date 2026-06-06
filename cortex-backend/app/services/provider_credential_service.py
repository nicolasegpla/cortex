"""Service for managing encrypted provider credentials in Supabase."""

from datetime import datetime, timezone

from app.schemas.provider_credentials import CredentialResponse
from app.services.encryption_service import EncryptionService
from app.services.llm_provider_service import get_adapter


class ProviderCredentialService:
    """CRUD service for provider API keys with encryption at rest.

    All stored keys are encrypted via Fernet (EncryptionService).
    Responses never include the encrypted or plaintext key.
    """

    def __init__(self, supabase, encryption: EncryptionService) -> None:
        self._supabase = supabase
        self._encryption = encryption

    def save_credential(
        self, user_id: str, provider: str, api_key: str, label: str | None = None
    ) -> CredentialResponse:
        """Save or update a provider credential, encrypting the API key."""
        encrypted_key = self._encryption.encrypt(api_key)
        payload = {
            "user_id": user_id,
            "provider": provider,
            "encrypted_api_key": encrypted_key,
            "label": label,
            "validated_at": datetime.now(timezone.utc).isoformat(),
        }
        response = self._supabase.table("provider_credentials").upsert(payload).execute()
        data = response.data[0] if response.data else {}
        return self._to_response(data)

    def get_credentials(self, user_id: str) -> list[CredentialResponse]:
        """List all credentials for a user. Excludes the encrypted key."""
        response = (
            self._supabase.table("provider_credentials")
            .select("id, provider, label, validated_at")
            .eq("user_id", user_id)
            .execute()
        )
        return [self._to_response(row) for row in (response.data or [])]

    def delete_credential(self, user_id: str, provider: str) -> bool:
        """Delete a credential matching user_id and provider."""
        response = (
            self._supabase.table("provider_credentials")
            .delete()
            .eq("user_id", user_id)
            .eq("provider", provider)
            .execute()
        )
        return bool(response.data)

    def get_decrypted_key(self, user_id: str, provider: str) -> str | None:
        """Retrieve and decrypt the API key for chat use."""
        response = (
            self._supabase.table("provider_credentials")
            .select("encrypted_api_key")
            .eq("user_id", user_id)
            .eq("provider", provider)
            .execute()
        )
        if not response.data:
            return None
        encrypted = response.data[0]["encrypted_api_key"]
        return self._encryption.decrypt(encrypted)

    async def test_credential(self, provider: str, api_key: str, model: str) -> bool:
        """Test a credential by making a minimal streaming request."""
        try:
            adapter = get_adapter(provider)
            messages = [{"role": "user", "content": "Hi"}]
            chunks = []
            async for chunk in adapter.stream_chat(model, messages, api_key):
                chunks.append(chunk)
                if chunks:
                    break
            return True
        except Exception:
            return False

    def _to_response(self, data: dict) -> CredentialResponse:
        return CredentialResponse(
            id=str(data.get("id", "")),
            provider=data.get("provider", ""),
            label=data.get("label"),
            validated_at=data.get("validated_at"),
        )
