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

    def test_deepseek_inherits_supports_tools_from_openai(self):
        """DeepSeek inherits tool support from OpenAIAdapter."""
        adapter = DeepSeekAdapter()
        assert adapter.supports_tools() is True

    def test_deepseek_inherits_build_tool_payload_from_openai(self):
        """DeepSeek inherits build_tool_payload from OpenAIAdapter."""
        from app.schemas.chat import ToolDefinition

        adapter = DeepSeekAdapter()
        tools = [
            ToolDefinition(
                name="search_breweries",
                description="Search",
                parameters={"type": "object", "properties": {}},
            )
        ]
        payload = adapter.build_tool_payload(tools)
        assert len(payload) == 1
        assert payload[0]["function"]["name"] == "search_breweries"

    @pytest.mark.asyncio
    async def test_deepseek_stream_chat_with_tools_inherits_from_openai(self):
        """DeepSeek can use stream_chat_with_tools inherited from OpenAIAdapter."""
        from unittest.mock import AsyncMock, MagicMock, patch
        from app.schemas.chat import ToolDefinition, ToolCallResult

        with patch("app.adapters.openai.openai.AsyncOpenAI") as mock_cls:
            mock_instance = MagicMock()
            mock_cls.return_value = mock_instance

            mock_chunk = MagicMock()
            func_mock = MagicMock()
            func_mock.name = "count_breweries"
            func_mock.arguments = "{}"
            mock_chunk.choices = [
                MagicMock(
                    delta=MagicMock(
                        content=None,
                        tool_calls=[
                            MagicMock(
                                id="call_ds_1",
                                function=func_mock,
                            )
                        ],
                    ),
                    finish_reason="tool_calls",
                )
            ]

            async_iter = AsyncMockIterator([mock_chunk])
            mock_instance.chat.completions.create = AsyncMock(return_value=async_iter)

            adapter = DeepSeekAdapter()
            tools = [ToolDefinition(name="count_breweries", description="Count", parameters={})]

            results = []
            async for item in adapter.stream_chat_with_tools(
                "deepseek-chat", [], tools, "fake-key"
            ):
                results.append(item)

            assert len(results) == 1
            assert isinstance(results[0], ToolCallResult)
            assert results[0].tool_call_id == "call_ds_1"
            assert results[0].name == "count_breweries"


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
