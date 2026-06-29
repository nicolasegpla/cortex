"""n8n chat proxy router — authenticated JSON proxy to an n8n webhook."""

import logging
import time
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import Settings, get_settings
from app.core.security import User, get_current_user
from app.schemas.chat import N8NChatRequest, N8NChatResponse
from app.services.n8n_chat_service import N8NChatProxyError, N8NChatService, N8NChatTimeoutError

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)


def get_n8n_chat_service() -> N8NChatService:
    """Factory for N8NChatService with configured dependencies."""
    return N8NChatService()


@router.post("/n8n")
async def n8n_chat(
    request: N8NChatRequest,
    current_user: User = Depends(get_current_user),
    service: N8NChatService = Depends(get_n8n_chat_service),
    settings: Settings = Depends(get_settings),
):
    """Proxy a chat message to the configured n8n webhook.

    Injects ``sessionId=current_user.id`` and returns the n8n answer as a
    stable JSON payload. The n8n webhook URL, timeout, and downstream auth
    token are read from ``N8N_CHAT_WEBHOOK_URL``, ``N8N_CHAT_TIMEOUT_SECONDS``
    and ``N8N_CHAT_AUTH_TOKEN``.

    Returns ``503`` when the webhook or required downstream auth is not
    configured so the backend can boot without it.
    """
    request_id = uuid4().hex[:6]

    if not settings.n8n_chat_webhook_url or not settings.n8n_chat_auth_token:
        logger.warning(f"[{request_id}] N8N-CHAT: unavailable status=503 webhook_configured={bool(settings.n8n_chat_webhook_url)} auth_configured={bool(settings.n8n_chat_auth_token)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El chat de n8n no está configurado",
        )

    session_id = str(current_user.id)
    start = time.perf_counter()

    logger.info(f"[{request_id}] N8N-CHAT: start message_len={len(request.message)}")

    try:
        answer = await service.send_message(request.message, session_id)
    except N8NChatProxyError as exc:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.warning(f"[{request_id}] N8N-CHAT: proxy_error status=502 duration_ms={duration_ms:.3f} error={exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="La respuesta de n8n no pudo ser procesada",
        ) from exc
    except N8NChatTimeoutError as exc:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.warning(f"[{request_id}] N8N-CHAT: timeout status=504 duration_ms={duration_ms:.3f} error={exc}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El webhook de n8n no respondió a tiempo",
        ) from exc

    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(f"[{request_id}] N8N-CHAT: done status=success duration_ms={duration_ms:.3f}")
    return N8NChatResponse(answer=answer)
