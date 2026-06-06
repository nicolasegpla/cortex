import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.adapters.anthropic import AnthropicAdapter


class TestAnthropicAdapter:
    """Tests for Anthropic adapter extracted to app.adapters."""

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
        assert mock_anthropic_client.api_key == "fake-key"

    @pytest.mark.asyncio
    async def test_stream_chat_invalid_model_raises(self, mock_anthropic_client):
        """Adapter validates model against supported list."""
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

    def test_provider_name(self):
        assert AnthropicAdapter.provider_name == "anthropic"

    def test_provider_display_name(self):
        assert AnthropicAdapter.provider_display_name == "Anthropic"


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
