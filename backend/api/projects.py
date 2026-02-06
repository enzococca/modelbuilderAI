"""Project CRUD API endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.project_models import ProjectCreate, ProjectOut
from storage.database import get_db, ProjectRow

router = APIRouter(tags=["projects"])


@router.get("/projects")
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectRow).order_by(ProjectRow.updated_at.desc()))
    rows = result.scalars().all()
    return [
        ProjectOut(
            id=r.id, name=r.name, description=r.description,
            created_at=r.created_at.isoformat(),
            updated_at=r.updated_at.isoformat() if r.updated_at else r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/projects", status_code=201)
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    row = ProjectRow(id=str(uuid.uuid4()), name=body.name, description=body.description)
    db.add(row)
    await db.commit()
    return ProjectOut(
        id=row.id, name=row.name, description=row.description,
        created_at=row.created_at.isoformat(),
        updated_at=row.created_at.isoformat(),
    )


@router.get("/projects/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectRow).where(ProjectRow.id == project_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Project not found")
    return ProjectOut(
        id=row.id, name=row.name, description=row.description,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat() if row.updated_at else row.created_at.isoformat(),
    )


@router.put("/projects/{project_id}")
async def update_project(project_id: str, body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectRow).where(ProjectRow.id == project_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Project not found")
    row.name = body.name
    row.description = body.description
    await db.commit()
    return ProjectOut(
        id=row.id, name=row.name, description=row.description,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat() if row.updated_at else row.created_at.isoformat(),
    )


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProjectRow).where(ProjectRow.id == project_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Project not found")
    await db.delete(row)
    await db.commit()
