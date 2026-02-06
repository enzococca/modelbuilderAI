"""Pydantic models for projects."""

from __future__ import annotations

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str = ""


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    created_at: str
    updated_at: str


class FileOut(BaseModel):
    id: str
    project_id: str | None
    filename: str
    content_type: str
    size: int
    created_at: str
