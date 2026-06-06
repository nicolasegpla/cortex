"""Chat streaming router — SSE endpoint for LLM provider chat."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.core.security import User, get_current_user
from app.schemas.chat import ChatRequest
from app.services.encryption_service import EncryptionService
from app.adapters import registry
from app.services.provider_credential_service import ProviderCredentialService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/chat", tags=["chat"])


def _stream_sse(event: str, data: str) -> str:
    """Format a single SSE event."""
    return f"event: {event}\ndata: {data}\n\n"


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


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    credential_service: ProviderCredentialService = Depends(get_credential_service),
):
    """Stream chat completions via SSE.

    Accepts a chat request, resolves the provider adapter, decrypts the user's
    credential, and streams back text deltas as Server-Sent Events.

    Events:
        - event: delta  — text chunk from the provider
        - event: done   — streaming complete
        - event: error  — an error occurred
    """
    # Resolve and decrypt the user's credential for this provider
    api_key = credential_service.get_decrypted_key(
        str(current_user.id), request.provider
    )
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No credential found for provider '{request.provider}'. Please add one in settings.",
        )

    # Resolve provider adapter via registry
    try:
        adapter = registry.get_adapter(request.provider)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Convert Pydantic messages to dicts for the adapter
    messages = [msg.model_dump() for msg in request.messages]

    async def event_generator():
        try:
            async for chunk in adapter.stream_chat(request.model, messages, api_key):
                yield _stream_sse("delta", chunk)
            yield _stream_sse("done", "")
        except Exception as exc:
            yield _stream_sse("error", str(exc))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )
