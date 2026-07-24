"""Shared FastAPI dependencies used across routers."""

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.services.email_service import EmailService


def get_email_service() -> EmailService:
    """Get a configured EmailService for transactional delivery."""
    service = EmailService(get_settings())
    if not service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de email no está configurado",
        )
    return service
