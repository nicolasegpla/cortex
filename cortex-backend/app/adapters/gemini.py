from collections.abc import AsyncGenerator

import google.generativeai as genai

from app.adapters.base import LlmProviderAdapter
from app.schemas.chat import ToolDefinition


class GeminiAdapter(LlmProviderAdapter):
    """Adapter for Google Gemini API using google-generativeai SDK."""

    provider_name = "gemini"
    provider_display_name = "Google Gemini"
    SUPPORTED_MODELS = ["gemini-2.0-flash", "gemini-1.5-pro"]

    def __init__(self) -> None:
        self._client: genai.GenerativeModel | None = None

    def _get_client(self, model: str) -> genai.GenerativeModel:
        """Lazy-initialize the GenerativeModel client."""
        if self._client is None:
            self._client = genai.GenerativeModel(model_name=model)
        return self._client

    def _validate_model(self, model: str) -> None:
        if model not in self.SUPPORTED_MODELS:
            raise ValueError(
                f"Model '{model}' is not supported for provider '{self.provider_name}'. "
                f"Supported models: {self.SUPPORTED_MODELS}"
            )

    def _convert_messages(self, messages: list[dict]) -> list[dict]:
        """Convert standard messages to Gemini content format."""
        return [
            {"role": msg["role"], "parts": [{"text": msg["content"]}]}
            for msg in messages
        ]

    async def stream_chat(
        self, model: str, messages: list[dict], api_key: str
    ) -> AsyncGenerator[str, None]:
        self._validate_model(model)
        genai.configure(api_key=api_key)
        client = self._get_client(model)
        contents = self._convert_messages(messages)

        try:
            response = await client.generate_content_async(
                contents=contents,
                stream=True,
            )
            async for chunk in response:
                for part in chunk.parts:
                    if hasattr(part, "text") and part.text:
                        yield part.text
        except Exception as exc:
            msg = (
                f"{self.provider_display_name} API error: {exc}. "
                f"Model: {model}"
            )
            raise ValueError(msg) from exc

    async def validate(self, api_key: str) -> bool:
        """Validate API key by making a minimal generation request."""
        genai.configure(api_key=api_key)
        client = self._get_client("gemini-2.0-flash")
        try:
            response = await client.generate_content_async(
                contents=[{"role": "user", "parts": [{"text": "Hi"}]}],
            )
            # Force consumption to trigger any auth errors
            _ = response.parts
            return True
        except Exception:
            return False

    def build_tool_payload(self, tools: list[ToolDefinition]) -> list[dict]:
        """Gemini tool format — placeholder for future implementation."""
        raise NotImplementedError("Gemini tool calling not yet implemented")

    async def stream_chat_with_tools(
        self, model: str, messages: list[dict], tools: list[ToolDefinition], api_key: str
    ):
        """Gemini tool streaming — placeholder for future implementation."""
        raise NotImplementedError("Gemini tool streaming not yet implemented")
