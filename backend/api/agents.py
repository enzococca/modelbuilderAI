"""Agent management API endpoints."""

from __future__ import annotations

import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.agent_models import AgentConfig, AgentOut, AVAILABLE_MODELS
from storage.database import get_db, AgentRow

router = APIRouter(tags=["agents"])


@router.get("/agents")
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentRow).order_by(AgentRow.created_at))
    rows = result.scalars().all()
    return [
        AgentOut(
            id=r.id, name=r.name, model=r.model,
            system_prompt=r.system_prompt, temperature=r.temperature,
            max_tokens=r.max_tokens, tools=r.tools or [],
        )
        for r in rows
    ]


@router.post("/agents", status_code=201)
async def create_agent(cfg: AgentConfig, db: AsyncSession = Depends(get_db)):
    row = AgentRow(
        id=str(uuid.uuid4()),
        name=cfg.name,
        model=cfg.model,
        system_prompt=cfg.system_prompt,
        temperature=cfg.temperature,
        max_tokens=cfg.max_tokens,
        tools=cfg.tools,
    )
    db.add(row)
    await db.commit()
    return AgentOut(
        id=row.id, name=row.name, model=row.model,
        system_prompt=row.system_prompt, temperature=row.temperature,
        max_tokens=row.max_tokens, tools=row.tools or [],
    )


@router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, cfg: AgentConfig, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentRow).where(AgentRow.id == agent_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Agent not found")
    row.name = cfg.name
    row.model = cfg.model
    row.system_prompt = cfg.system_prompt
    row.temperature = cfg.temperature
    row.max_tokens = cfg.max_tokens
    row.tools = cfg.tools
    await db.commit()
    return AgentOut(
        id=row.id, name=row.name, model=row.model,
        system_prompt=row.system_prompt, temperature=row.temperature,
        max_tokens=row.max_tokens, tools=row.tools or [],
    )


@router.delete("/agents/{agent_id}", status_code=204)
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentRow).where(AgentRow.id == agent_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Agent not found")
    await db.delete(row)
    await db.commit()


@router.get("/agents/models")
async def list_models():
    """Return all known model definitions grouped by provider."""
    by_provider: dict[str, list] = {}
    for m in AVAILABLE_MODELS:
        by_provider.setdefault(m.provider.value, []).append(m.model_dump())
    return by_provider


@router.get("/agents/local-models")
async def local_models():
    """Discover models from Ollama and LM Studio."""
    models: list[dict] = []

    # Ollama: GET /api/tags
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                for m in data.get("models", []):
                    name = m.get("name", "")
                    models.append({
                        "id": name,
                        "name": name,
                        "provider": "ollama",
                        "context_window": 8192,
                        "supports_streaming": True,
                        "supports_tools": False,
                        "supports_vision": False,
                    })
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    # LM Studio: GET /v1/models (OpenAI-compatible)
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.lmstudio_base_url}/v1/models")
            if resp.status_code == 200:
                data = resp.json()
                for m in data.get("data", []):
                    mid = m.get("id", "")
                    models.append({
                        "id": f"lmstudio:{mid}",
                        "name": mid,
                        "provider": "lmstudio",
                        "context_window": 8192,
                        "supports_streaming": True,
                        "supports_tools": False,
                        "supports_vision": False,
                    })
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    return models


@router.get("/agents/tools")
async def available_tools():
    """Return all available agent tools."""
    from tools import list_tools
    return list_tools()
