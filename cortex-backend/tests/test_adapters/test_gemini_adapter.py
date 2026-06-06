import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.adapters.gemini import GeminiAdapter


class TestGeminiAdapter:
    """Tests for Gemini adapter using google-generativeai SDK."""

    @pytest.fixture
    def mock_generative_model(self):
        with patch("app.adapters.gemini.genai.GenerativeModel") as mock_cls:
            mock_instance = MagicMock()
            mock_cls.return_value = mock_instance
            yield mock_instance

    @pytest.mark.asyncio
    async def test_stream_chat_yields_text_parts(self, mock_generative_model):
        """Happy path: stream_chat yields content from each response part."""
        mock_response1 = MagicMock()
        mock_response1.parts = [MagicMock(text="Hello")]
        mock_response2 = MagicMock()
        mock_response2.parts = [MagicMock(text=" Gemini")]
        mock_response3 = MagicMock()
        mock_response3.parts = []

        async_iter = AsyncMockIterator([mock_response1, mock_response2, mock_response3])
        mock_generative_model.generate_content_async = AsyncMock(return_value=async_iter)

        adapter = GeminiAdapter()
        messages = [{"role": "user", "content": "Hi"}]

        result = []
        async for chunk in adapter.stream_chat("gemini-2.0-flash", messages, "fake-key"):
            result.append(chunk)

        assert result == ["Hello", " Gemini"]
        mock_generative_model.generate_content_async.assert_called_once()
        call_kwargs = mock_generative_model.generate_content_async.call_args.kwargs
        assert call_kwargs["contents"] == [{"role": "user", "parts": [{"text": "Hi"}]}]
        assert call_kwargs["stream"] is True

    @pytest.mark.asyncio
    async def test_stream_chat_invalid_model_raises(self, mock_generative_model):
        """Adapter validates model against supported list."""
        adapter = GeminiAdapter()
        with pytest.raises(ValueError, match="not supported"):
            async for _ in adapter.stream_chat("invalid-model", [], "fake-key"):
                pass

    @pytest.mark.asyncio
    async def test_stream_chat_api_error_propagates(self, mock_generative_model):
        """Gemini API errors are re-raised as ValueError with provider details."""
        mock_generative_model.generate_content_async.side_effect = Exception(
            "API key invalid"
        )

        adapter = GeminiAdapter()
        with pytest.raises(ValueError, match="Google Gemini API error.*API key invalid.*gemini-2.0-flash"):
            async for _ in adapter.stream_chat("gemini-2.0-flash", [{"role": "user", "content": "Hi"}], "fake-key"):
                pass

    @pytest.mark.asyncio
    async def test_validate_returns_true_on_success(self, mock_generative_model):
        """validate() returns True when minimal generation succeeds."""
        mock_response = MagicMock()
        mock_response.parts = [MagicMock(text="ok")]
        mock_generative_model.generate_content_async = AsyncMock(return_value=mock_response)

        adapter = GeminiAdapter()
        result = await adapter.validate("fake-key")

        assert result is True
        mock_generative_model.generate_content_async.assert_called_once()
        call_kwargs = mock_generative_model.generate_content_async.call_args.kwargs
        assert call_kwargs["contents"] == [{"role": "user", "parts": [{"text": "Hi"}]}]

    @pytest.mark.asyncio
    async def test_validate_returns_false_on_error(self, mock_generative_model):
        """validate() returns False when generation fails."""
        mock_generative_model.generate_content_async.side_effect = Exception(
            "Unauthorized"
        )

        adapter = GeminiAdapter()
        result = await adapter.validate("fake-key")

        assert result is False

    def test_provider_name(self):
        assert GeminiAdapter.provider_name == "gemini"

    def test_provider_display_name(self):
        assert GeminiAdapter.provider_display_name == "Google Gemini"

    def test_supported_models(self):
        assert "gemini-2.0-flash" in GeminiAdapter.SUPPORTED_MODELS
        assert "gemini-1.5-pro" in GeminiAdapter.SUPPORTED_MODELS


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
