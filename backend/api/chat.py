"""Chat API endpoints with SSE streaming support."""

from __future__ import annotations

import json
import time
import uuid

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.chat_models import ChatRequest, ConversationOut, MessageOut
from orchestrator.router import create_agent
from storage.database import get_db, async_session, ConversationRow, MessageRow
from storage.vector_store import vector_store
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

Available tools: web_search, code_executor, file_processor, database_tool, image_tool, ml_pipeline, website_generator, gis_tool.
- ml_pipeline: train/predict/evaluate ML models (operation: train|predict|evaluate|list_models, modelType, targetColumn, modelName)
- website_generator: generate HTML/CSS/JS as ZIP
- gis_tool: geospatial analysis (operation: info|vector_analysis|raster_analysis|dem_analysis|buffer|map|reproject|overlay)

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
```"""


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
    messages = [{"role": m.role.value, "content": m.content} for m in req.messages]
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
async def chat_stream(req: ChatRequest):
    """SSE streaming chat endpoint."""
    base_prompt = (req.system_prompt or "You are a helpful assistant.") + WORKFLOW_SYSTEM_ADDON
    agent = create_agent(
        req.model,
        system_prompt=base_prompt,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
    )
    messages = [{"role": m.role.value, "content": m.content} for m in req.messages]
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
