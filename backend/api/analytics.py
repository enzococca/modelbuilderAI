"""Analytics API — token usage, costs, and performance metrics."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from storage.database import get_db, UsageRow, ConversationRow, WorkflowRow

router = APIRouter(tags=["analytics"])

# Approximate cost per 1M tokens (input/output)
COST_TABLE = {
    "claude-opus-4-6": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.0},
    "gpt-4o": {"input": 2.50, "output": 10.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "o1": {"input": 15.0, "output": 60.0},
    "o3-mini": {"input": 1.10, "output": 4.40},
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Estimate cost in USD for a given model and token counts."""
    # Unknown models (local/Ollama) default to zero cost
    rates = COST_TABLE.get(model, {"input": 0.0, "output": 0.0})
    cost = (input_tokens / 1_000_000) * rates["input"] + (output_tokens / 1_000_000) * rates["output"]
    return round(cost, 6)


async def log_usage(
    db: AsyncSession,
    *,
    model: str,
    provider: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    duration_ms: int = 0,
    project_id: str | None = None,
    source: str = "chat",
) -> None:
    """Record a usage event."""
    total = input_tokens + output_tokens
    cost = estimate_cost(model, input_tokens, output_tokens)
    row = UsageRow(
        model=model,
        provider=provider,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total,
        estimated_cost=cost,
        duration_ms=duration_ms,
        project_id=project_id,
        source=source,
    )
    db.add(row)
    await db.commit()


@router.get("/analytics/summary")
async def usage_summary(
    days: int = Query(30, ge=1, le=365),
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated usage stats for the given time range."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    q = select(
        UsageRow.model,
        UsageRow.provider,
        func.count(UsageRow.id).label("requests"),
        func.sum(UsageRow.input_tokens).label("input_tokens"),
        func.sum(UsageRow.output_tokens).label("output_tokens"),
        func.sum(UsageRow.total_tokens).label("total_tokens"),
        func.sum(UsageRow.estimated_cost).label("total_cost"),
        func.avg(UsageRow.duration_ms).label("avg_duration_ms"),
    ).where(UsageRow.created_at >= since).group_by(UsageRow.model, UsageRow.provider)

    if project_id:
        q = q.where(UsageRow.project_id == project_id)

    result = await db.execute(q)
    rows = result.all()

    models = []
    total_cost = 0.0
    total_tokens = 0
    total_requests = 0

    for row in rows:
        cost = float(row.total_cost or 0)
        tokens = int(row.total_tokens or 0)
        reqs = int(row.requests or 0)
        total_cost += cost
        total_tokens += tokens
        total_requests += reqs
        models.append({
            "model": row.model,
            "provider": row.provider,
            "requests": reqs,
            "input_tokens": int(row.input_tokens or 0),
            "output_tokens": int(row.output_tokens or 0),
            "total_tokens": tokens,
            "total_cost": round(cost, 4),
            "avg_duration_ms": round(float(row.avg_duration_ms or 0), 1),
        })

    return {
        "period_days": days,
        "total_requests": total_requests,
        "total_tokens": total_tokens,
        "total_cost": round(total_cost, 4),
        "by_model": models,
    }


@router.get("/analytics/daily")
async def daily_usage(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Return daily usage breakdown."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    q = select(
        func.date(UsageRow.created_at).label("day"),
        func.count(UsageRow.id).label("requests"),
        func.sum(UsageRow.total_tokens).label("total_tokens"),
        func.sum(UsageRow.estimated_cost).label("total_cost"),
    ).where(UsageRow.created_at >= since).group_by(func.date(UsageRow.created_at)).order_by(func.date(UsageRow.created_at))

    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "date": str(row.day),
            "requests": int(row.requests or 0),
            "total_tokens": int(row.total_tokens or 0),
            "total_cost": round(float(row.total_cost or 0), 4),
        }
        for row in rows
    ]


@router.get("/analytics/cost-rates")
async def cost_rates():
    """Return the cost table for all models."""
    return COST_TABLE
