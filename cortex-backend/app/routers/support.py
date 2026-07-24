"""Support feedback router — authenticated users submit feedback to the support inbox."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import User, get_current_user
from app.dependencies import get_email_service
from app.schemas.support import SupportFeedbackRequest, SupportFeedbackResponse
from app.services.email_service import EmailService

logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/support", tags=["support"])


@router.post("/feedback", response_model=SupportFeedbackResponse)
def submit_feedback(
    payload: SupportFeedbackRequest,
    current_user: User = Depends(get_current_user),
    email_service: EmailService = Depends(get_email_service),
) -> SupportFeedbackResponse:
    """Submit support feedback; delivery is delegated to the EmailService seam.

    The recipient is resolved internally by the seam from
    ``settings.support_to_email`` — the router never passes a ``to_email``.
    ``current_user`` identity is used for logging/audit and passed to the
    seam (email as ``reply_to``, id as template context).
    """
    logger.info(
        "SUPPORT-FEEDBACK: start type=%s subject_len=%d user_id=%s",
        payload.type,
        len(payload.subject),
        current_user.id,
    )

    try:
        email_service.send_support_feedback(
            feedback_type=payload.type,
            subject=payload.subject,
            message=payload.message,
            user_email=current_user.email,
            user_id=str(current_user.id),
        )
    except Exception as exc:
        logger.warning("SUPPORT-FEEDBACK: failed status=502 error=%s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo enviar el mensaje de feedback",
        ) from exc

    logger.info("SUPPORT-FEEDBACK: done status=success")
    return SupportFeedbackResponse(success=True, message="Gracias por tu feedback.")
