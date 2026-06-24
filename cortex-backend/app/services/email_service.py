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

        html = f"""<!DOCTYPE html>
<html lang=\"es\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>
  <title>Activa tu cuenta — Cortex</title>
</head>
<body style=\"margin:0;padding:0;background-color:#030303;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;\">
  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:#030303;min-height:100vh;\">
    <tr>
      <td align=\"center\" style=\"padding:48px 16px;\">
        <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:480px;background-color:#0d0d0d;border-radius:16px;border:1px solid #1a1a1a;overflow:hidden;\">
          <tr>
            <td style=\"height:3px;background:linear-gradient(90deg,#00e87a,#00ff88,#00e87a);\"></td>
          </tr>

          <tr>
            <td align=\"center\" style=\"padding:40px 40px 32px;\">
              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\">
                <tr>
                  <td align=\"center\">
                    <div style=\"width:96px;height:96px;background-color:#030303;border-radius:14px;display:inline-block;padding:0;line-height:0;\">
                      <img src=\"https://xfahsnhsjijsqmyrdthf.supabase.co/storage/v1/object/sign/brand/Group%2018.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82ODRhMmMzYi1hYTljLTQxYWMtOGVjNy0xZGVlNWRhY2RlMjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJicmFuZC9Hcm91cCAxOC5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzgyMzA4OTQ2LCJleHAiOjMxNzE0MjMwODk0Nn0.nILJnO2WUuQ52_ea2QDWfbh0itQ3e08WtgO0PrhmMhU\" width=\"96\" height=\"96\" alt=\"Cortex\" style=\"border-radius:12px;display:block;\"/>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align=\"center\" style=\"padding-top:14px;\">
                    <span style=\"font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;\">cortex</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style=\"padding:0 40px;\">
              <div style=\"height:1px;background-color:#1a1a1a;\"></div>
            </td>
          </tr>

          <tr>
            <td style=\"padding:36px 40px 28px;\">
              <p style=\"margin:0 0 8px;font-size:11px;font-weight:600;color:#00FF88;text-transform:uppercase;letter-spacing:2px;\">Invitación a Cortex</p>
              <h1 style=\"margin:0 0 16px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.25;letter-spacing:-0.5px;\">Activa tu cuenta<br/>y crea tu contraseña</h1>
              <p style=\"margin:0 0 32px;font-size:15px;color:#888888;line-height:1.6;\">
                Te invitaron a acceder a Cortex. Haz clic en el botón de abajo para activar tu cuenta y completar la creación de tu contraseña.
              </p>

              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">
                <tr>
                  <td align=\"center\">
                    <a href=\"{invite_link}\"
                       style=\"display:inline-block;background-color:#00FF88;color:#030303;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;\">
                      Activar cuenta →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style=\"padding:0 40px 20px;\">
              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color:#111111;border-radius:10px;border:1px solid #1a1a1a;\">
                <tr>
                  <td style=\"padding:16px 18px;\">
                    <p style=\"margin:0 0 8px;font-size:12px;font-weight:600;color:#ffffff;line-height:1.6;\">Si el enlace no funciona, copiá y pegá esta URL en tu navegador:</p>
                    <p style=\"margin:0;font-size:12px;color:#00FF88;line-height:1.6;word-break:break-all;\">{invite_link}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style=\"padding:0 40px 36px;\">
              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color:#111111;border-radius:10px;border:1px solid #1a1a1a;\">
                <tr>
                  <td style=\"padding:16px 18px;\">
                    <p style=\"margin:0;font-size:12px;color:#555555;line-height:1.6;\">
                      🔒 Si no esperabas esta invitación, puedes ignorar este correo con seguridad.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style=\"padding:0 40px;\">
              <div style=\"height:1px;background-color:#1a1a1a;\"></div>
            </td>
          </tr>

          <tr>
            <td align=\"center\" style=\"padding:24px 40px 32px;\">
              <p style=\"margin:0 0 6px;font-size:12px;color:#444444;\">
                Enviado por <strong style=\"color:#555555;\">{self._from_email}</strong>
              </p>
              <p style=\"margin:0;font-size:11px;color:#333333;\">
                © 2025 Cortex. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        return resend.Emails.send(
            {
                "from": self._from_email,
                "to": to_email,
                "subject": "Has sido invitado a Cortex",
                "html": html,
            }
        )
