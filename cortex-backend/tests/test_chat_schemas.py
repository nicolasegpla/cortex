import pytest
from pydantic import ValidationError

from app.schemas.chat import (
    ChatEvent,
    ChatMessage,
    ChatRequest,
    ToolCall,
    ToolDefinition,
    ToolResult,
)


class TestChatSchemas:
    def test_chat_message_valid(self):
        msg = ChatMessage(role="user", content="hello")
        assert msg.role == "user"
        assert msg.content == "hello"

    def test_chat_message_system_role_valid(self):
        msg = ChatMessage(role="system", content="You are a brewery assistant.")
        assert msg.role == "system"

    def test_chat_message_invalid_role_raises(self):
        with pytest.raises(ValidationError):
            ChatMessage(role="unknown", content="hello")

    @pytest.mark.parametrize("role", ["user", "assistant", "system"])
    def test_chat_message_accepts_all_standard_roles(self, role):
        msg = ChatMessage(role=role, content="hello")
        assert msg.role == role

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

    def test_chat_request_enable_tools_defaults_false(self):
        req = ChatRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="hello")],
            provider="openai",
        )
        assert req.enable_tools is False

    def test_chat_request_enable_tools_true(self):
        req = ChatRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="hello")],
            provider="openai",
            enable_tools=True,
        )
        assert req.enable_tools is True

    def test_tool_definition_valid(self):
        tool = ToolDefinition(
            name="search_breweries",
            description="Search breweries by location",
            parameters={
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                },
            },
        )
        assert tool.name == "search_breweries"
        assert tool.description == "Search breweries by location"
        assert "properties" in tool.parameters

    def test_tool_definition_missing_name_raises(self):
        with pytest.raises(ValidationError):
            ToolDefinition(description="Missing name", parameters={})

    def test_tool_call_serialization(self):
        call = ToolCall(id="call_123", name="search_breweries", arguments={"city": "Bogotá"})
        assert call.id == "call_123"
        assert call.name == "search_breweries"
        assert call.arguments == {"city": "Bogotá"}

    def test_tool_result_serialization(self):
        result = ToolResult(
            tool_call_id="call_123",
            name="search_breweries",
            content='[{"name": "Brewery 1"}]',
        )
        assert result.tool_call_id == "call_123"
        assert result.name == "search_breweries"
        assert '[{"name": "Brewery 1"}]' in result.content

    def test_chat_request_enable_tools_explicit_false(self):
        req = ChatRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="hello")],
            provider="openai",
            enable_tools=False,
        )
        assert req.enable_tools is False

    def test_tool_definition_missing_description_raises(self):
        with pytest.raises(ValidationError):
            ToolDefinition(name="test", parameters={})

    def test_tool_call_empty_arguments(self):
        call = ToolCall(id="call_456", name="count_breweries", arguments={})
        assert call.arguments == {}

    def test_tool_result_empty_content(self):
        result = ToolResult(tool_call_id="call_789", name="count_breweries", content="")
        assert result.content == ""
