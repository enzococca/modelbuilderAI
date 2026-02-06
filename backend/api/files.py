"""File upload/download API endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.project_models import FileOut
from storage.database import get_db, FileRow
from storage.file_store import save_upload, extract_text
from storage.vector_store import vector_store

router = APIRouter(tags=["files"])


@router.post("/files/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    project_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    path = await save_upload(file.filename or "upload", content, project_id)

    row = FileRow(
        id=str(uuid.uuid4()),
        project_id=project_id,
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        size=len(content),
        path=path,
    )
    db.add(row)
    await db.commit()

    # Index text content in vector store for RAG
    text = extract_text(path)
    chunk_count = 0
    if text.strip():
        chunk_count = vector_store.index_document(
            file_id=row.id,
            filename=row.filename,
            text=text,
            project_id=project_id,
        )

    return FileOut(
        id=row.id,
        project_id=row.project_id,
        filename=row.filename,
        content_type=row.content_type,
        size=row.size,
        created_at=row.created_at.isoformat(),
    )


@router.get("/files")
async def list_files(project_id: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(FileRow).order_by(FileRow.created_at.desc())
    if project_id:
        q = q.where(FileRow.project_id == project_id)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        FileOut(
            id=r.id, project_id=r.project_id, filename=r.filename,
            content_type=r.content_type, size=r.size,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.delete("/files/{file_id}", status_code=204)
async def delete_file(file_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FileRow).where(FileRow.id == file_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "File not found")
    vector_store.delete_by_file_id(file_id)
    await db.delete(row)
    await db.commit()


@router.get("/files/search")
async def search_documents(q: str, project_id: str | None = None, n: int = 5):
    """Semantic search across indexed documents."""
    contexts = vector_store.search_for_context(q, n_results=n, project_id=project_id)
    return {"query": q, "results": contexts}
