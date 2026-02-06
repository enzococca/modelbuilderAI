"""Pydantic models for agents."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Provider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    OLLAMA = "ollama"


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: Provider
    context_window: int = 128_000
    supports_streaming: bool = True
    supports_tools: bool = True
    supports_vision: bool = False


AVAILABLE_MODELS: list[ModelInfo] = [
    # Anthropic
    ModelInfo(id="claude-opus-4-6", name="Claude Opus 4.5", provider=Provider.ANTHROPIC, context_window=200_000, supports_vision=True),
    ModelInfo(id="claude-sonnet-4-5-20250929", name="Claude Sonnet 4.5", provider=Provider.ANTHROPIC, context_window=200_000, supports_vision=True),
    ModelInfo(id="claude-haiku-4-5-20251001", name="Claude Haiku 4.5", provider=Provider.ANTHROPIC, context_window=200_000, supports_vision=True),
    # OpenAI
    ModelInfo(id="gpt-4o", name="GPT-4o", provider=Provider.OPENAI, supports_vision=True),
    ModelInfo(id="gpt-4o-mini", name="GPT-4o mini", provider=Provider.OPENAI, supports_vision=True),
    ModelInfo(id="o1", name="o1", provider=Provider.OPENAI, supports_tools=False),
    ModelInfo(id="o3-mini", name="o3-mini", provider=Provider.OPENAI, supports_tools=False),
]


class AgentConfig(BaseModel):
    """Configuration for creating / updating an agent."""
    name: str
    model: str = "claude-sonnet-4-5-20250929"
    system_prompt: str = "You are a helpful assistant."
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=1, le=200_000)
    tools: list[str] = Field(default_factory=list)


class AgentResponse(BaseModel):
    """Structured response from an agent."""
    content: str
    model: str
    provider: Provider
    usage: dict[str, int] = Field(default_factory=dict)
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    finish_reason: str = "stop"


class AgentOut(BaseModel):
    """Agent record returned to client."""
    id: str
    name: str
    model: str
    system_prompt: str
    temperature: float
    max_tokens: int
    tools: list[str]
