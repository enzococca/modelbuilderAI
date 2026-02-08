"""Agent implementations — import lazily to avoid loading heavy SDKs at startup."""

from .base_agent import BaseAgent

__all__ = ["BaseAgent"]


def __getattr__(name: str):
    """Lazy-load agent classes on first access."""
    if name == "ClaudeAgent":
        from .claude_agent import ClaudeAgent
        return ClaudeAgent
    if name == "OpenAIAgent":
        from .openai_agent import OpenAIAgent
        return OpenAIAgent
    if name == "LocalAgent":
        from .local_agent import LocalAgent
        return LocalAgent
    raise AttributeError(f"module 'agents' has no attribute {name!r}")
