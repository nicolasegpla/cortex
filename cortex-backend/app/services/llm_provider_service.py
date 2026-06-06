from app.adapters import (
    AnthropicAdapter,
    DeepSeekAdapter,
    GeminiAdapter,
    LlmProviderAdapter,
    OpenAIAdapter,
)

MODELS: dict[str, list[str]] = {
    "openai": ["gpt-4o", "gpt-4o-mini"],
    "anthropic": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    "gemini": ["gemini-2.0-flash", "gemini-1.5-pro"],
    "deepseek": [
        "deepseek-v4-flash",
        "deepseek-v4-pro",
        "deepseek-chat",
        "deepseek-reasoner",
    ],
}

# User-facing aliases that map to concrete provider model IDs.
MODEL_ALIASES: dict[str, str] = {}


def resolve_model_alias(model: str) -> str:
    """Resolve a user-facing model alias to its concrete provider model ID."""
    return MODEL_ALIASES.get(model, model)


PROVIDER_ADAPTERS: dict[str, type[LlmProviderAdapter]] = {
    "openai": OpenAIAdapter,
    "anthropic": AnthropicAdapter,
    "gemini": GeminiAdapter,
    "deepseek": DeepSeekAdapter,
}


def get_adapter(provider: str) -> LlmProviderAdapter:
    """Return an instantiated adapter for the given provider name.

    Raises:
        ValueError: If the provider is not supported.
    """
    adapter_cls = PROVIDER_ADAPTERS.get(provider)
    if adapter_cls is None:
        raise ValueError(f"Unknown provider: '{provider}'. Supported: {list(PROVIDER_ADAPTERS.keys())}")
    return adapter_cls()


# Re-export adapters for backward compatibility
__all__ = [
    "LlmProviderAdapter",
    "OpenAIAdapter",
    "AnthropicAdapter",
    "GeminiAdapter",
    "DeepSeekAdapter",
    "get_adapter",
    "PROVIDER_ADAPTERS",
    "MODELS",
    "MODEL_ALIASES",
    "resolve_model_alias",
]
