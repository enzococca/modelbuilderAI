"""Intelligent routing — classify user intent and pick the best agent."""

from __future__ import annotations

from agents.base_agent import BaseAgent
from models.agent_models import Provider


def get_provider_for_model(model_id: str) -> Provider:
    """Determine the provider from a model ID string."""
    if model_id.startswith("claude"):
        return Provider.ANTHROPIC
    if model_id.startswith(("gpt", "o1", "o3")):
        return Provider.OPENAI
    return Provider.OLLAMA


def create_agent(
    model: str,
    *,
    name: str = "assistant",
    system_prompt: str = "You are a helpful assistant.",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> BaseAgent:
    """Factory: create the right agent subclass for a given model ID."""
    # LM Studio models use prefix "lmstudio:" and OpenAI-compatible API
    if model.startswith("lmstudio:"):
        from agents.openai_agent import OpenAIAgent
        from config import settings
        actual_model = model.removeprefix("lmstudio:")
        return OpenAIAgent(
            name=name,
            model=actual_model,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            base_url=f"{settings.lmstudio_base_url}/v1",
        )

    provider = get_provider_for_model(model)
    kwargs = dict(
        name=name,
        model=model,
        system_prompt=system_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    if provider == Provider.ANTHROPIC:
        from agents.claude_agent import ClaudeAgent
        return ClaudeAgent(**kwargs)

    if provider == Provider.OPENAI:
        from agents.openai_agent import OpenAIAgent
        return OpenAIAgent(**kwargs)

    from agents.local_agent import LocalAgent
    return LocalAgent(**kwargs)
