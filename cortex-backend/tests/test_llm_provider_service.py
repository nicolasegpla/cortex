import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import AsyncGenerator

from app.services.llm_provider_service import (
    LlmProviderAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GeminiAdapter,
    DeepSeekAdapter,
    get_adapter,
    PROVIDER_ADAPTERS,
    MODELS,
    MODEL_ALIASES,
    resolve_model_alias,
)


class TestLlmProviderAdapterABC:
    """Tests for the abstract base class contract."""

    def test_abc_cannot_be_instantiated(self):
        with pytest.raises(TypeError, match="abstract"):
            LlmProviderAdapter()

    def test_abstract_method_enforced(self):
        """Concrete classes MUST implement stream_chat and validate."""
        class IncompleteAdapter(LlmProviderAdapter):
            pass

        with pytest.raises(TypeError, match="abstract"):
            IncompleteAdapter()


class TestOpenAIProviderName:
    def test_openai_provider_name(self):
        assert OpenAIAdapter.provider_name == "openai"

    def test_openai_provider_display_name(self):
        assert OpenAIAdapter.provider_display_name == "OpenAI"


class TestOpenAIAdapter:
    """Tests for OpenAI-compatible adapter."""

    @pytest.fixture
    def mock_openai_client(self):
        with patch("app.adapters.openai.openai.AsyncOpenAI") as mock_cls:
            mock_instance = MagicMock()
            mock_cls.return_value = mock_instance
            yield mock_instance

    @pytest.mark.asyncio
    async def test_stream_chat_yields_text_chunks(self, mock_openai_client):
        """Happy path: stream_chat yields content from each delta."""
        # Arrange: mock the streaming response
        mock_chunk1 = MagicMock()
        mock_chunk1.choices = [MagicMock(delta=MagicMock(content="Hello"))]
        mock_chunk2 = MagicMock()
        mock_chunk2.choices = [MagicMock(delta=MagicMock(content=" world"))]
        mock_chunk3 = MagicMock()
        mock_chunk3.choices = [MagicMock(delta=MagicMock(content=None))]

        async_iter = AsyncMockIterator([mock_chunk1, mock_chunk2, mock_chunk3])
        mock_openai_client.chat.completions.create = AsyncMock(return_value=async_iter)

        adapter = OpenAIAdapter()
        messages = [{"role": "user", "content": "Hi"}]

        # Act
        result = []
        async for chunk in adapter.stream_chat("gpt-4o", messages, "fake-key"):
            result.append(chunk)

        # Assert
        assert result == ["Hello", " world"]
        mock_openai_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_openai_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == "gpt-4o"
        assert call_kwargs["messages"] == messages
        assert call_kwargs["stream"] is True
        assert "api_key" not in call_kwargs
        assert mock_openai_client.api_key == "fake-key"

    @pytest.mark.asyncio
    async def test_stream_chat_empty_choices_skipped(self, mock_openai_client):
        """Chunks with empty choices list are handled gracefully."""
        mock_chunk1 = MagicMock()
        mock_chunk1.choices = []
        mock_chunk2 = MagicMock()
        mock_chunk2.choices = [MagicMock(delta=MagicMock(content="ok"))]

        async_iter = AsyncMockIterator([mock_chunk1, mock_chunk2])
        mock_openai_client.chat.completions.create = AsyncMock(return_value=async_iter)

        adapter = OpenAIAdapter()
        result = []
        async for chunk in adapter.stream_chat("gpt-4o", [], "fake-key"):
            result.append(chunk)

        assert result == ["ok"]

    @pytest.mark.asyncio
    async def test_stream_chat_invalid_model_raises(self, mock_openai_client):
        """Adapter validates model against supported list."""
        adapter = OpenAIAdapter()
        with pytest.raises(ValueError, match="not supported"):
            async for _ in adapter.stream_chat("invalid-model", [], "fake-key"):
                pass

    @pytest.mark.asyncio
    async def test_stream_chat_api_error_propagates(self, mock_openai_client):
        """OpenAI API errors are re-raised as ValueError with provider details."""
        from openai import APIError

        mock_openai_client.chat.completions.create.side_effect = APIError(
            message="Rate limited", request=MagicMock(), body=None
        )

        adapter = OpenAIAdapter()
        with pytest.raises(ValueError, match="OpenAI API error.*Rate limited.*gpt-4o"):
            async for _ in adapter.stream_chat("gpt-4o", [{"role": "user", "content": "Hi"}], "fake-key"):
                pass

    def test_default_base_url(self, mock_openai_client):
        """OpenAIAdapter uses default OpenAI base URL."""
        with patch("app.adapters.openai.openai.AsyncOpenAI") as mock_cls:
            OpenAIAdapter()
            mock_cls.assert_called_once()
            call_kwargs = mock_cls.call_args.kwargs
            assert "base_url" not in call_kwargs or call_kwargs.get("base_url") is None

    @pytest.mark.asyncio
    async def test_stream_chat_api_error_includes_status_code(self, mock_openai_client):
        """OpenAI API errors include HTTP status code when available."""
        from openai import APIError

        mock_error = APIError(message="Unauthorized", request=MagicMock(), body=None)
        # Simulate status_code attribute present on the error
        mock_error.status_code = 401
        mock_openai_client.chat.completions.create.side_effect = mock_error

        adapter = OpenAIAdapter()
        with pytest.raises(ValueError, match=r"OpenAI API error \(401\): Unauthorized.*gpt-4o"):
            async for _ in adapter.stream_chat("gpt-4o", [{"role": "user", "content": "Hi"}], "fake-key"):
                pass

    @pytest.mark.asyncio
    async def test_validate_returns_true_on_success(self, mock_openai_client):
        """validate() returns True when models.list succeeds."""
        mock_openai_client.models.list = AsyncMock(return_value=MagicMock())

        adapter = OpenAIAdapter()
        result = await adapter.validate("fake-key")

        assert result is True
        mock_openai_client.models.list.assert_called_once()
        assert mock_openai_client.api_key == "fake-key"

    @pytest.mark.asyncio
    async def test_validate_returns_false_on_error(self, mock_openai_client):
        """validate() returns False when models.list fails."""
        from openai import APIError

        mock_openai_client.models.list.side_effect = APIError(
            message="Unauthorized", request=MagicMock(), body=None
        )

        adapter = OpenAIAdapter()
        result = await adapter.validate("fake-key")

        assert result is False


class TestDeepSeekAdapter:
    """Tests for DeepSeek adapter (OpenAI-compatible with custom base URL)."""

    def test_deepseek_is_openai_subclass(self):
        assert issubclass(DeepSeekAdapter, OpenAIAdapter)

    def test_deepseek_provider_name(self):
        assert DeepSeekAdapter.provider_name == "deepseek"

    def test_deepseek_provider_display_name(self):
        assert DeepSeekAdapter.provider_display_name == "DeepSeek"

    def test_deepseek_base_url(self):
        with patch("app.adapters.openai.openai.AsyncOpenAI") as mock_cls:
            DeepSeekAdapter()
            mock_cls.assert_called_once()
            call_kwargs = mock_cls.call_args.kwargs
            assert call_kwargs["base_url"] == "https://api.deepseek.com/v1"


class TestAnthropicProviderName:
    def test_anthropic_provider_name(self):
        assert AnthropicAdapter.provider_name == "anthropic"


class TestAnthropicAdapter:
    """Tests for Anthropic adapter (different message format)."""

    @pytest.fixture
    def mock_anthropic_client(self):
        with patch("app.adapters.anthropic.anthropic.AsyncAnthropic") as mock_cls:
            mock_instance = MagicMock()
            mock_cls.return_value = mock_instance
            yield mock_instance

    @pytest.mark.asyncio
    async def test_stream_chat_yields_text_chunks(self, mock_anthropic_client):
        """Happy path: stream_chat yields content from each event."""
        mock_event1 = MagicMock()
        mock_event1.type = "content_block_delta"
        mock_event1.delta = MagicMock(text="Hello")
        mock_event2 = MagicMock()
        mock_event2.type = "content_block_delta"
        mock_event2.delta = MagicMock(text=" Claude")
        mock_event3 = MagicMock()
        mock_event3.type = "message_stop"

        async_iter = AsyncMockIterator([mock_event1, mock_event2, mock_event3])
        mock_anthropic_client.messages.create = AsyncMock(return_value=async_iter)

        adapter = AnthropicAdapter()
        messages = [{"role": "user", "content": "Hi"}]

        result = []
        async for chunk in adapter.stream_chat("claude-3-5-sonnet-20241022", messages, "fake-key"):
            result.append(chunk)

        assert result == ["Hello", " Claude"]
        mock_anthropic_client.messages.create.assert_called_once()
        call_kwargs = mock_anthropic_client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-3-5-sonnet-20241022"
        assert call_kwargs["max_tokens"] == 4096
        assert call_kwargs["stream"] is True
        assert "api_key" not in call_kwargs
        assert mock_anthropic_client.api_key == "fake-key"

    @pytest.mark.asyncio
    async def test_stream_chat_converts_messages_format(self, mock_anthropic_client):
        """Anthropic uses 'user'/'assistant' roles directly — no conversion needed for simple cases."""
        async_iter = AsyncMockIterator([])
        mock_anthropic_client.messages.create = AsyncMock(return_value=async_iter)

        adapter = AnthropicAdapter()
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
        ]

        async for _ in adapter.stream_chat("claude-3-5-sonnet-20241022", messages, "fake-key"):
            pass

        call_kwargs = mock_anthropic_client.messages.create.call_args.kwargs
        assert call_kwargs["messages"] == messages

    @pytest.mark.asyncio
    async def test_stream_chat_invalid_model_raises(self, mock_anthropic_client):
        adapter = AnthropicAdapter()
        with pytest.raises(ValueError, match="not supported"):
            async for _ in adapter.stream_chat("invalid-model", [], "fake-key"):
                pass

    @pytest.mark.asyncio
    async def test_stream_chat_api_error_propagates(self, mock_anthropic_client):
        """Anthropic API errors are re-raised as ValueError with provider details."""
        from anthropic import APIError

        mock_anthropic_client.messages.create.side_effect = APIError(
            message="Invalid API key", request=MagicMock(), body=None
        )

        adapter = AnthropicAdapter()
        with pytest.raises(ValueError, match="Anthropic API error.*Invalid API key.*claude-3-5-sonnet-20241022"):
            async for _ in adapter.stream_chat("claude-3-5-sonnet-20241022", [{"role": "user", "content": "Hi"}], "fake-key"):
                pass

    @pytest.mark.asyncio
    async def test_validate_returns_true_on_success(self, mock_anthropic_client):
        """validate() returns True when messages.create with max_tokens=1 succeeds."""
        async_iter = AsyncMockIterator([])
        mock_anthropic_client.messages.create = AsyncMock(return_value=async_iter)

        adapter = AnthropicAdapter()
        result = await adapter.validate("fake-key")

        assert result is True
        call_kwargs = mock_anthropic_client.messages.create.call_args.kwargs
        assert call_kwargs["max_tokens"] == 1
        assert mock_anthropic_client.api_key == "fake-key"

    @pytest.mark.asyncio
    async def test_validate_returns_false_on_error(self, mock_anthropic_client):
        """validate() returns False when messages.create fails."""
        from anthropic import APIError

        mock_anthropic_client.messages.create.side_effect = APIError(
            message="Unauthorized", request=MagicMock(), body=None
        )

        adapter = AnthropicAdapter()
        result = await adapter.validate("fake-key")

        assert result is False


class TestGetAdapter:
    """Tests for the adapter factory function."""

    def test_get_adapter_openai(self):
        adapter = get_adapter("openai")
        assert isinstance(adapter, OpenAIAdapter)

    def test_get_adapter_anthropic(self):
        adapter = get_adapter("anthropic")
        assert isinstance(adapter, AnthropicAdapter)

    def test_get_adapter_deepseek(self):
        adapter = get_adapter("deepseek")
        assert isinstance(adapter, DeepSeekAdapter)

    def test_get_adapter_gemini(self):
        adapter = get_adapter("gemini")
        assert isinstance(adapter, GeminiAdapter)

    def test_get_adapter_invalid_provider_raises(self):
        with pytest.raises(ValueError, match="Unknown provider"):
            get_adapter("unknown")


class TestModelRouting:
    """Tests for provider-specific model lists."""

    def test_models_const_exists(self):
        assert "openai" in MODELS
        assert "anthropic" in MODELS
        assert "gemini" in MODELS
        assert "deepseek" in MODELS

    def test_openai_models(self):
        assert "gpt-4o" in MODELS["openai"]
        assert "gpt-4o-mini" in MODELS["openai"]

    def test_anthropic_models(self):
        assert "claude-3-5-sonnet-20241022" in MODELS["anthropic"]
        assert "claude-3-5-haiku-20241022" in MODELS["anthropic"]

    def test_deepseek_models(self):
        assert "deepseek-v4-flash" in MODELS["deepseek"]
        assert "deepseek-v4-pro" in MODELS["deepseek"]
        assert "deepseek-chat" in MODELS["deepseek"]
        assert "deepseek-reasoner" in MODELS["deepseek"]

    def test_deepseek_preferred_models_order(self):
        """Preferred models should be listed before legacy choices."""
        models = MODELS["deepseek"]
        assert models[0] == "deepseek-v4-flash"
        assert models[1] == "deepseek-v4-pro"
        assert models[2] == "deepseek-chat"
        assert models[3] == "deepseek-reasoner"

    def test_gemini_models(self):
        assert "gemini-2.0-flash" in MODELS["gemini"]
        assert "gemini-1.5-pro" in MODELS["gemini"]


class TestModelAliases:
    """Tests for user-facing model alias resolution."""

    def test_resolve_model_alias_passthrough_unknown(self):
        assert resolve_model_alias("gpt-4o") == "gpt-4o"
        assert resolve_model_alias("gemini-2.0-flash") == "gemini-2.0-flash"


# Helper class for mocking async iterables
class AsyncMockIterator:
    def __init__(self, items):
        self.items = items
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.items):
            raise StopAsyncIteration
        item = self.items[self.index]
        self.index += 1
        return item
