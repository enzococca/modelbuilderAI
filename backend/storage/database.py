"""SQLAlchemy async database setup and ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ── ORM models ──────────────────────────────────────────────


class ProjectRow(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    conversations = relationship("ConversationRow", back_populates="project", cascade="all, delete-orphan")
    files = relationship("FileRow", back_populates="project", cascade="all, delete-orphan")


class ConversationRow(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    title = Column(String, default="New conversation")
    model = Column(String, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    project = relationship("ProjectRow", back_populates="conversations")
    messages = relationship("MessageRow", back_populates="conversation", cascade="all, delete-orphan")


class MessageRow(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    model = Column(String, nullable=True)
    created_at = Column(DateTime, default=_now)

    conversation = relationship("ConversationRow", back_populates="messages")


class AgentRow(Base):
    __tablename__ = "agents"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    model = Column(String, nullable=False)
    system_prompt = Column(Text, default="You are a helpful assistant.")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=4096)
    tools = Column(JSON, default=list)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class WorkflowRow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    definition = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class FileRow(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, default="application/octet-stream")
    size = Column(Integer, default=0)
    path = Column(String, nullable=False)
    created_at = Column(DateTime, default=_now)

    project = relationship("ProjectRow", back_populates="files")


class WorkflowExecutionRow(Base):
    __tablename__ = "workflow_executions"

    id = Column(String, primary_key=True, default=_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    status = Column(String, default="running")
    results = Column(JSON, default=dict)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)


class UsageRow(Base):
    __tablename__ = "usage_logs"

    id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    model = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    duration_ms = Column(Integer, default=0)
    source = Column(String, default="chat")  # chat, workflow, tool
    created_at = Column(DateTime, default=_now)


class ScheduledJobRow(Base):
    __tablename__ = "scheduled_jobs"

    id = Column(String, primary_key=True, default=_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    cron_expr = Column(String, default="")  # e.g. "*/5 * * * *"
    interval_seconds = Column(Integer, default=0)  # alternative: every N seconds
    enabled = Column(Boolean, default=True)
    input_text = Column(Text, default="")
    last_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)


# ── helpers ──────────────────────────────────────────────────


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
