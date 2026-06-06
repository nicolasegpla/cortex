import pytest
from pydantic import ValidationError

from app.schemas.chat import ChatEvent, ChatMessage, ChatRequest


class TestChatSchemas:
    def test_chat_message_valid(self):
        msg = ChatMessage(role="user", content="hello")
        assert msg.role == "user"
        assert msg.content == "hello"

    def test_chat_message_invalid_role_raises(self):
        with pytest.raises(ValidationError):
            ChatMessage(role="system", content="hello")

    def test_chat_request_valid(self):
        req = ChatRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="hello")],
            provider="openai",
        )
        assert req.provider == "openai"

    def test_chat_request_gemini_valid(self):
        req = ChatRequest(
            model="gemini-2.0-flash",
            messages=[ChatMessage(role="user", content="hello")],
            provider="gemini",
        )
        assert req.provider == "gemini"

    def test_chat_request_deepseek_valid(self):
        req = ChatRequest(
            model="deepseek-chat",
            messages=[ChatMessage(role="user", content="hello")],
            provider="deepseek",
        )
        assert req.provider == "deepseek"

    def test_chat_request_deepseek_v4_flash_valid(self):
        req = ChatRequest(
            model="deepseek-v4-flash",
            messages=[ChatMessage(role="user", content="hello")],
            provider="deepseek",
        )
        assert req.provider == "deepseek"

    def test_chat_request_deepseek_v4_pro_valid(self):
        req = ChatRequest(
            model="deepseek-v4-pro",
            messages=[ChatMessage(role="user", content="hello")],
            provider="deepseek",
        )
        assert req.provider == "deepseek"

    def test_chat_request_deepseek_reasoner_valid(self):
        req = ChatRequest(
            model="deepseek-reasoner",
            messages=[ChatMessage(role="user", content="hello")],
            provider="deepseek",
        )
        assert req.provider == "deepseek"

    def test_chat_request_invalid_provider_raises(self):
        with pytest.raises(ValidationError):
            ChatRequest(
                model="gpt-4o",
                messages=[ChatMessage(role="user", content="hello")],
                provider="invalid",
            )

    def test_chat_request_deprecated_kimi_provider_raises(self):
        """Kimi is no longer a supported V1 provider."""
        with pytest.raises(ValidationError):
            ChatRequest(
                model="kimi-for-coding",
                messages=[ChatMessage(role="user", content="hello")],
                provider="kimi",
            )

    def test_chat_request_deprecated_minimax_provider_raises(self):
        """Minimax is no longer a supported V1 provider."""
        with pytest.raises(ValidationError):
            ChatRequest(
                model="abab6.5s-chat",
                messages=[ChatMessage(role="user", content="hello")],
                provider="minimax",
            )

    def test_chat_event_delta(self):
        event = ChatEvent(type="delta", data="hello")
        assert event.type == "delta"
        assert event.data == "hello"

    def test_chat_event_done(self):
        event = ChatEvent(type="done", data=None)
        assert event.type == "done"
        assert event.data is None

    def test_chat_event_invalid_type_raises(self):
        with pytest.raises(ValidationError):
            ChatEvent(type="start", data="hello")
