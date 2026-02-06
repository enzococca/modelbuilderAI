"""OpenAI agent implementation."""

from __future__ import annotations

from typing import AsyncGenerator

import openai

from config import settings
from models.agent_models import AgentResponse, Provider
from .base_agent import BaseAgent


class OpenAIAgent(BaseAgent):
    provider = Provider.OPENAI

    def __init__(self, base_url: str | None = None, **kwargs) -> None:
        super().__init__(**kwargs)
        client_kwargs: dict = {"api_key": settings.openai_api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
            # LM Studio doesn't need a real API key
            if not client_kwargs["api_key"]:
                client_kwargs["api_key"] = "lm-studio"
        self._client = openai.AsyncOpenAI(**client_kwargs)

    def _format_messages(self, messages: list[dict[str, str]]) -> list[dict[str, str]]:
        formatted = [{"role": "system", "content": self.system_prompt}]
        for m in messages:
            formatted.append({"role": m["role"], "content": m["content"]})
        return formatted

    async def chat(
        self, messages: list[dict[str, str]], *, stream: bool = False
    ) -> AsyncGenerator[str, None] | AgentResponse:
        if stream:
            return self.stream(messages)

        resp = await self._client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            messages=self._format_messages(messages),
        )
        choice = resp.choices[0]
        return AgentResponse(
            content=choice.message.content or "",
            model=self.model,
            provider=self.provider,
            usage={
                "input_tokens": resp.usage.prompt_tokens if resp.usage else 0,
                "output_tokens": resp.usage.completion_tokens if resp.usage else 0,
            },
            finish_reason=choice.finish_reason or "stop",
        )

    async def stream(
        self, messages: list[dict[str, str]]
    ) -> AsyncGenerator[str, None]:
        resp = await self._client.chat.completions.create(
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            messages=self._format_messages(messages),
            stream=True,
        )
        async for chunk in resp:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content
