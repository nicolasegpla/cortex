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
