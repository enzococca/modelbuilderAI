"""Local model agent via Ollama API."""

from __future__ import annotations

from typing import AsyncGenerator

import httpx

from config import settings
from models.agent_models import AgentResponse, Provider
from .base_agent import BaseAgent


class LocalAgent(BaseAgent):
    provider = Provider.OLLAMA

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._base_url = settings.ollama_base_url

    async def chat(
        self, messages: list[dict[str, str]], *, stream: bool = False
    ) -> AsyncGenerator[str, None] | AgentResponse:
        if stream:
            return self.stream(messages)

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self._base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._format_messages(messages),
                    "stream": False,
                    "options": {
                        "temperature": self.temperature,
                        "num_predict": self.max_tokens,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()

        return AgentResponse(
            content=data.get("message", {}).get("content", ""),
            model=self.model,
            provider=self.provider,
            usage={
                "input_tokens": data.get("prompt_eval_count", 0),
                "output_tokens": data.get("eval_count", 0),
            },
        )

    def _format_messages(self, messages: list[dict[str, str]]) -> list[dict[str, str]]:
        formatted = [{"role": "system", "content": self.system_prompt}]
        for m in messages:
            formatted.append({"role": m["role"], "content": m["content"]})
        return formatted

    async def stream(
        self, messages: list[dict[str, str]]
    ) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self._base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": self._format_messages(messages),
                    "stream": True,
                    "options": {
                        "temperature": self.temperature,
                        "num_predict": self.max_tokens,
                    },
                },
            ) as resp:
                import json
                async for line in resp.aiter_lines():
                    if line:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
