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
