from collections.abc import AsyncGenerator

import anthropic

from app.adapters.base import LlmProviderAdapter


class AnthropicAdapter(LlmProviderAdapter):
    """Adapter for Anthropic Claude API."""

    provider_name = "anthropic"
    provider_display_name = "Anthropic"
    SUPPORTED_MODELS = ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]

    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(api_key="dummy")

    def _validate_model(self, model: str) -> None:
        supported = self.SUPPORTED_MODELS
        if model not in supported:
            raise ValueError(
                f"Model '{model}' is not supported for provider '{self.provider_name}'. "
                f"Supported models: {supported}"
            )

    async def stream_chat(
        self, model: str, messages: list[dict], api_key: str
    ) -> AsyncGenerator[str, None]:
        from app.services.llm_provider_service import resolve_model_alias

        model = resolve_model_alias(model)
        self._validate_model(model)
        self._client.api_key = api_key
        try:
            stream = await self._client.messages.create(
                model=model,
                max_tokens=4096,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
            )
            async for event in stream:
                if event.type == "content_block_delta":
                    yield event.delta.text
        except anthropic.APIError as exc:
            status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
            endpoint = "https://api.anthropic.com/v1"
            if status:
                msg = (
                    f"{self.provider_display_name} API error ({status}): {exc.message}. "
                    f"Model: {model}, Endpoint: {endpoint}"
                )
            else:
                msg = (
                    f"{self.provider_display_name} API error: {exc.message}. "
                    f"Model: {model}, Endpoint: {endpoint}"
                )
            raise ValueError(msg) from exc

    async def validate(self, api_key: str) -> bool:
        """Validate API key by creating a minimal message."""
        self._client.api_key = api_key
        try:
            await self._client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1,
                messages=[{"role": "user", "content": "Hi"}],
            )
            return True
        except anthropic.APIError:
            return False
