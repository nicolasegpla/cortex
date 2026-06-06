from app.adapters.base import LlmProviderAdapter
from app.adapters.openai import OpenAIAdapter
from app.adapters.anthropic import AnthropicAdapter
from app.adapters.gemini import GeminiAdapter
from app.adapters.deepseek import DeepSeekAdapter
from app.adapters.registry import ProviderRegistry, _registry

# Register all V1 direct providers at module load time
_registry.register(OpenAIAdapter)
_registry.register(AnthropicAdapter)
_registry.register(GeminiAdapter)
_registry.register(DeepSeekAdapter)

# Convenience alias for the singleton instance
registry = _registry

__all__ = [
    "LlmProviderAdapter",
    "OpenAIAdapter",
    "AnthropicAdapter",
    "GeminiAdapter",
    "DeepSeekAdapter",
    "ProviderRegistry",
    "_registry",
    "registry",
]
