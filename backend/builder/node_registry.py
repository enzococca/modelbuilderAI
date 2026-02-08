"""Registry of available node types for workflow builder."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class NodeDefinition:
    """Metadata about a node type available in the builder."""
    type: str
    label: str
    category: str
    description: str
    default_data: dict = field(default_factory=dict)
    inputs: int = 1
    outputs: int = 1


# All node types the builder palette can offer
NODE_REGISTRY: list[NodeDefinition] = [
    # Agent nodes
    NodeDefinition(
        type="agent",
        label="AI Agent",
        category="agents",
        description="Runs a prompt through an AI model",
        default_data={"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a helpful assistant.", "temperature": 0.7, "max_tokens": 4096},
    ),
    # Tool nodes
    NodeDefinition(
        type="tool",
        label="Tool",
        category="tools",
        description="Execute a tool (web search, code execution, etc.)",
        default_data={"tool_name": "", "config": {}},
    ),
    NodeDefinition(
        type="tool",
        label="Web Search",
        category="tools",
        description="Search the web and return results",
        default_data={"tool_name": "web_search", "config": {"max_results": 5}},
    ),
    NodeDefinition(
        type="tool",
        label="Code Executor",
        category="tools",
        description="Execute Python code in a sandbox",
        default_data={"tool_name": "code_executor", "config": {"language": "python", "timeout": 30}},
    ),
    NodeDefinition(
        type="tool",
        label="File Processor",
        category="tools",
        description="Parse and extract text from documents",
        default_data={"tool_name": "file_processor", "config": {}},
    ),
    NodeDefinition(
        type="tool",
        label="Database Query",
        category="tools",
        description="Execute SQL queries",
        default_data={"tool_name": "database_tool", "config": {}},
    ),
    NodeDefinition(
        type="tool",
        label="Image Analysis",
        category="tools",
        description="Analyze images using vision models",
        default_data={"tool_name": "image_tool", "config": {}},
    ),
    NodeDefinition(
        type="tool",
        label="ML Pipeline",
        category="tools",
        description="Train, predict, evaluate ML models from CSV data",
        default_data={"tool_name": "ml_pipeline", "config": {"operation": "train"}},
    ),
    NodeDefinition(
        type="tool",
        label="Website Generator",
        category="tools",
        description="Generate HTML/CSS/JS website projects as ZIP",
        default_data={"tool_name": "website_generator", "config": {}},
    ),
    NodeDefinition(
        type="tool",
        label="GIS Analysis",
        category="tools",
        description="Geospatial analysis: shapefiles, geopackages, GeoTIFF, DEM, map generation",
        default_data={"tool_name": "gis_tool", "config": {"operation": "info"}},
    ),
    NodeDefinition(
        type="tool",
        label="File Search",
        category="tools",
        description="Search files across local PC, Dropbox, Google Drive, OneDrive",
        default_data={"tool_name": "file_search", "config": {"source": "local", "max_results": 20}},
    ),
    NodeDefinition(
        type="tool",
        label="Email Search",
        category="tools",
        description="Search emails across Gmail, Outlook, IMAP",
        default_data={"tool_name": "email_search", "config": {"source": "gmail", "max_results": 20}},
    ),
    NodeDefinition(
        type="tool",
        label="Project Analyzer",
        category="tools",
        description="Analyze a software project: structure, dependencies, key files",
        default_data={"tool_name": "project_analyzer", "config": {"max_depth": 4}},
    ),
    NodeDefinition(
        type="tool",
        label="Email Sender",
        category="tools",
        description="Send emails via Gmail, Outlook, or SMTP",
        default_data={"tool_name": "email_sender", "config": {"source": "smtp"}},
    ),
    NodeDefinition(
        type="tool",
        label="Web Scraper",
        category="tools",
        description="Scrape web pages: extract text, links, tables, CSS selectors",
        default_data={"tool_name": "web_scraper", "config": {"operation": "extract_text"}},
    ),
    NodeDefinition(
        type="tool",
        label="File Manager",
        category="tools",
        description="Manage local files: create folders, read/write, copy, move, delete",
        default_data={"tool_name": "file_manager", "config": {"operation": "list"}},
    ),
    NodeDefinition(
        type="tool",
        label="HTTP Request",
        category="tools",
        description="Call REST APIs: GET, POST, PUT, DELETE with auth and headers",
        default_data={"tool_name": "http_request", "config": {"method": "GET"}},
    ),
    NodeDefinition(
        type="tool",
        label="Text Transformer",
        category="tools",
        description="Transform text: regex, split, join, template, case change, count",
        default_data={"tool_name": "text_transformer", "config": {"operation": "trim"}},
    ),
    NodeDefinition(
        type="tool",
        label="Notifier",
        category="tools",
        description="Send notifications: Slack, Discord, Telegram, webhook",
        default_data={"tool_name": "notifier", "config": {"channel": "webhook"}},
    ),
    NodeDefinition(
        type="tool",
        label="JSON Parser",
        category="tools",
        description="Parse JSON: extract fields, filter arrays, flatten, convert to CSV",
        default_data={"tool_name": "json_parser", "config": {"operation": "extract"}},
    ),
    NodeDefinition(
        type="tool",
        label="Telegram Bot",
        category="tools",
        description="Telegram Bot API: send messages, documents, photos, get updates",
        default_data={"tool_name": "telegram_bot", "config": {"operation": "send_message"}},
    ),
    NodeDefinition(
        type="tool",
        label="WhatsApp",
        category="tools",
        description="WhatsApp Business API: send messages, templates, documents, images",
        default_data={"tool_name": "whatsapp", "config": {"operation": "send_message"}},
    ),
    NodeDefinition(
        type="tool",
        label="PyArchInit",
        category="tools",
        description="Query PyArchInit DB: US, inventario, ceramica, siti, strutture, tombe",
        default_data={"tool_name": "pyarchinit_tool", "config": {"operation": "query_us"}},
    ),
    NodeDefinition(
        type="tool",
        label="QGIS Project",
        category="tools",
        description="Parse QGIS projects (.qgs/.qgz): layers, info, plugins, styles",
        default_data={"tool_name": "qgis_project", "config": {"operation": "list_layers"}},
    ),
    # Advanced nodes
    NodeDefinition(
        type="meta_agent",
        label="Meta-Agent",
        category="agents",
        description="Execute a sub-workflow recursively (max 3 levels)",
        default_data={"workflowDefinition": None, "maxDepth": 3},
    ),
    NodeDefinition(
        type="chunker",
        label="Chunker",
        category="flow",
        description="Split long text into chunks, process each with an agent, then aggregate",
        default_data={"chunkSize": 2000, "overlap": 200, "model": "claude-sonnet-4-5-20250929", "systemPrompt": "Process this chunk:"},
    ),
    # Flow control
    NodeDefinition(
        type="condition",
        label="Condition",
        category="flow",
        description="Branch based on a condition",
        default_data={"condition": "", "true_label": "Yes", "false_label": "No"},
        outputs=2,
    ),
    NodeDefinition(
        type="loop",
        label="Loop",
        category="flow",
        description="Repeat until condition met",
        default_data={"max_iterations": 3, "stop_condition": "PASS"},
        outputs=2,
    ),
    NodeDefinition(
        type="aggregator",
        label="Aggregator",
        category="flow",
        description="Merge multiple inputs into one",
        default_data={"strategy": "concatenate"},
        inputs=4,
    ),
    # Timing & routing
    NodeDefinition(
        type="delay",
        label="Delay",
        category="flow",
        description="Pause workflow for N seconds (rate limiting, wait)",
        default_data={"delaySeconds": 1},
    ),
    NodeDefinition(
        type="switch",
        label="Switch",
        category="flow",
        description="Multi-way branching (N outputs based on keyword/regex match)",
        default_data={"switchType": "keyword"},
        outputs=4,
    ),
    NodeDefinition(
        type="validator",
        label="Validator",
        category="flow",
        description="AI-powered validation with pass/fail branching",
        default_data={"model": "claude-haiku-4-5-20251001", "validationPrompt": "", "strictness": 7, "includeContext": False},
        outputs=2,
    ),
    # I/O
    NodeDefinition(
        type="input",
        label="Input",
        category="io",
        description="Pipeline input (user query or data)",
        default_data={"label": "User Input"},
        inputs=0,
    ),
    NodeDefinition(
        type="output",
        label="Output",
        category="io",
        description="Pipeline output (final result)",
        default_data={"label": "Result"},
        outputs=0,
    ),
]


def get_registry() -> list[dict]:
    """Return serializable node registry."""
    return [
        {
            "type": n.type,
            "label": n.label,
            "category": n.category,
            "description": n.description,
            "default_data": n.default_data,
            "inputs": n.inputs,
            "outputs": n.outputs,
        }
        for n in NODE_REGISTRY
    ]
