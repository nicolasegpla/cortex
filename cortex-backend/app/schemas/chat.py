from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: list[ChatMessage]
    provider: Literal["openai", "anthropic", "gemini", "deepseek"]


class ChatEvent(BaseModel):
    type: Literal["delta", "done", "error"]
    data: str | None
