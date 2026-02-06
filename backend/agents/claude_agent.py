"""Claude (Anthropic) agent implementation."""

from __future__ import annotations

from typing import AsyncGenerator

import anthropic

from config import settings
from models.agent_models import AgentResponse, Provider
from .base_agent import BaseAgent


class ClaudeAgent(BaseAgent):
    provider = Provider.ANTHROPIC

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def chat(
        self, messages: list[dict[str, str]], *, stream: bool = False
    ) -> AsyncGenerator[str, None] | AgentResponse:
        if stream:
            return self.stream(messages)

        resp = await self._client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            system=self.system_prompt,
            messages=self._format_messages(messages),
        )
        return AgentResponse(
            content=resp.content[0].text,
            model=self.model,
            provider=self.provider,
            usage={
                "input_tokens": resp.usage.input_tokens,
                "output_tokens": resp.usage.output_tokens,
            },
            finish_reason=resp.stop_reason or "stop",
        )

    async def stream(
        self, messages: list[dict[str, str]]
    ) -> AsyncGenerator[str, None]:
        async with self._client.messages.stream(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            system=self.system_prompt,
            messages=self._format_messages(messages),
        ) as stream:
            async for text in stream.text_stream:
                yield text
