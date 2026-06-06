"""Provider credentials router — CRUD endpoints for encrypted API keys."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import User, get_current_user
from app.schemas.provider_credentials import CredentialCreate, CredentialResponse
from app.services.encryption_service import EncryptionService
from app.services.provider_credential_service import ProviderCredentialService
from app.services.supabase_service import SupabaseService
from app.core.config import get_settings

router = APIRouter(prefix="/provider-credentials", tags=["provider-credentials"])


def get_credential_service() -> ProviderCredentialService:
    """Factory for ProviderCredentialService with configured dependencies."""
    settings = get_settings()
    supabase = SupabaseService(settings).get_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured",
        )
    encryption = EncryptionService()
    return ProviderCredentialService(supabase=supabase, encryption=encryption)


@router.get("", response_model=list[CredentialResponse])
def list_credentials(
    current_user: User = Depends(get_current_user),
    credential_service: ProviderCredentialService = Depends(get_credential_service),
) -> list[CredentialResponse]:
    """List all credentials for the current user.

    Returns metadata only — never includes the encrypted API key.
    """
    return credential_service.get_credentials(str(current_user.id))


@router.post("", response_model=CredentialResponse, status_code=status.HTTP_201_CREATED)
def create_credential(
    payload: CredentialCreate,
    current_user: User = Depends(get_current_user),
    credential_service: ProviderCredentialService = Depends(get_credential_service),
) -> CredentialResponse:
    """Save or update a provider credential.

    The API key is encrypted before storage and never returned in responses.
    """
    return credential_service.save_credential(
        user_id=str(current_user.id),
        provider=payload.provider,
        api_key=payload.api_key,
        label=payload.label,
    )


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    provider: str,
    current_user: User = Depends(get_current_user),
    credential_service: ProviderCredentialService = Depends(get_credential_service),
) -> None:
    """Delete a credential for the given provider."""
    deleted = credential_service.delete_credential(
        user_id=str(current_user.id),
        provider=provider,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No credential found for provider '{provider}'",
        )


@router.post("/test", response_model=dict)
async def test_credential(
    payload: dict,
    current_user: User = Depends(get_current_user),
    credential_service: ProviderCredentialService = Depends(get_credential_service),
) -> dict:
    """Test a provider credential without saving it.

    Request body:
        - provider: str
        - api_key: str
        - model: str

    Returns:
        {"valid": bool}
    """
    valid = await credential_service.test_credential(
        provider=payload.get("provider", ""),
        api_key=payload.get("api_key", ""),
        model=payload.get("model", ""),
    )
    return {"valid": valid}
