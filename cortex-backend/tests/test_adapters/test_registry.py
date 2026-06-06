import pytest
from unittest.mock import AsyncMock, MagicMock

from app.adapters import (
    AnthropicAdapter,
    DeepSeekAdapter,
    GeminiAdapter,
    OpenAIAdapter,
    ProviderRegistry,
)
from app.adapters.base import LlmProviderAdapter


class TestProviderRegistry:
    """Tests for ProviderRegistry — adapter registration, dispatch, and listing."""

    @pytest.fixture
    def registry(self):
        """Return a fresh registry instance for each test."""
        return ProviderRegistry()

    @pytest.fixture
    def mock_credential_service(self):
        """Mock credential service with get_decrypted_key method."""
        service = MagicMock()
        service.get_decrypted_key = MagicMock(return_value=None)
        return service

    def test_register_adds_adapter_class(self, registry):
        """register() stores adapter class by provider_name."""
        registry.register(OpenAIAdapter)
        assert "openai" in registry._adapters
        assert registry._adapters["openai"] is OpenAIAdapter

    def test_register_duplicate_overwrites(self, registry):
        """register() allows re-registration (idempotent)."""
        registry.register(OpenAIAdapter)
        registry.register(OpenAIAdapter)
        assert len(registry._adapters) == 1
        assert registry._adapters["openai"] is OpenAIAdapter

    def test_get_adapter_returns_instance(self, registry):
        """get_adapter() returns instantiated adapter for registered provider."""
        registry.register(OpenAIAdapter)
        adapter = registry.get_adapter("openai")
        assert isinstance(adapter, OpenAIAdapter)

    def test_get_adapter_unknown_raises(self, registry):
        """get_adapter() raises ValueError for unregistered provider."""
        with pytest.raises(ValueError, match="Unknown provider: 'unknown'.*Supported: \[\]"):
            registry.get_adapter("unknown")

    def test_get_adapter_dispatches_all_v1_providers(self, registry):
        """get_adapter() returns correct adapter type for each V1 provider."""
        registry.register(OpenAIAdapter)
        registry.register(AnthropicAdapter)
        registry.register(GeminiAdapter)
        registry.register(DeepSeekAdapter)

        assert isinstance(registry.get_adapter("openai"), OpenAIAdapter)
        assert isinstance(registry.get_adapter("anthropic"), AnthropicAdapter)
        assert isinstance(registry.get_adapter("gemini"), GeminiAdapter)
        assert isinstance(registry.get_adapter("deepseek"), DeepSeekAdapter)

    def test_list_providers_returns_all_registered(self, registry):
        """list_providers() returns metadata for all registered adapters."""
        registry.register(OpenAIAdapter)
        registry.register(AnthropicAdapter)

        providers = registry.list_providers()

        assert len(providers) == 2
        openai_entry = next(p for p in providers if p["id"] == "openai")
        assert openai_entry["name"] == "OpenAI"
        assert "gpt-4o" in openai_entry["models"]

    def test_list_providers_includes_configured_status(self, registry, mock_credential_service):
        """list_providers() marks providers as configured when credential exists."""
        registry.register(OpenAIAdapter)
        mock_credential_service.get_decrypted_key.return_value = "sk-test-key"

        providers = registry.list_providers(
            credential_service=mock_credential_service, user_id="user-123"
        )

        openai_entry = next(p for p in providers if p["id"] == "openai")
        assert openai_entry["configured"] is True
        mock_credential_service.get_decrypted_key.assert_called_once_with("user-123", "openai")

    def test_list_providers_unconfigured_when_no_credential(self, registry, mock_credential_service):
        """list_providers() marks providers as unconfigured when credential missing."""
        registry.register(OpenAIAdapter)
        mock_credential_service.get_decrypted_key.return_value = None

        providers = registry.list_providers(
            credential_service=mock_credential_service, user_id="user-123"
        )

        openai_entry = next(p for p in providers if p["id"] == "openai")
        assert openai_entry["configured"] is False

    def test_list_providers_excludes_non_v1_providers(self, registry):
        """Registry only includes explicitly registered V1 providers."""
        registry.register(OpenAIAdapter)
        registry.register(AnthropicAdapter)
        registry.register(GeminiAdapter)
        registry.register(DeepSeekAdapter)

        providers = registry.list_providers()
        provider_ids = {p["id"] for p in providers}

        assert provider_ids == {"openai", "anthropic", "gemini", "deepseek"}
        assert "kimi" not in provider_ids
        assert "minimax" not in provider_ids

    def test_registry_singleton_exists(self):
        """Module-level _registry singleton is available."""
        from app.adapters.registry import _registry

        assert isinstance(_registry, ProviderRegistry)
