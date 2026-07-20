from app.adapters.base import LlmProviderAdapter


class ProviderRegistry:
    """Registry for LLM provider adapters.

    Owns adapter instantiation, model catalog per provider, and
    adapter-presence-only provider listing.
    """

    def __init__(self) -> None:
        self._adapters: dict[str, type[LlmProviderAdapter]] = {}

    def register(self, adapter_cls: type[LlmProviderAdapter]) -> None:
        """Register an adapter class by its provider_name."""
        self._adapters[adapter_cls.provider_name] = adapter_cls

    def get_adapter(self, provider: str) -> LlmProviderAdapter:
        """Return an instantiated adapter for the given provider name.

        Raises:
            ValueError: If the provider is not registered.
        """
        adapter_cls = self._adapters.get(provider)
        if adapter_cls is None:
            supported = list(self._adapters.keys())
            raise ValueError(
                f"Unknown provider: '{provider}'. Supported: {supported}"
            )
        return adapter_cls()

    def list_providers(self) -> list[dict]:
        """Return metadata for all registered providers (adapter-presence only).

        Returns:
            List of provider dicts with keys:
            ``id``, ``name``, ``models``.
        """
        providers = []
        for provider_id, adapter_cls in self._adapters.items():
            adapter = adapter_cls()
            providers.append(
                {
                    "id": provider_id,
                    "name": adapter.provider_display_name,
                    "models": getattr(adapter, "SUPPORTED_MODELS", []),
                }
            )
        return providers


# Module-level singleton instance
_registry = ProviderRegistry()
