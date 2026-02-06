"""Abstract base class for all AI agents."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator

from models.agent_models import AgentResponse, Provider


class BaseAgent(ABC):
    """Base class every provider-specific agent must extend."""

    name: str
    model: str
    provider: Provider
    system_prompt: str
    temperature: float
    max_tokens: int

    def __init__(
        self,
        *,
        name: str = "assistant",
        model: str,
        system_prompt: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> None:
        self.name = name
        self.model = model
        self.system_prompt = system_prompt
        self.temperature = temperature
        self.max_tokens = max_tokens

    # ── core interface ───────────────────────────────────────

    @abstractmethod
    async def chat(
        self, messages: list[dict[str, str]], *, stream: bool = False
    ) -> AsyncGenerator[str, None] | AgentResponse:
        """Send messages and return a full response or a streaming generator."""
        ...

    @abstractmethod
    async def stream(
        self, messages: list[dict[str, str]]
    ) -> AsyncGenerator[str, None]:
        """Yield content chunks for SSE streaming."""
        ...

    # ── helpers ──────────────────────────────────────────────

    def _format_messages(self, messages: list[dict[str, str]]) -> list[dict[str, str]]:
        """Convert generic message dicts to provider-specific format. Override if needed."""
        return messages
