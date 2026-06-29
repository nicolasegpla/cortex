"""n8n chat proxy service."""

import logging

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger("uvicorn.error")


class N8NChatProxyError(Exception):
    """Raised when the n8n response cannot be validated."""


class N8NChatTimeoutError(Exception):
    """Raised when the n8n webhook request times out."""


class N8NChatService:
    """Proxy chat messages to an n8n webhook.

    The service sends exactly ``{ message, sessionId }`` to the configured
    webhook URL and validates that n8n replies with ``{ ok: true, answer: str }``.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def send_message(self, message: str, session_id: str) -> str:
        """Forward ``message`` to n8n on behalf of ``session_id``.

        Args:
            message: The user's chat message.
            session_id: The authenticated session identifier (``current_user.id``).

        Returns:
            The answer string from n8n.

        Raises:
            N8NChatProxyError: If the n8n response is malformed.
            N8NChatTimeoutError: If the request exceeds the configured timeout.
        """
        payload = {"message": message, "sessionId": session_id}
        timeout = self.settings.n8n_chat_timeout_seconds
        webhook_url = self.settings.n8n_chat_webhook_url

        logger.info("n8n-chat: sending message to webhook")

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
                body = response.json()
        except httpx.TimeoutException as exc:
            logger.warning("n8n-chat: webhook timeout")
            raise N8NChatTimeoutError("n8n webhook request timed out") from exc
        except httpx.RequestError as exc:
            logger.warning("n8n-chat: webhook request failed (network error)")
            raise N8NChatProxyError("n8n webhook could not be reached") from exc
        except httpx.HTTPError as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code:
                logger.warning("n8n-chat: webhook returned HTTP status %s", status_code)
            else:
                logger.warning("n8n-chat: webhook HTTP error")
            raise N8NChatProxyError("n8n webhook returned an HTTP error") from exc
        except (ValueError, httpx.DecodingError) as exc:
            logger.warning("n8n-chat: malformed response body")
            raise N8NChatProxyError("n8n response was not valid JSON") from exc

        if not isinstance(body, dict) or body.get("ok") is not True or not isinstance(body.get("answer"), str):
            logger.warning("n8n-chat: malformed response from webhook")
            raise N8NChatProxyError("n8n response did not match expected shape")

        return body["answer"]
