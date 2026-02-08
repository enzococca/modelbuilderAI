"""Scheduler service — run workflows on a recurring schedule."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

logger = logging.getLogger("gennaro.scheduler")


def _parse_cron_field(field: str, min_val: int, max_val: int) -> set[int]:
    """Parse a single cron field (e.g. '*/5', '1,3,5', '1-5', '*')."""
    values: set[int] = set()
    for part in field.split(","):
        part = part.strip()
        if part == "*":
            values.update(range(min_val, max_val + 1))
        elif part.startswith("*/"):
            step = int(part[2:])
            values.update(range(min_val, max_val + 1, step))
        elif "-" in part:
            start, end = part.split("-", 1)
            values.update(range(int(start), int(end) + 1))
        else:
            values.add(int(part))
    return values


def cron_matches(cron_expr: str, dt: datetime) -> bool:
    """Check if a datetime matches a cron expression (min hour dom month dow)."""
    parts = cron_expr.strip().split()
    if len(parts) != 5:
        return False
    try:
        minutes = _parse_cron_field(parts[0], 0, 59)
        hours = _parse_cron_field(parts[1], 0, 23)
        days = _parse_cron_field(parts[2], 1, 31)
        months = _parse_cron_field(parts[3], 1, 12)
        weekdays = _parse_cron_field(parts[4], 0, 6)
        return (
            dt.minute in minutes
            and dt.hour in hours
            and dt.day in days
            and dt.month in months
            and dt.weekday() in weekdays
        )
    except (ValueError, IndexError):
        return False


class SchedulerService:
    """Background service that checks scheduled jobs every 60 seconds."""

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        """Start the scheduler background loop."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Scheduler started")

    async def stop(self) -> None:
        """Stop the scheduler."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Scheduler stopped")

    async def _loop(self) -> None:
        """Main loop — check and run due jobs every 60 seconds."""
        while self._running:
            try:
                await self._check_jobs()
            except Exception as e:
                logger.error("Scheduler error: %s", e)
            await asyncio.sleep(60)

    async def _check_jobs(self) -> None:
        """Check all enabled jobs and run any that are due."""
        try:
            from storage.database import async_session, ScheduledJobRow
            from sqlalchemy import select
        except ImportError:
            return

        now = datetime.now(timezone.utc)

        async with async_session() as session:
            result = await session.execute(
                select(ScheduledJobRow).where(ScheduledJobRow.enabled == True)  # noqa: E712
            )
            jobs = result.scalars().all()

            for job in jobs:
                should_run = False

                if job.interval_seconds and job.interval_seconds > 0:
                    # Interval-based scheduling
                    if job.last_run is None:
                        should_run = True
                    else:
                        next_run = job.last_run + timedelta(seconds=job.interval_seconds)
                        should_run = now >= next_run
                elif job.cron_expr:
                    # Cron-based scheduling
                    should_run = cron_matches(job.cron_expr, now)
                    # Avoid running same minute twice
                    if should_run and job.last_run:
                        if (now - job.last_run).total_seconds() < 60:
                            should_run = False

                if should_run:
                    logger.info("Running scheduled job %s (workflow %s)", job.id, job.workflow_id)
                    job.last_run = now
                    await session.commit()
                    # Fire and forget — don't block the scheduler loop
                    asyncio.create_task(self._run_workflow(job.workflow_id, job.input_text or ""))

    async def _run_workflow(self, workflow_id: str, input_text: str) -> None:
        """Execute a workflow by ID."""
        try:
            from storage.database import async_session, WorkflowRow
            from sqlalchemy import select
            from models.workflow_models import WorkflowDefinition
            from builder.workflow_engine import WorkflowEngine
            from websocket.handlers import manager

            async with async_session() as session:
                result = await session.execute(
                    select(WorkflowRow).where(WorkflowRow.id == workflow_id)
                )
                row = result.scalar_one_or_none()
                if not row or not row.definition:
                    logger.error("Scheduled workflow %s not found", workflow_id)
                    return

                definition = WorkflowDefinition(**row.definition)
                engine = WorkflowEngine(
                    definition,
                    workflow_id=workflow_id,
                    broadcast=manager.broadcast,
                )
                await engine.run(initial_input=input_text, timeout=300)
                logger.info("Scheduled workflow %s completed", workflow_id)

        except Exception as e:
            logger.error("Scheduled workflow %s failed: %s", workflow_id, e)


# Singleton
scheduler = SchedulerService()
