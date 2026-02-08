"""Chat API endpoints with SSE streaming support."""

from __future__ import annotations

import json
import time
import uuid

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pathlib import Path

from models.chat_models import ChatRequest, ConversationOut, MessageOut
from orchestrator.router import create_agent
from storage.database import get_db, async_session, ConversationRow, MessageRow, FileRow
from storage.vector_store import vector_store
from storage.file_store import extract_text
from api.analytics import log_usage

router = APIRouter(tags=["chat"])

WORKFLOW_SYSTEM_ADDON = """

You are also a workflow builder assistant for the Gennaro AI platform.
If the user asks you to create a workflow, pipeline, or builder, generate a valid JSON workflow definition.
Wrap it in a ```workflow code block. The JSON must have "nodes" and "edges" arrays.

Available node types:
- input: entry point (data: label, inputType, defaultValue)
- output: final result (data: label, outputFormat)
- agent: AI model call (data: label, model, systemPrompt, temperature, maxTokens)
- tool: external tool (data: label, tool, operation, ...)
- condition: if/else branching (data: label, conditionType, conditionValue). Connect edges with label "true"/"false"
- loop: repeat until condition (data: label, maxIterations, exitConditionType, exitValue)
- aggregator: merge parallel branches (data: label, strategy)
- meta_agent: execute a sub-workflow recursively (data: label, maxDepth, workflowDefinition: {nodes, edges})
- chunker: split long text into chunks, process each with an agent (data: label, model, systemPrompt, chunkSize, overlap)
- validator: AI-powered quality gate with pass/fail branching (data: label, model, validationPrompt, strictness 1-10, includeContext). Connect edges with label "pass"/"fail"

Available tools (22 total): web_search, code_executor, file_processor, database_tool, image_tool, ml_pipeline, website_generator, gis_tool, file_search, email_search, project_analyzer, email_sender, web_scraper, file_manager, http_request, text_transformer, notifier, json_parser, telegram_bot, whatsapp, pyarchinit_tool, qgis_project.
- web_search: search the web (returns text results, max_results configurable)
- code_executor: execute code in sandbox (language: python|javascript|bash, timeout, codeTemplate with {input})
- file_processor: parse and extract text from documents (operation: read|extract)
- database_tool: execute SQL/NoSQL queries (dbType: sqlite|postgresql|mysql|mongodb, connectionString, queryTemplate with {input})
- image_tool: analyze images using vision models (operation: analyze|describe|ocr)
- ml_pipeline: train/predict/evaluate ML models (operation: train|predict|evaluate|list_models, modelType, targetColumn, modelName)
- website_generator: generate HTML/CSS/JS as ZIP
- gis_tool: geospatial analysis (operation: info|vector_analysis|raster_analysis|dem_analysis|buffer|map|reproject|overlay)
- file_search: search files (source: local|dropbox|gdrive|onedrive, max_results, roots for local)
- email_search: search emails (source: gmail|outlook|imap, max_results, imap_server/port/username/password for imap)
- project_analyzer: analyze a software project directory structure, dependencies, key files (max_depth, max_files_read)
- email_sender: send email (emailSource: smtp|gmail|outlook, emailTo, emailSubject, smtpHost/smtpPort/smtpUsername/smtpPassword for smtp)
- web_scraper: scrape web pages (operation: extract_text|extract_links|extract_tables|extract_structured, cssSelector for extract_structured, timeout)
- file_manager: manage local files (operation: list|create_folder|write_file|read_file|copy|move|delete|info, baseDir for sandbox, destination for copy/move/write, confirm: true for delete)
- http_request: call REST APIs (method: GET|POST|PUT|DELETE|PATCH, urlTemplate with {input}, headers JSON, body JSON, authType: none|bearer|basic, authToken, timeout)
- text_transformer: transform text without AI (operation: regex_replace|regex_extract|split|join|template|upper|lower|trim|truncate|count|remove_html|sort_lines|unique_lines|number_lines, pattern, replacement, separator, template with {input})
- notifier: send notifications (channel: webhook|slack|discord|telegram, webhookUrl, botToken+chatId for telegram, method, headers)
- json_parser: parse JSON data (operation: extract|keys|filter|flatten|to_csv|validate|pretty|minify|count, path dot-notation for extract, filterField+filterValue for filter)
- telegram_bot: Telegram Bot API (operation: send_message|send_document|send_photo|get_updates|get_chat_info, botToken, chatId, parseMode: Markdown|HTML|plain)
- whatsapp: WhatsApp Business API (operation: send_message|send_template|send_document|send_image, recipient with country prefix, templateName for send_template, waToken, phoneNumberId)
- pyarchinit_tool: query PyArchInit archaeological DB (operation: query_us|query_inventory|query_pottery|query_sites|query_structures|query_tombs|query_samples|custom_query|list_tables|export_csv, dbPath, dbType: sqlite|postgresql, sito/area/us filters)
- qgis_project: parse QGIS project files without QGIS (operation: list_layers|project_info|list_plugins|read_style, projectPath to .qgs/.qgz file)

Available node types (additional to agent and tool):
- delay: pause N seconds (data: delaySeconds)
- switch: multi-way branching based on keyword/regex/score match (data: switchType, edge labels = case values + "default")
- condition: if/else branching (data: conditionType, conditionValue)
- loop: repeat until condition (data: maxIterations, exitConditionType, exitValue)
- aggregator: merge parallel branches (data: strategy: concatenate|summarize|custom)
- meta_agent: sub-workflow recursion (data: maxDepth, workflowDefinition)
- chunker: split text into chunks for processing (data: chunkSize, overlap, model, systemPrompt)
- validator: AI quality gate (data: model, validationPrompt, strictness 1-10, includeContext). Edges: "pass"/"fail"

Robustness features (add to any node's data):
- retryCount: number of retries on failure (default 0)
- retryDelay: seconds between retries (default 2, exponential backoff)
- onError: "stop"|"skip"|"fallback" (default "stop")
- fallbackValue: value to use when onError="fallback"
- fallbackModel: backup AI model for agent nodes (e.g. "gpt-4o" as fallback for Claude)
- setVariable: save node output to a named variable (accessible as {var:name} in other nodes)

Available models: claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001, claude-opus-4-6, gpt-4o, gpt-4o-mini.

Example simple workflow:
```workflow
{
  "nodes": [
    {"id": "node_1", "type": "input", "position": {"x": 300, "y": 30}, "data": {"label": "Input", "inputType": "text", "defaultValue": "..."}},
    {"id": "node_2", "type": "agent", "position": {"x": 300, "y": 180}, "data": {"label": "Agent", "model": "claude-sonnet-4-5-20250929", "systemPrompt": "...", "temperature": 0.7, "maxTokens": 4096}},
    {"id": "node_3", "type": "output", "position": {"x": 300, "y": 330}, "data": {"label": "Output", "outputFormat": "markdown"}}
  ],
  "edges": [
    {"id": "e1-2", "source": "node_1", "target": "node_2"},
    {"id": "e2-3", "source": "node_2", "target": "node_3"}
  ]
}
```

Example with meta_agent (sub-workflow):
```workflow
{
  "nodes": [
    {"id": "node_1", "type": "input", "position": {"x": 300, "y": 30}, "data": {"label": "Task", "inputType": "text", "defaultValue": "..."}},
    {"id": "node_2", "type": "meta_agent", "position": {"x": 300, "y": 200}, "data": {"label": "Sub-Workflow", "maxDepth": 2, "workflowDefinition": {"nodes": [{"id": "sub_1", "type": "input", "position": {"x": 250, "y": 30}, "data": {"label": "Sub Input"}}, {"id": "sub_2", "type": "agent", "position": {"x": 250, "y": 180}, "data": {"label": "Worker", "model": "claude-haiku-4-5-20251001", "systemPrompt": "...", "temperature": 0.5, "maxTokens": 2048}}, {"id": "sub_3", "type": "output", "position": {"x": 250, "y": 330}, "data": {"label": "Sub Output"}}], "edges": [{"id": "se1-2", "source": "sub_1", "target": "sub_2"}, {"id": "se2-3", "source": "sub_2", "target": "sub_3"}]}}},
    {"id": "node_3", "type": "output", "position": {"x": 300, "y": 380}, "data": {"label": "Output", "outputFormat": "markdown"}}
  ],
  "edges": [
    {"id": "e1-2", "source": "node_1", "target": "node_2"},
    {"id": "e2-3", "source": "node_2", "target": "node_3"}
  ]
}
```

Example with chunker:
```workflow
{
  "nodes": [
    {"id": "node_1", "type": "input", "position": {"x": 300, "y": 30}, "data": {"label": "Long Text", "inputType": "text"}},
    {"id": "node_2", "type": "chunker", "position": {"x": 300, "y": 200}, "data": {"label": "Chunker", "model": "claude-haiku-4-5-20251001", "systemPrompt": "Riassumi questo chunk:", "chunkSize": 2000, "overlap": 200}},
    {"id": "node_3", "type": "agent", "position": {"x": 300, "y": 380}, "data": {"label": "Sintetizzatore", "model": "claude-sonnet-4-5-20250929", "systemPrompt": "Crea una sintesi finale dai riassunti dei chunk:", "temperature": 0.5, "maxTokens": 4096}},
    {"id": "node_4", "type": "output", "position": {"x": 300, "y": 530}, "data": {"label": "Sintesi", "outputFormat": "markdown"}}
  ],
  "edges": [
    {"id": "e1-2", "source": "node_1", "target": "node_2"},
    {"id": "e2-3", "source": "node_2", "target": "node_3"},
    {"id": "e3-4", "source": "node_3", "target": "node_4"}
  ]
}
```

Example with validator (quality gate):
```workflow
{
  "nodes": [
    {"id": "node_1", "type": "input", "position": {"x": 300, "y": 30}, "data": {"label": "Tema", "inputType": "text", "defaultValue": "Scrivi un articolo sull'AI"}},
    {"id": "node_2", "type": "agent", "position": {"x": 300, "y": 180}, "data": {"label": "Scrittore", "model": "claude-sonnet-4-5-20250929", "systemPrompt": "Scrivi un articolo professionale sull'argomento.", "temperature": 0.7, "maxTokens": 4096}},
    {"id": "node_3", "type": "validator", "position": {"x": 300, "y": 360}, "data": {"label": "Quality Gate", "model": "claude-haiku-4-5-20251001", "validationPrompt": "Verifica: almeno 200 parole, ben strutturato, in italiano corretto", "strictness": 7, "includeContext": false}},
    {"id": "node_4", "type": "output", "position": {"x": 100, "y": 540}, "data": {"label": "Approvato", "outputFormat": "markdown"}},
    {"id": "node_5", "type": "agent", "position": {"x": 500, "y": 540}, "data": {"label": "Correttore", "model": "claude-sonnet-4-5-20250929", "systemPrompt": "Riscrivi l'articolo correggendo i problemi segnalati nel feedback di validazione.", "temperature": 0.5, "maxTokens": 4096}},
    {"id": "node_6", "type": "output", "position": {"x": 500, "y": 700}, "data": {"label": "Corretto", "outputFormat": "markdown"}}
  ],
  "edges": [
    {"id": "e1-2", "source": "node_1", "target": "node_2"},
    {"id": "e2-3", "source": "node_2", "target": "node_3"},
    {"id": "e3-4", "source": "node_3", "target": "node_4", "label": "pass"},
    {"id": "e3-5", "source": "node_3", "target": "node_5", "label": "fail"},
    {"id": "e5-6", "source": "node_5", "target": "node_6"}
  ]
}
```

When the user attaches files, their details (path, type, content/tables) are appended to the message.
Use the file paths in workflow nodes:
- For databases (.sqlite, .db, .gpkg): use database_tool with connectionString pointing to the file path, or gis_tool for spatial data
- For geospatial files (.shp, .geojson, .kml, .gpkg): use gis_tool with the file path as input
- For images: use image_tool with the file path
- For text/documents: use file_processor or pass content directly to agents
- Always use the FULL path as provided in the file details.
"""


async def _resolve_file_content(file_ids: list[str], db: AsyncSession) -> str:
    """Fetch file metadata + extract text for attached files."""
    if not file_ids:
        return ""
    parts: list[str] = []
    for fid in file_ids:
        row = await db.get(FileRow, fid)
        if not row:
            continue
        p = Path(row.path)
        suffix = p.suffix.lower()
        info = f"[{row.filename}] (type={row.content_type}, size={row.size})"

        # For databases / geo files, describe but don't inline full content
        if suffix in (".sqlite", ".db", ".sqlite3", ".gpkg"):
            info += f"\nPath: {row.path}"
            info += "\nThis is a database file. Use database_tool or gis_tool in the workflow to query it."
            # Try to list tables
            try:
                import sqlite3
                conn = sqlite3.connect(row.path)
                tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
                conn.close()
                info += f"\nTables: {', '.join(tables[:30])}"
            except Exception:
                pass
        elif suffix in (".shp", ".geojson", ".kml", ".gml", ".gpx"):
            info += f"\nPath: {row.path}"
            info += "\nThis is a geospatial file. Use gis_tool in the workflow to analyze it."
        elif suffix in (".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"):
            info += f"\nPath: {row.path}"
            info += "\nThis is an image file. Use image_tool in the workflow to process it."
        elif suffix in (".mp4", ".mov", ".avi", ".mkv", ".webm"):
            info += f"\nPath: {row.path}"
            info += "\nThis is a video file."
        elif suffix in (".obj", ".stl", ".ply", ".glb", ".gltf"):
            info += f"\nPath: {row.path}"
            info += "\nThis is a 3D model file."
        else:
            # Text-extractable files
            text = extract_text(row.path)
            if text:
                # Truncate to avoid overwhelming the LLM
                if len(text) > 8000:
                    text = text[:8000] + "\n... [truncated]"
                info += f"\nContent:\n{text}"
            else:
                info += f"\nPath: {row.path}"
                info += "\n(Could not extract text content)"

        parts.append(info)
    return "\n\n---\n\n".join(parts)


def _apply_rag(req: ChatRequest, messages: list[dict[str, str]]) -> tuple[list[dict[str, str]], list]:
    """If RAG is enabled, enhance the last user message with document context."""
    citations: list = []
    if not req.use_rag or not messages:
        return messages, citations

    last_user = next((m for m in reversed(messages) if m["role"] == "user"), None)
    if not last_user:
        return messages, citations

    enhanced, citations = vector_store.build_rag_prompt(
        last_user["content"],
        project_id=req.project_id,
    )
    # Replace last user message with RAG-enhanced version
    result = []
    replaced = False
    for m in reversed(messages):
        if m["role"] == "user" and not replaced:
            result.append({"role": "user", "content": enhanced})
            replaced = True
        else:
            result.append(m)
    result.reverse()
    return result, citations


@router.post("/chat")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Non-streaming chat — returns full response."""
    base_prompt = (req.system_prompt or "You are a helpful assistant.") + WORKFLOW_SYSTEM_ADDON
    agent = create_agent(
        req.model,
        system_prompt=base_prompt,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
    )
    # Build messages, resolving file attachments
    messages: list[dict[str, str]] = []
    for m in req.messages:
        content = m.content
        if m.files:
            file_context = await _resolve_file_content(m.files, db)
            if file_context:
                content += f"\n\n=== ATTACHED FILE DETAILS ===\n{file_context}"
        messages.append({"role": m.role.value, "content": content})

    messages, citations = _apply_rag(req, messages)
    t0 = time.monotonic()
    resp = await agent.chat(messages, stream=False)
    duration_ms = int((time.monotonic() - t0) * 1000)

    # Log usage for analytics
    await log_usage(
        db,
        model=req.model,
        provider=resp.provider.value,
        input_tokens=resp.usage.get("input_tokens", 0),
        output_tokens=resp.usage.get("output_tokens", 0),
        duration_ms=duration_ms,
        project_id=req.project_id,
        source="chat",
    )

    # Persist conversation
    conv_id = str(uuid.uuid4())
    conv = ConversationRow(
        id=conv_id,
        project_id=req.project_id,
        title=req.messages[0].content[:80] if req.messages else "New chat",
        model=req.model,
    )
    db.add(conv)

    for m in req.messages:
        db.add(MessageRow(
            id=str(uuid.uuid4()),
            conversation_id=conv_id,
            role=m.role.value,
            content=m.content,
        ))
    db.add(MessageRow(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="assistant",
        content=resp.content,
        model=req.model,
    ))
    await db.commit()

    result = {
        "content": resp.content,
        "model": resp.model,
        "usage": resp.usage,
        "conversation_id": conv_id,
    }
    if citations:
        result["citations"] = citations
    return result


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """SSE streaming chat endpoint."""
    base_prompt = (req.system_prompt or "You are a helpful assistant.") + WORKFLOW_SYSTEM_ADDON
    agent = create_agent(
        req.model,
        system_prompt=base_prompt,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
    )

    # Build messages, resolving file attachments
    messages: list[dict[str, str]] = []
    for m in req.messages:
        content = m.content
        if m.files:
            file_context = await _resolve_file_content(m.files, db)
            if file_context:
                content += f"\n\n=== ATTACHED FILE DETAILS ===\n{file_context}"
        messages.append({"role": m.role.value, "content": content})

    messages, citations = _apply_rag(req, messages)

    async def event_generator():
        t0 = time.monotonic()
        try:
            if citations:
                yield {"data": json.dumps({"type": "citations", "citations": citations})}
            gen = await agent.chat(messages, stream=True)
            async for chunk in gen:
                yield {"data": json.dumps({"type": "content", "content": chunk})}
            yield {"data": json.dumps({"type": "done"})}
        except Exception as e:
            yield {"data": json.dumps({"type": "error", "content": str(e)})}
        finally:
            duration_ms = int((time.monotonic() - t0) * 1000)
            try:
                async with async_session() as session:
                    await log_usage(
                        session,
                        model=req.model,
                        provider=agent.provider.value,
                        duration_ms=duration_ms,
                        source="chat",
                    )
            except Exception:
                pass  # Don't fail the stream for analytics

    return EventSourceResponse(event_generator())


@router.get("/chat/history/{project_id}")
async def chat_history(project_id: str, db: AsyncSession = Depends(get_db)):
    """Return conversations for a project."""
    result = await db.execute(
        select(ConversationRow)
        .where(ConversationRow.project_id == project_id)
        .order_by(ConversationRow.updated_at.desc())
    )
    convs = result.scalars().all()
    return [
        ConversationOut(
            id=c.id,
            project_id=c.project_id,
            title=c.title,
            model=c.model,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat() if c.updated_at else c.created_at.isoformat(),
        )
        for c in convs
    ]


@router.get("/chat/{conversation_id}/messages")
async def conversation_messages(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """Return messages for a conversation."""
    result = await db.execute(
        select(MessageRow)
        .where(MessageRow.conversation_id == conversation_id)
        .order_by(MessageRow.created_at)
    )
    msgs = result.scalars().all()
    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            model=m.model,
            created_at=m.created_at.isoformat(),
        )
        for m in msgs
    ]
