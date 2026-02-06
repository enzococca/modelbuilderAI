"""Pipeline system — define and execute DAG-based workflows."""

from __future__ import annotations

from typing import Any

from models.workflow_models import WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeStatus, PipelineStatus


class PipelineExecutor:
    """Execute a workflow definition as a DAG."""

    def __init__(self, definition: WorkflowDefinition) -> None:
        self.definition = definition
        self._adjacency: dict[str, list[str]] = {}
        self._nodes: dict[str, WorkflowNode] = {}
        self._build_graph()

    def _build_graph(self) -> None:
        for node in self.definition.nodes:
            self._nodes[node.id] = node
            self._adjacency[node.id] = []
        for edge in self.definition.edges:
            self._adjacency.setdefault(edge.source, []).append(edge.target)

    def topological_order(self) -> list[str]:
        """Return nodes in execution order (topological sort)."""
        in_degree: dict[str, int] = {nid: 0 for nid in self._nodes}
        for src, targets in self._adjacency.items():
            for t in targets:
                in_degree[t] = in_degree.get(t, 0) + 1

        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        order: list[str] = []
        while queue:
            nid = queue.pop(0)
            order.append(nid)
            for t in self._adjacency.get(nid, []):
                in_degree[t] -= 1
                if in_degree[t] == 0:
                    queue.append(t)
        return order

    def validate(self) -> list[str]:
        """Return a list of validation errors (empty = valid)."""
        errors: list[str] = []
        order = self.topological_order()
        if len(order) != len(self._nodes):
            errors.append("Workflow contains cycles")
        node_ids = set(self._nodes.keys())
        for edge in self.definition.edges:
            if edge.source not in node_ids:
                errors.append(f"Edge references unknown source: {edge.source}")
            if edge.target not in node_ids:
                errors.append(f"Edge references unknown target: {edge.target}")
        return errors
