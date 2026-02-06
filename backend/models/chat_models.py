"""Pydantic models for chat."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Role(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    role: Role
    content: str
    files: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    """Single-model chat request."""
    model: str = "claude-sonnet-4-5-20250929"
    messages: list[ChatMessage]
    system_prompt: str | None = None
    temperature: float = 0.7
    max_tokens: int = 4096
    stream: bool = False
    project_id: str | None = None
    use_rag: bool = False


class MultiChatRequest(BaseModel):
    """Multi-agent orchestrated chat request."""
    messages: list[ChatMessage]
    agents: list[str]
    pattern: str = "sequential"
    project_id: str | None = None


class ChatResponseChunk(BaseModel):
    """SSE streaming chunk."""
    type: str = "content"
    content: str = ""
    model: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class ConversationOut(BaseModel):
    id: str
    project_id: str | None
    title: str
    model: str
    created_at: str
    updated_at: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: Role
    content: str
    model: str | None = None
    created_at: str
