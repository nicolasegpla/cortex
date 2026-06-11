from typing import Literal

from pydantic import BaseModel, Field


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
