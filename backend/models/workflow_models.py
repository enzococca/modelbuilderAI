"""Pydantic models for workflows and pipelines."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class NodeType(str, Enum):
    AGENT = "agent"
    TOOL = "tool"
    CONDITION = "condition"
    INPUT = "input"
    OUTPUT = "output"
    LOOP = "loop"
    AGGREGATOR = "aggregator"
    META_AGENT = "meta_agent"
    CHUNKER = "chunker"


class PipelinePattern(str, Enum):
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    ROUTER = "router"
    DEBATE = "debate"
    LOOP = "loop"


class WorkflowNode(BaseModel):
    id: str
    type: NodeType
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})
    data: dict[str, Any] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""


class WorkflowDefinition(BaseModel):
    nodes: list[WorkflowNode] = Field(default_factory=list)
    edges: list[WorkflowEdge] = Field(default_factory=list)


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    definition: WorkflowDefinition = Field(default_factory=WorkflowDefinition)


class WorkflowOut(BaseModel):
    id: str
    name: str
    description: str
    definition: WorkflowDefinition
    created_at: str
    updated_at: str


class NodeStatus(str, Enum):
    WAITING = "waiting"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


class PipelineStatus(BaseModel):
    workflow_id: str
    status: str = "running"
    node_statuses: dict[str, NodeStatus] = Field(default_factory=dict)
    results: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
