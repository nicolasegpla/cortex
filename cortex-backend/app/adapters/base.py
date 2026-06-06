from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator


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
