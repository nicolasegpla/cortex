from app.adapters.base import LlmProviderAdapter


class ProviderRegistry:
    """Registry for LLM provider adapters.

    Owns adapter instantiation, model catalog per provider, and
    credential-aware provider listing.
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

    def list_providers(
        self,
        credential_service=None,
        user_id: str | None = None,
    ) -> list[dict]:
        """Return metadata for all registered providers.

        Args:
            credential_service: Optional service with ``get_decrypted_key``.
            user_id: Optional user ID for credential lookup.

        Returns:
            List of provider dicts with keys:
            ``id``, ``name``, ``models``, ``configured``.
        """
        providers = []
        for provider_id, adapter_cls in self._adapters.items():
            adapter = adapter_cls()
            configured = False
            if credential_service is not None and user_id is not None:
                key = credential_service.get_decrypted_key(user_id, provider_id)
                configured = key is not None
            providers.append(
                {
                    "id": provider_id,
                    "name": adapter.provider_display_name,
                    "models": getattr(adapter, "SUPPORTED_MODELS", []),
                    "configured": configured,
                }
            )
        return providers


# Module-level singleton instance
_registry = ProviderRegistry()
