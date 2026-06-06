from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator

from app.schemas.chat import ToolDefinition


class LlmProviderAdapter(ABC):
    """Abstract base class for LLM provider adapters.

    Each adapter normalizes provider-specific SDKs behind a uniform
    ``stream_chat`` interface that yields text deltas as strings.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider key used for model list lookup."""
        ...

    @abstractmethod
    async def stream_chat(
        self, model: str, messages: list[dict], api_key: str
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions from the provider.

        Args:
            model: Model identifier (must be in ``MODELS[provider_name]``).
            messages: List of ``{"role": "user" | "assistant", "content": str}`` dicts.
            api_key: Provider API key.

        Yields:
            Text delta strings.

        Raises:
            ValueError: If the model is not supported or the API call fails.
        """
        ...

    @abstractmethod
    async def validate(self, api_key: str) -> bool:
        """Validate a provider API key.

        Args:
            api_key: Provider API key to test.

        Returns:
            True if the key is valid and the provider is reachable.
        """
        ...

    def supports_tools(self) -> bool:
        """Whether this adapter supports tool calling.

        Defaults to False; override in adapters that support tools.
        """
        return False

    @abstractmethod
    def build_tool_payload(self, tools: list[ToolDefinition]) -> list[dict]:
        """Transform tool definitions into provider-specific tool payload.

        Args:
            tools: List of ToolDefinition schemas.

        Returns:
            Provider-specific tool payload (e.g., OpenAI function-calling format).
        """
        ...

    @abstractmethod
    async def stream_chat_with_tools(
        self, model: str, messages: list[dict], tools: list[ToolDefinition], api_key: str
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions with tool calling enabled.

        Yields either text delta strings or ToolCallResult objects when
        the model requests a tool invocation.

        Args:
            model: Model identifier.
            messages: List of message dicts.
            tools: List of ToolDefinition schemas to expose to the model.
            api_key: Provider API key.

        Yields:
            Text delta strings (normal response) or the string representation
            of tool calls (adapter-specific; caller must parse).
        """
        ...
