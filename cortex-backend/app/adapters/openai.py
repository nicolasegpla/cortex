from collections.abc import AsyncGenerator

import openai

from app.adapters.base import LlmProviderAdapter
from app.schemas.chat import ToolDefinition


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

    def supports_tools(self) -> bool:
        """OpenAI supports function calling via tools parameter."""
        return True

    def build_tool_payload(self, tools: list[ToolDefinition]) -> list[dict]:
        """Transform ToolDefinitions into OpenAI function-calling format.

        Args:
            tools: List of ToolDefinition schemas.

        Returns:
            OpenAI tools payload: list of {"type": "function", "function": {...}} dicts.
        """
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                },
            }
            for tool in tools
        ]

    async def stream_chat_with_tools(
        self, model: str, messages: list[dict], tools: list[ToolDefinition], api_key: str
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions with OpenAI function calling enabled.

        Yields text delta strings for normal responses, or JSON-serialized
        ToolCallResult dicts when the model requests tool invocations.

        Args:
            model: Model identifier.
            messages: List of message dicts.
            tools: Tool definitions to expose to the model.
            api_key: OpenAI API key.

        Yields:
            Text strings or JSON dicts representing tool call results.
        """
        from app.services.llm_provider_service import resolve_model_alias
        from app.schemas.chat import ToolCallResult

        model = resolve_model_alias(model)
        self._validate_model(model)
        self._client.api_key = api_key

        tool_payload = self.build_tool_payload(tools)

        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
                tools=tool_payload,
            )

            # Accumulate tool calls across chunks (OpenAI streams them incrementally)
            accumulated_calls: dict[int, dict] = {}

            async for chunk in stream:
                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta

                # Yield text content if present
                if delta.content:
                    yield delta.content

                # Accumulate tool calls
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = getattr(tc, "index", 0)
                        if idx not in accumulated_calls:
                            accumulated_calls[idx] = {
                                "id": getattr(tc, "id", ""),
                                "name": "",
                                "arguments": "",
                            }

                        # Update name if present
                        func = getattr(tc, "function", None)
                        if func:
                            if getattr(func, "name", None):
                                accumulated_calls[idx]["name"] = func.name
                            if getattr(func, "arguments", None) is not None:
                                accumulated_calls[idx]["arguments"] += func.arguments

                # Yield completed tool calls when finish_reason indicates tool_calls
                finish_reason = getattr(chunk.choices[0], "finish_reason", None)
                if finish_reason == "tool_calls":
                    for call_data in accumulated_calls.values():
                        import json

                        try:
                            args = json.loads(call_data["arguments"]) if call_data["arguments"] else {}
                        except json.JSONDecodeError:
                            args = {}

                        result = ToolCallResult(
                            tool_call_id=call_data["id"],
                            name=call_data["name"],
                            arguments=args,
                        )
                        yield result
                    accumulated_calls.clear()

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
