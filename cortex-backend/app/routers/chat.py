"""Chat streaming router — SSE endpoint for the SQL-orchestrator chat path."""

import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.adapters import registry
from app.core.config import get_settings
from app.core.security import User, get_current_user
from app.orchestrators.sql_orchestrator import SqlOrchestrator
from app.schemas.chat import ChatRequest
from app.services.encryption_service import EncryptionService
from app.services.provider_credential_service import ProviderCredentialService
from app.services.supabase_service import SupabaseService
from app.utils.text_normalization import normalize_response_text

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)


def _stream_sse(event: str, data: str) -> str:
    """Format a single SSE event. Handles multiline payloads per SSE spec."""
    lines = data.splitlines()
    if not lines:
        return f"event: {event}\ndata: \n\n"
    data_lines = "\n".join(f"data: {line}" for line in lines)
    return f"event: {event}\n{data_lines}\n\n"


def _log_response_path(request_id: str, path: str) -> None:
    """Emit one canonical log line describing the chosen response path."""
    logger.info(f"[{request_id}] STREAM: response_path={path}")


def get_credential_service() -> ProviderCredentialService:
    """Factory for ProviderCredentialService with configured dependencies."""
    settings = get_settings()
    supabase = SupabaseService(settings).get_client()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase no está configurado",
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
    credential, and streams back the SQL-orchestrator answer as Server-Sent
    Events.

    Events:
        - event: delta  — text chunk from the orchestrator answer
        - event: done   — streaming complete
        - event: error  — an unexpected error occurred
    """
    api_key = credential_service.get_decrypted_key(
        str(current_user.id), request.provider
    )
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se encontró una credencial para el proveedor '{request.provider}'. Agregala en Configuración.",
        )

    try:
        adapter = registry.get_adapter(request.provider)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    messages = [msg.model_dump() for msg in request.messages]

    latest_user_content = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_user_content = msg.get("content", "") or ""
            break

    request_id = uuid4().hex[:6]

    async def event_generator():
        try:
            logger.info(
                f"[{request_id}] STREAM: start user={latest_user_content!r} "
                f"provider={request.provider} model={request.model}"
            )

            answer = await SqlOrchestrator().run(
                user_text=latest_user_content,
                messages=messages,
                adapter=adapter,
                model=request.model,
                api_key=api_key,
                request_id=request_id,
            )

            _log_response_path(request_id, "sql-orchestrator")
            yield _stream_sse("delta", normalize_response_text(answer))
            yield _stream_sse("done", "")
        except Exception as exc:
            yield _stream_sse("error", f"Ocurrió un error inesperado: {exc}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )
