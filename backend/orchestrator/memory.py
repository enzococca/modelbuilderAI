"""Shared memory for pipeline execution and conversation context."""

from __future__ import annotations

from typing import Any


class SharedMemory:
    """Simple in-process key-value store shared between agents in a pipeline run."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    def set(self, key: str, value: Any) -> None:
        self._store[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self._store.get(key, default)

    def get_all(self) -> dict[str, Any]:
        return dict(self._store)

    def clear(self) -> None:
        self._store.clear()
