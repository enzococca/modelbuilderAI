"""Agent tools — registry and base interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    """Interface every tool must implement."""

    name: str
    description: str

    @abstractmethod
    async def execute(self, input_text: str, **kwargs: Any) -> str:
        """Execute the tool and return a text result."""
        ...


# Lazy registry to avoid heavy imports at startup
_TOOL_MAP: dict[str, type[BaseTool]] | None = None


def _build_registry() -> dict[str, type[BaseTool]]:
    from tools.web_search import WebSearchTool
    from tools.code_executor import CodeExecutorTool
    from tools.file_processor import FileProcessorTool
    from tools.database_tool import DatabaseTool
    from tools.image_tool import ImageTool
    from tools.ml_pipeline import MLPipelineTool
    from tools.website_generator import WebsiteGeneratorTool
    from tools.gis_tool import GISTool
    return {
        "web_search": WebSearchTool,
        "code_executor": CodeExecutorTool,
        "file_processor": FileProcessorTool,
        "database_tool": DatabaseTool,
        "image_tool": ImageTool,
        "ml_pipeline": MLPipelineTool,
        "website_generator": WebsiteGeneratorTool,
        "gis_tool": GISTool,
    }


def get_tool(name: str) -> BaseTool | None:
    """Get an instantiated tool by name."""
    global _TOOL_MAP
    if _TOOL_MAP is None:
        _TOOL_MAP = _build_registry()
    cls = _TOOL_MAP.get(name)
    if cls is None:
        return None
    return cls()


def list_tools() -> list[dict[str, str]]:
    """Return metadata for all available tools."""
    global _TOOL_MAP
    if _TOOL_MAP is None:
        _TOOL_MAP = _build_registry()
    return [
        {"name": name, "description": cls.description}
        for name, cls in _TOOL_MAP.items()
    ]
