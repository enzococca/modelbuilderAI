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
    from tools.file_search import FileSearchTool
    from tools.email_search import EmailSearchTool
    from tools.project_analyzer import ProjectAnalyzerTool
    from tools.email_sender import EmailSenderTool
    from tools.web_scraper import WebScraperTool
    from tools.file_manager import FileManagerTool
    from tools.http_request import HTTPRequestTool
    from tools.text_transformer import TextTransformerTool
    from tools.notifier import NotifierTool
    from tools.json_parser import JSONParserTool
    from tools.telegram_bot import TelegramBotTool
    from tools.whatsapp import WhatsAppTool
    from tools.pyarchinit_tool import PyArchInitTool
    from tools.qgis_project import QGISProjectTool
    return {
        "web_search": WebSearchTool,
        "code_executor": CodeExecutorTool,
        "file_processor": FileProcessorTool,
        "database_tool": DatabaseTool,
        "image_tool": ImageTool,
        "ml_pipeline": MLPipelineTool,
        "website_generator": WebsiteGeneratorTool,
        "gis_tool": GISTool,
        "file_search": FileSearchTool,
        "email_search": EmailSearchTool,
        "project_analyzer": ProjectAnalyzerTool,
        "email_sender": EmailSenderTool,
        "web_scraper": WebScraperTool,
        "file_manager": FileManagerTool,
        "http_request": HTTPRequestTool,
        "text_transformer": TextTransformerTool,
        "notifier": NotifierTool,
        "json_parser": JSONParserTool,
        "telegram_bot": TelegramBotTool,
        "whatsapp": WhatsAppTool,
        "pyarchinit_tool": PyArchInitTool,
        "qgis_project": QGISProjectTool,
    }


def get_tool(name: str) -> BaseTool | None:
    """Get an instantiated tool by name.

    If the tool isn't found in the cached registry, rebuild once to pick up
    any tools that were added after the server started.
    """
    global _TOOL_MAP
    if _TOOL_MAP is None:
        _TOOL_MAP = _build_registry()
    cls = _TOOL_MAP.get(name)
    if cls is None:
        # Rebuild registry in case new tools were deployed at runtime
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
