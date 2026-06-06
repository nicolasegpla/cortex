import pytest
from unittest.mock import patch

from app.adapters.deepseek import DeepSeekAdapter
from app.adapters.openai import OpenAIAdapter


class TestDeepSeekAdapter:
    """Tests for DeepSeek adapter — OpenAI-compatible with custom base URL."""

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

    def test_deepseek_models(self):
        assert "deepseek-v4-flash" in DeepSeekAdapter.SUPPORTED_MODELS
        assert "deepseek-v4-pro" in DeepSeekAdapter.SUPPORTED_MODELS
        assert "deepseek-chat" in DeepSeekAdapter.SUPPORTED_MODELS
        assert "deepseek-reasoner" in DeepSeekAdapter.SUPPORTED_MODELS

    def test_deepseek_preferred_models_first(self):
        """Preferred models (v4-flash, v4-pro) should be listed before legacy."""
        models = DeepSeekAdapter.SUPPORTED_MODELS
        assert models[0] == "deepseek-v4-flash"
        assert models[1] == "deepseek-v4-pro"
        assert models[2] == "deepseek-chat"
        assert models[3] == "deepseek-reasoner"

    @pytest.mark.asyncio
    async def test_stream_chat_accepts_all_deepseek_models(self):
        """All 4 DeepSeek models should pass validation."""
        from unittest.mock import AsyncMock, MagicMock, patch

        messages = [{"role": "user", "content": "Hi"}]

        for model in DeepSeekAdapter.SUPPORTED_MODELS:
            with patch("app.adapters.openai.openai.AsyncOpenAI") as mock_cls:
                mock_instance = MagicMock()
                mock_cls.return_value = mock_instance
                async_iter = AsyncMockIterator([])
                mock_instance.chat.completions.create = AsyncMock(return_value=async_iter)

                adapter = DeepSeekAdapter()

                # Should not raise
                chunks = []
                async for chunk in adapter.stream_chat(model, messages, "fake-key"):
                    chunks.append(chunk)

                call_kwargs = mock_instance.chat.completions.create.call_args.kwargs
                assert call_kwargs["model"] == model


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
