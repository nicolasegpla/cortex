import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.adapters.openai import OpenAIAdapter


class TestOpenAIAdapter:
    """Tests for OpenAI adapter extracted to app.adapters."""

    @pytest.fixture
    def mock_openai_client(self):
        with patch("app.adapters.openai.openai.AsyncOpenAI") as mock_cls:
            mock_instance = MagicMock()
            mock_cls.return_value = mock_instance
            yield mock_instance

    @pytest.mark.asyncio
    async def test_stream_chat_yields_text_chunks(self, mock_openai_client):
        """Happy path: stream_chat yields content from each delta."""
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

        result = []
        async for chunk in adapter.stream_chat("gpt-4o", messages, "fake-key"):
            result.append(chunk)

        assert result == ["Hello", " world"]
        mock_openai_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_openai_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == "gpt-4o"
        assert call_kwargs["messages"] == messages
        assert call_kwargs["stream"] is True
        assert mock_openai_client.api_key == "fake-key"

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

    def test_provider_name(self):
        assert OpenAIAdapter.provider_name == "openai"

    def test_provider_display_name(self):
        assert OpenAIAdapter.provider_display_name == "OpenAI"

    def test_supports_tools_returns_true(self):
        """OpenAI adapter reports tool calling support."""
        adapter = OpenAIAdapter()
        assert adapter.supports_tools() is True

    def test_build_tool_payload_returns_openai_format(self):
        """build_tool_payload transforms ToolDefinition list to OpenAI tools JSON."""
        from app.schemas.chat import ToolDefinition

        adapter = OpenAIAdapter()
        tools = [
            ToolDefinition(
                name="search_breweries",
                description="Search breweries",
                parameters={
                    "type": "object",
                    "properties": {"city": {"type": "string"}},
                },
            ),
            ToolDefinition(
                name="count_breweries",
                description="Count breweries",
                parameters={"type": "object", "properties": {}},
            ),
        ]

        payload = adapter.build_tool_payload(tools)

        assert len(payload) == 2
        assert payload[0]["type"] == "function"
        assert payload[0]["function"]["name"] == "search_breweries"
        assert payload[0]["function"]["description"] == "Search breweries"
        assert "parameters" in payload[0]["function"]
        assert payload[1]["type"] == "function"
        assert payload[1]["function"]["name"] == "count_breweries"

    def test_build_tool_payload_empty_list(self):
        """build_tool_payload with empty list returns empty list."""
        adapter = OpenAIAdapter()
        payload = adapter.build_tool_payload([])
        assert payload == []


    @pytest.mark.asyncio
    async def test_stream_chat_with_tools_yields_text_deltas(self, mock_openai_client):
        """stream_chat_with_tools yields text strings when LLM responds with text."""
        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock(delta=MagicMock(content="Hello", tool_calls=None))]

        async_iter = AsyncMockIterator([mock_chunk])
        mock_openai_client.chat.completions.create = AsyncMock(return_value=async_iter)

        from app.schemas.chat import ToolDefinition

        adapter = OpenAIAdapter()
        tools = [ToolDefinition(name="search_breweries", description="Search", parameters={})]
        messages = [{"role": "user", "content": "Hi"}]

        results = []
        async for item in adapter.stream_chat_with_tools("gpt-4o", messages, tools, "fake-key"):
            results.append(item)

        assert results == ["Hello"]
        call_kwargs = mock_openai_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["tools"] is not None
        assert call_kwargs["stream"] is True

    @pytest.mark.asyncio
    async def test_stream_chat_with_tools_yields_tool_call_result(self, mock_openai_client):
        """stream_chat_with_tools yields ToolCallResult when LLM requests a tool."""
        from app.schemas.chat import ToolCallResult

        mock_chunk = MagicMock()
        func_mock = MagicMock()
        func_mock.name = "search_breweries"
        func_mock.arguments = '{"city": "Bogotá"}'
        mock_chunk.choices = [
            MagicMock(
                delta=MagicMock(
                    content=None,
                    tool_calls=[
                        MagicMock(
                            id="call_123",
                            function=func_mock,
                        )
                    ],
                ),
                finish_reason="tool_calls",
            )
        ]

        async_iter = AsyncMockIterator([mock_chunk])
        mock_openai_client.chat.completions.create = AsyncMock(return_value=async_iter)

        from app.schemas.chat import ToolDefinition

        adapter = OpenAIAdapter()
        tools = [ToolDefinition(name="search_breweries", description="Search", parameters={})]
        messages = [{"role": "user", "content": "Find breweries in Bogotá"}]

        results = []
        async for item in adapter.stream_chat_with_tools("gpt-4o", messages, tools, "fake-key"):
            results.append(item)

        assert len(results) == 1
        assert isinstance(results[0], ToolCallResult)
        assert results[0].tool_call_id == "call_123"
        assert results[0].name == "search_breweries"
        assert results[0].arguments == {"city": "Bogotá"}

    @pytest.mark.asyncio
    async def test_stream_chat_with_tools_mixed_deltas_and_tool_call(self, mock_openai_client):
        """stream_chat_with_tools handles text then tool call in same stream."""
        from app.schemas.chat import ToolCallResult

        mock_text = MagicMock()
        mock_text.choices = [MagicMock(delta=MagicMock(content="Let me check", tool_calls=None))]

        mock_tool = MagicMock()
        func_mock2 = MagicMock()
        func_mock2.name = "count_breweries"
        func_mock2.arguments = "{}"
        mock_tool.choices = [
            MagicMock(
                delta=MagicMock(
                    content=None,
                    tool_calls=[
                        MagicMock(
                            id="call_456",
                            function=func_mock2,
                        )
                    ],
                ),
                finish_reason="tool_calls",
            )
        ]

        async_iter = AsyncMockIterator([mock_text, mock_tool])
        mock_openai_client.chat.completions.create = AsyncMock(return_value=async_iter)

        from app.schemas.chat import ToolDefinition

        adapter = OpenAIAdapter()
        tools = [
            ToolDefinition(name="search_breweries", description="Search", parameters={}),
            ToolDefinition(name="count_breweries", description="Count", parameters={}),
        ]

        results = []
        async for item in adapter.stream_chat_with_tools("gpt-4o", [], tools, "fake-key"):
            results.append(item)

        assert len(results) == 2
        assert results[0] == "Let me check"
        assert isinstance(results[1], ToolCallResult)
        assert results[1].name == "count_breweries"
        assert results[1].arguments == {}


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
