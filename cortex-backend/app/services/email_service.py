"""Application-controlled email delivery service."""

import resend

from app.core.config import Settings, get_settings


class EmailService:
    """Send transactional emails via Resend.

    The service uses the Resend Python SDK and configures the global API key
    from application settings. It is intentionally thin so that routers can
    stay focused on HTTP concerns.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._api_key = self.settings.resend_api_key
        self._from_email = self.settings.resend_from_email
        if self._api_key:
            resend.api_key = self._api_key

    def is_configured(self) -> bool:
        """Return whether the service has the minimum config to send email."""
        return bool(self._api_key and self._from_email)

    def send_invite_email(self, to_email: str, invite_link: str) -> dict:
        """Send an invite email containing the Supabase activation link.

        Args:
            to_email: The invited user's email address.
            invite_link: The Supabase-generated action link.

        Returns:
            The Resend send response (contains the email id).

        Raises:
            RuntimeError: If the email service is not configured.
            resend.exceptions.ResendError: If the Resend API rejects the request.
        """
        if not self.is_configured():
            raise RuntimeError("El servicio de email no está configurado")

        return resend.Emails.send(
            {
                "from": self._from_email,
                "to": to_email,
                "subject": "Invitación a CORTEX",
                "html": (
                    "<p>Te han invitado a unirte a CORTEX.</p>"
                    f"<p><a href='{invite_link}'>Activar mi cuenta</a></p>"
                    "<p>Si el enlace no funciona, copiá y pegá esta URL en tu navegador:</p>"
                    f"<p>{invite_link}</p>"
                ),
            }
        )
