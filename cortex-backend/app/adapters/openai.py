from collections.abc import AsyncGenerator

import openai

from app.adapters.base import LlmProviderAdapter


class OpenAIAdapter(LlmProviderAdapter):
    """Adapter for OpenAI-compatible APIs."""

    provider_name = "openai"
    provider_display_name = "OpenAI"
    SUPPORTED_MODELS = ["gpt-4o", "gpt-4o-mini"]
    _base_url: str | None = None

    def __init__(self) -> None:
        client_kwargs: dict[str, str] = {"api_key": "dummy"}
        if self._base_url is not None:
            client_kwargs["base_url"] = self._base_url
        self._client = openai.AsyncOpenAI(**client_kwargs)

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
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except openai.APIError as exc:
            status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
            endpoint = self._base_url or "https://api.openai.com/v1"
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
        """Validate API key by listing models."""
        self._client.api_key = api_key
        try:
            await self._client.models.list()
            return True
        except openai.APIError:
            return False
