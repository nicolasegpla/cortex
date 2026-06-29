from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    provider: Literal["openai", "anthropic", "gemini", "deepseek"]
    enable_tools: bool = False


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: dict


class ToolCall(BaseModel):
    id: str
    name: str
    arguments: dict


class ToolResult(BaseModel):
    tool_call_id: str
    name: str
    content: str


class ToolCallResult(BaseModel):
    """Represents a tool call request from the LLM.

    Emitted by adapters during streaming when the model decides
    to invoke a function instead of returning text.
    """

    tool_call_id: str
    name: str
    arguments: dict


class ChatEvent(BaseModel):
    type: Literal["delta", "done", "error"]
    data: str | None


class N8NChatRequest(BaseModel):
    """Frontend → Backend payload for the n8n chat proxy."""

    model_config = ConfigDict(extra='forbid')

    message: str = Field(...)

    @field_validator('message')
    @classmethod
    def _strip_and_require_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError('Message cannot be empty or whitespace-only')
        return value


class N8NChatResponse(BaseModel):
    """Backend → Frontend response for the n8n chat proxy."""

    answer: str
