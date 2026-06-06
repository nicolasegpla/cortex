from app.adapters.openai import OpenAIAdapter


class DeepSeekAdapter(OpenAIAdapter):
    """Adapter for DeepSeek — OpenAI-compatible with custom base URL."""

    provider_name = "deepseek"
    provider_display_name = "DeepSeek"
    _base_url = "https://api.deepseek.com/v1"
    SUPPORTED_MODELS = [
        "deepseek-v4-flash",
        "deepseek-v4-pro",
        "deepseek-chat",
        "deepseek-reasoner",
    ]
