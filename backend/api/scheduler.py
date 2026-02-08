"""Scheduler API — CRUD for scheduled workflow jobs."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from storage.database import get_db, ScheduledJobRow

router = APIRouter(tags=["scheduler"])


class ScheduledJobCreate(BaseModel):
    workflow_id: str
    cron_expr: str = ""
    interval_seconds: int = 0
    input_text: str = ""
    enabled: bool = True


class ScheduledJobOut(BaseModel):
    id: str
    workflow_id: str
    cron_expr: str
    interval_seconds: int
    enabled: bool
    input_text: str
    last_run: str | None
    created_at: str


@router.get("/scheduler/jobs")
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduledJobRow).order_by(ScheduledJobRow.created_at.desc()))
    rows = result.scalars().all()
    return [
        ScheduledJobOut(
            id=r.id,
            workflow_id=r.workflow_id,
            cron_expr=r.cron_expr or "",
            interval_seconds=r.interval_seconds or 0,
            enabled=r.enabled,
            input_text=r.input_text or "",
            last_run=r.last_run.isoformat() if r.last_run else None,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/scheduler/jobs", status_code=201)
async def create_job(body: ScheduledJobCreate, db: AsyncSession = Depends(get_db)):
    if not body.cron_expr and not body.interval_seconds:
        raise HTTPException(400, "Either cron_expr or interval_seconds is required")

    row = ScheduledJobRow(
        id=str(uuid.uuid4()),
        workflow_id=body.workflow_id,
        cron_expr=body.cron_expr,
        interval_seconds=body.interval_seconds,
        enabled=body.enabled,
        input_text=body.input_text,
    )
    db.add(row)
    await db.commit()
    return ScheduledJobOut(
        id=row.id,
        workflow_id=row.workflow_id,
        cron_expr=row.cron_expr or "",
        interval_seconds=row.interval_seconds or 0,
        enabled=row.enabled,
        input_text=row.input_text or "",
        last_run=None,
        created_at=row.created_at.isoformat(),
    )


@router.put("/scheduler/jobs/{job_id}")
async def update_job(job_id: str, body: ScheduledJobCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduledJobRow).where(ScheduledJobRow.id == job_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Job not found")

    row.workflow_id = body.workflow_id
    row.cron_expr = body.cron_expr
    row.interval_seconds = body.interval_seconds
    row.enabled = body.enabled
    row.input_text = body.input_text
    await db.commit()
    return {"status": "updated", "id": job_id}


@router.delete("/scheduler/jobs/{job_id}")
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduledJobRow).where(ScheduledJobRow.id == job_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Job not found")
    await db.delete(row)
    await db.commit()
    return {"status": "deleted", "id": job_id}
