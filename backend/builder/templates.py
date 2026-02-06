"""Predefined workflow templates."""

from __future__ import annotations

from models.workflow_models import WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType


def _node(id: str, ntype: NodeType, x: float, y: float, data: dict) -> WorkflowNode:
    return WorkflowNode(id=id, type=ntype, position={"x": x, "y": y}, data=data)


def _edge(source: str, target: str, label: str = "") -> WorkflowEdge:
    return WorkflowEdge(id=f"{source}-{target}", source=source, target=target, label=label)


# ── Template definitions ────────────────────────────────────


def research_assistant() -> dict:
    """Web search → Analysis → Synthesis → Report."""
    nodes = [
        _node("input", NodeType.INPUT, 0, 200, {"label": "Research Topic"}),
        _node("search", NodeType.TOOL, 250, 200, {"tool_name": "web_search", "label": "Web Search", "config": {"max_results": 10}}),
        _node("analyst", NodeType.AGENT, 500, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a research analyst. Analyze the provided search results and extract key findings, facts, and relevant data.", "label": "Analyst"}),
        _node("synthesizer", NodeType.AGENT, 750, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a synthesis expert. Combine the analysis into a coherent, well-structured report with key takeaways.", "label": "Synthesizer"}),
        _node("output", NodeType.OUTPUT, 1000, 200, {"label": "Research Report"}),
    ]
    edges = [_edge("input", "search"), _edge("search", "analyst"), _edge("analyst", "synthesizer"), _edge("synthesizer", "output")]
    return {
        "id": "template-research",
        "name": "Research Assistant",
        "description": "Web search → Analysis → Synthesis → Report",
        "category": "research",
        "definition": WorkflowDefinition(nodes=nodes, edges=edges).model_dump(),
    }


def code_review_pipeline() -> dict:
    """Code analysis → Bug detection → Suggestions → Refactor."""
    nodes = [
        _node("input", NodeType.INPUT, 0, 200, {"label": "Source Code"}),
        _node("analyzer", NodeType.AGENT, 250, 100, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a code analyst. Analyze the provided code for structure, patterns, and potential issues. Describe the architecture and code quality.", "label": "Code Analyzer"}),
        _node("bug_detector", NodeType.AGENT, 250, 300, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a bug detection specialist. Find potential bugs, security vulnerabilities, edge cases, and logical errors in the code.", "label": "Bug Detector"}),
        _node("aggregator", NodeType.AGGREGATOR, 500, 200, {"strategy": "concatenate", "label": "Merge Results"}),
        _node("refactor", NodeType.AGENT, 750, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "Based on the code analysis and bug report, provide a comprehensive code review with specific refactoring suggestions, improved code snippets, and prioritized action items.", "label": "Refactor Advisor"}),
        _node("output", NodeType.OUTPUT, 1000, 200, {"label": "Code Review Report"}),
    ]
    edges = [
        _edge("input", "analyzer"), _edge("input", "bug_detector"),
        _edge("analyzer", "aggregator"), _edge("bug_detector", "aggregator"),
        _edge("aggregator", "refactor"), _edge("refactor", "output"),
    ]
    return {
        "id": "template-code-review",
        "name": "Code Review Pipeline",
        "description": "Code analysis → Bug detection → Suggestions → Refactor",
        "category": "development",
        "definition": WorkflowDefinition(nodes=nodes, edges=edges).model_dump(),
    }


def document_analyzer() -> dict:
    """Upload PDF → Extraction → Summary → Q&A."""
    nodes = [
        _node("input", NodeType.INPUT, 0, 200, {"label": "Document Upload"}),
        _node("extractor", NodeType.TOOL, 250, 200, {"tool_name": "file_processor", "label": "Text Extractor", "config": {}}),
        _node("summarizer", NodeType.AGENT, 500, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a document summarizer. Create a comprehensive summary of the provided text, highlighting key points, main arguments, and important details.", "label": "Summarizer"}),
        _node("qa_agent", NodeType.AGENT, 750, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a Q&A assistant. Based on the document summary and content, answer user questions accurately with references to specific parts of the document.", "label": "Q&A Agent"}),
        _node("output", NodeType.OUTPUT, 1000, 200, {"label": "Analysis & Answers"}),
    ]
    edges = [_edge("input", "extractor"), _edge("extractor", "summarizer"), _edge("summarizer", "qa_agent"), _edge("qa_agent", "output")]
    return {
        "id": "template-doc-analyzer",
        "name": "Document Analyzer",
        "description": "Upload PDF → Extraction → Summary → Q&A",
        "category": "documents",
        "definition": WorkflowDefinition(nodes=nodes, edges=edges).model_dump(),
    }


def debate_mode() -> dict:
    """Two agents argue → Judge synthesizes verdict."""
    nodes = [
        _node("input", NodeType.INPUT, 0, 200, {"label": "Debate Topic"}),
        _node("advocate", NodeType.AGENT, 250, 100, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are an advocate. Argue strongly FOR the given topic. Provide well-reasoned arguments, evidence, and examples.", "label": "Advocate (FOR)"}),
        _node("critic", NodeType.AGENT, 250, 300, {"model": "gpt-4o", "system_prompt": "You are a critical thinker. Argue strongly AGAINST the given topic. Provide counter-arguments, potential risks, and alternative perspectives.", "label": "Critic (AGAINST)"}),
        _node("aggregator", NodeType.AGGREGATOR, 500, 200, {"strategy": "concatenate", "label": "Collect Arguments"}),
        _node("judge", NodeType.AGENT, 750, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are an impartial judge. Review both sides of the debate and provide a balanced synthesis, weighing the strengths of each argument. Deliver a clear verdict with reasoning.", "label": "Judge"}),
        _node("output", NodeType.OUTPUT, 1000, 200, {"label": "Verdict"}),
    ]
    edges = [
        _edge("input", "advocate"), _edge("input", "critic"),
        _edge("advocate", "aggregator"), _edge("critic", "aggregator"),
        _edge("aggregator", "judge"), _edge("judge", "output"),
    ]
    return {
        "id": "template-debate",
        "name": "Debate Mode",
        "description": "Two agents argue → Judge decides",
        "category": "analysis",
        "definition": WorkflowDefinition(nodes=nodes, edges=edges).model_dump(),
    }


def translation_pipeline() -> dict:
    """Translation → Review → Quality check."""
    nodes = [
        _node("input", NodeType.INPUT, 0, 200, {"label": "Text to Translate"}),
        _node("translator", NodeType.AGENT, 250, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a professional translator. Translate the given text accurately while preserving meaning, tone, and nuance. Provide the translation only.", "label": "Translator"}),
        _node("reviewer", NodeType.AGENT, 500, 200, {"model": "gpt-4o", "system_prompt": "You are a translation reviewer. Compare the translated text with the original. Identify any mistranslations, awkward phrasing, or loss of meaning. Provide corrections.", "label": "Reviewer"}),
        _node("quality", NodeType.AGENT, 750, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are a quality assurance expert for translations. Review the translation and its review. Produce the final polished translation and a quality score (1-10) with brief justification.", "label": "Quality Check"}),
        _node("output", NodeType.OUTPUT, 1000, 200, {"label": "Final Translation"}),
    ]
    edges = [_edge("input", "translator"), _edge("translator", "reviewer"), _edge("reviewer", "quality"), _edge("quality", "output")]
    return {
        "id": "template-translation",
        "name": "Translation Pipeline",
        "description": "Translation → Review → Quality check",
        "category": "language",
        "definition": WorkflowDefinition(nodes=nodes, edges=edges).model_dump(),
    }


def archaeological_analysis() -> dict:
    """Classification → Comparison → Report (PyArchInit)."""
    nodes = [
        _node("input", NodeType.INPUT, 0, 200, {"label": "Archaeological Data"}),
        _node("classifier", NodeType.AGENT, 250, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are an archaeological classifier. Analyze the provided data (artifact descriptions, stratigraphy, pottery types, etc.) and classify them according to standard typological systems.", "label": "Classifier"}),
        _node("comparator", NodeType.AGENT, 500, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are an archaeological comparator. Compare the classified data with known typologies and parallels from published literature. Identify cultural affiliations and chronological placement.", "label": "Comparator"}),
        _node("reporter", NodeType.AGENT, 750, 200, {"model": "claude-sonnet-4-5-20250929", "system_prompt": "You are an archaeological report writer. Compile a professional report including classification results, comparative analysis, chronological assessment, and conclusions suitable for publication or submission to a Soprintendenza.", "label": "Report Writer"}),
        _node("output", NodeType.OUTPUT, 1000, 200, {"label": "Archaeological Report"}),
    ]
    edges = [_edge("input", "classifier"), _edge("classifier", "comparator"), _edge("comparator", "reporter"), _edge("reporter", "output")]
    return {
        "id": "template-archaeology",
        "name": "Archaeological Analysis",
        "description": "Classification → Comparison → Report",
        "category": "research",
        "definition": WorkflowDefinition(nodes=nodes, edges=edges).model_dump(),
    }


# ── Public API ──────────────────────────────────────────────

TEMPLATES = [
    research_assistant,
    code_review_pipeline,
    document_analyzer,
    debate_mode,
    translation_pipeline,
    archaeological_analysis,
]


def get_all_templates() -> list[dict]:
    """Return all predefined workflow templates."""
    return [t() for t in TEMPLATES]


def get_template_by_id(template_id: str) -> dict | None:
    """Return a single template by ID."""
    for t in TEMPLATES:
        tpl = t()
        if tpl["id"] == template_id:
            return tpl
    return None
