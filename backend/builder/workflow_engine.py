"""Workflow execution engine — run a WorkflowDefinition through the orchestrator."""

from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any, Callable, Awaitable

from models.workflow_models import WorkflowDefinition, WorkflowNode, WorkflowEdge, NodeType, NodeStatus, PipelineStatus
from orchestrator.pipeline import PipelineExecutor
from orchestrator.router import create_agent

# Type for the optional broadcast callback
BroadcastFn = Callable[[dict[str, Any]], Awaitable[None]]


def _get(data: dict[str, Any], camel: str, snake: str, default: Any = None) -> Any:
    """Read from node data trying camelCase first, then snake_case."""
    if camel in data:
        return data[camel]
    if snake in data:
        return data[snake]
    return default


class WorkflowEngine:
    """Execute a workflow definition node-by-node following topological order."""

    def __init__(
        self,
        definition: WorkflowDefinition,
        workflow_id: str = "",
        broadcast: BroadcastFn | None = None,
    ) -> None:
        self.definition = definition
        self.workflow_id = workflow_id
        self._broadcast = broadcast
        self._nodes = {n.id: n for n in definition.nodes}
        self._results: dict[str, Any] = {}
        self._status = PipelineStatus(
            workflow_id=workflow_id,
            status="pending",
            node_statuses={n.id: NodeStatus.WAITING for n in definition.nodes},
        )
        # Detect back-edges (cycles) — remove them to get a valid DAG
        back_edge_ids = self._detect_back_edges(definition)
        self._back_edges: list[WorkflowEdge] = [
            e for e in definition.edges if e.id in back_edge_ids
        ]
        dag_edges = [e for e in definition.edges if e.id not in back_edge_ids]

        # Build PipelineExecutor with cycle-free DAG
        if back_edge_ids:
            dag_def = WorkflowDefinition(nodes=definition.nodes, edges=dag_edges)
            self._executor = PipelineExecutor(dag_def)
        else:
            self._executor = PipelineExecutor(definition)

        # Edge lookup maps (DAG edges only — no back-edges)
        self._incoming_edges: dict[str, list[WorkflowEdge]] = {}
        self._outgoing_edges: dict[str, list[WorkflowEdge]] = {}
        for edge in dag_edges:
            self._incoming_edges.setdefault(edge.target, []).append(edge)
            self._outgoing_edges.setdefault(edge.source, []).append(edge)
        # Blocked edges (set by condition nodes to skip branches)
        self._blocked_edges: set[str] = set()
        # Nodes to skip in main execution (handled by graph-level loop)
        self._skip_nodes: set[str] = set()
        # Throttle tracking for streaming broadcasts
        self._last_stream_time: dict[str, float] = {}
        # Shared variable store for cross-node data
        self._variables: dict[str, str] = {}
        self._logger = logging.getLogger("gennaro.engine")

    @staticmethod
    def _detect_back_edges(definition: WorkflowDefinition) -> set[str]:
        """Detect back-edges (edges that create cycles) using DFS coloring."""
        adjacency: dict[str, list[tuple[str, str]]] = {}
        for node in definition.nodes:
            adjacency[node.id] = []
        for edge in definition.edges:
            adjacency.setdefault(edge.source, []).append((edge.target, edge.id))

        WHITE, GRAY, BLACK = 0, 1, 2
        color: dict[str, int] = {n.id: WHITE for n in definition.nodes}
        back_edges: set[str] = set()

        def dfs(u: str) -> None:
            color[u] = GRAY
            for v, eid in adjacency.get(u, []):
                if color.get(v) == GRAY:
                    back_edges.add(eid)
                elif color.get(v) == WHITE:
                    dfs(v)
            color[u] = BLACK

        for node in definition.nodes:
            if color[node.id] == WHITE:
                dfs(node.id)
        return back_edges

    def _identify_loop_body(self, loop_node_id: str, back_edge_source: str) -> set[str]:
        """Find all nodes in the loop body (between loop node and back-edge source)."""
        # Forward reachable from loop node (not including loop node itself)
        forward: set[str] = set()
        stack: list[str] = []
        for edge in self._outgoing_edges.get(loop_node_id, []):
            stack.append(edge.target)
        while stack:
            nid = stack.pop()
            if nid in forward:
                continue
            forward.add(nid)
            for edge in self._outgoing_edges.get(nid, []):
                if edge.target not in forward:
                    stack.append(edge.target)

        # Backward reachable from back-edge source (not including loop node)
        backward: set[str] = set()
        stack = [back_edge_source]
        while stack:
            nid = stack.pop()
            if nid in backward or nid == loop_node_id:
                continue
            backward.add(nid)
            for edge in self._incoming_edges.get(nid, []):
                if edge.source not in backward and edge.source != loop_node_id:
                    stack.append(edge.source)

        # Loop body = nodes reachable forward AND backward
        return forward & backward

    @property
    def status(self) -> PipelineStatus:
        return self._status

    async def _emit(self, full_results: bool = False) -> None:
        """Broadcast current status via WebSocket if a callback was provided."""
        if self._broadcast is None:
            return
        if full_results:
            results = {k: str(v) for k, v in self._status.results.items()}
        else:
            results = {k: str(v)[:500] for k, v in self._status.results.items()}
        await self._broadcast({
            "type": "workflow_status",
            "workflow_id": self.workflow_id,
            "status": self._status.status,
            "node_statuses": {k: v.value for k, v in self._status.node_statuses.items()},
            "results": results,
            "error": self._status.error,
        })

    async def run(self, initial_input: str = "", timeout: int = 0) -> dict[str, Any]:
        """Execute nodes by topological level — same-level nodes run in parallel.

        If *timeout* > 0, the entire workflow is cancelled after that many seconds.
        """
        if timeout > 0:
            try:
                return await asyncio.wait_for(
                    self._run_inner(initial_input), timeout=timeout,
                )
            except asyncio.TimeoutError:
                self._status.status = "error"
                self._status.error = f"Workflow timed out after {timeout}s"
                await self._emit()
                return self._results
        return await self._run_inner(initial_input)

    async def _run_inner(self, initial_input: str = "") -> dict[str, Any]:
        """Inner run logic (extracted for timeout wrapping)."""
        self._status.status = "running"
        await self._emit()

        levels = self._executor.topological_levels()

        for level in levels:
            # ── Filter: skip nodes handled by graph-level loop or blocked ──
            active_nodes: list[str] = []
            for node_id in level:
                if node_id in self._skip_nodes:
                    continue
                incoming = self._incoming_edges.get(node_id, [])
                if incoming and all(e.id in self._blocked_edges for e in incoming):
                    self._results[node_id] = ""
                    self._status.results[node_id] = "[skipped]"
                    self._status.node_statuses[node_id] = NodeStatus.DONE
                    for edge in self._outgoing_edges.get(node_id, []):
                        self._blocked_edges.add(edge.id)
                    await self._emit()
                else:
                    active_nodes.append(node_id)

            if not active_nodes:
                continue

            # Mark all active nodes as RUNNING simultaneously
            for node_id in active_nodes:
                self._status.node_statuses[node_id] = NodeStatus.RUNNING
            await self._emit()
            await asyncio.sleep(0.3)

            # ── Execute: single node directly, multiple nodes in parallel ──
            if len(active_nodes) == 1:
                node_id = active_nodes[0]
                try:
                    result = await self._execute_with_retry(self._nodes[node_id], initial_input)
                    self._results[node_id] = result
                    self._status.results[node_id] = result
                    self._status.node_statuses[node_id] = NodeStatus.DONE
                    # Variable store: save result if setVariable is configured
                    var_name = self._nodes[node_id].data.get("setVariable", "")
                    if var_name:
                        self._variables[var_name] = result
                    await self._emit()
                except Exception as e:
                    self._status.node_statuses[node_id] = NodeStatus.ERROR
                    self._status.error = f"Node {node_id}: {e}"
                    self._status.status = "error"
                    await self._emit()
                    return self._results
            else:
                # Parallel execution via asyncio.gather
                async def _run_one(nid: str) -> tuple[str, str | Exception]:
                    try:
                        result = await self._execute_with_retry(self._nodes[nid], initial_input)
                        return (nid, result)
                    except Exception as exc:
                        return (nid, exc)

                outcomes = await asyncio.gather(
                    *[_run_one(nid) for nid in active_nodes]
                )

                has_error = False
                for nid, result in outcomes:
                    if isinstance(result, Exception):
                        self._status.node_statuses[nid] = NodeStatus.ERROR
                        self._status.error = f"Node {nid}: {result}"
                        has_error = True
                    else:
                        self._results[nid] = result
                        self._status.results[nid] = result
                        self._status.node_statuses[nid] = NodeStatus.DONE
                        var_name = self._nodes[nid].data.get("setVariable", "")
                        if var_name:
                            self._variables[var_name] = result

                await self._emit()
                if has_error:
                    self._status.status = "error"
                    await self._emit()
                    return self._results

        self._status.status = "completed"
        await self._emit(full_results=True)
        return self._results

    async def _execute_with_retry(self, node: WorkflowNode, initial_input: str) -> str:
        """Execute a node with optional retry and error handling."""
        retry_count = int(node.data.get("retryCount", 0) or 0)
        retry_delay = int(node.data.get("retryDelay", 2) or 2)
        on_error = node.data.get("onError", "stop") or "stop"
        fallback_value = node.data.get("fallbackValue", "") or ""

        last_error: Exception | None = None
        for attempt in range(retry_count + 1):
            try:
                return await self._execute_node(node, initial_input)
            except Exception as e:
                last_error = e
                if attempt < retry_count:
                    self._logger.warning(
                        "Node %s attempt %d/%d failed: %s — retrying in %ds",
                        node.id, attempt + 1, retry_count + 1, e, retry_delay * (attempt + 1),
                    )
                    await asyncio.sleep(retry_delay * (attempt + 1))  # exponential backoff

        # All retries exhausted
        if on_error == "skip":
            return "[skipped: error after retries]"
        if on_error == "fallback":
            return fallback_value
        # on_error == "stop" (default)
        raise last_error  # type: ignore[misc]

    async def _execute_node(self, node: WorkflowNode, initial_input: str) -> str:
        """Execute a single node with its collected inputs."""
        node_input = self._collect_input(node.id, initial_input)
        # Variable substitution: replace {var:name} with stored variable values
        node_input = self._substitute_variables(node_input)

        if node.type == NodeType.INPUT:
            input_type = _get(node.data, "inputType", "input_type", "text")

            # Database input: execute query via DatabaseTool
            if input_type == "database":
                return await self._run_database_input(node)

            # If node has a fileId (uploaded file), resolve to actual filesystem path
            file_id = node.data.get("fileId", "")
            if file_id:
                resolved_path = await self._resolve_file_path(file_id)
                if resolved_path:
                    return resolved_path
            # Use defaultValue from node config, fall back to source, then label
            default = _get(node.data, "defaultValue", "default_value", "")
            return node_input or default or node.data.get("source", "") or node.data.get("label", "")

        if node.type == NodeType.OUTPUT:
            return node_input

        if node.type == NodeType.AGENT:
            return await self._run_agent_node(node, node_input)

        if node.type == NodeType.TOOL:
            return await self._run_tool_node(node, node_input)

        if node.type == NodeType.AGGREGATOR:
            return self._run_aggregator_node(node)

        if node.type == NodeType.CONDITION:
            return self._run_condition_node(node, node_input)

        if node.type == NodeType.LOOP:
            return await self._run_loop_node(node, node_input)

        if node.type == NodeType.META_AGENT:
            return await self._run_meta_agent_node(node, node_input)

        if node.type == NodeType.CHUNKER:
            return await self._run_chunker_node(node, node_input)

        if node.type == NodeType.DELAY:
            return await self._run_delay_node(node, node_input)

        if node.type == NodeType.SWITCH:
            return self._run_switch_node(node, node_input)

        if node.type == NodeType.VALIDATOR:
            return await self._run_validator_node(node, node_input)

        return node_input

    @staticmethod
    async def _resolve_file_path(file_id: str) -> str | None:
        """Resolve a fileId to its actual filesystem path from the database."""
        try:
            from storage.database import async_session, FileRow
            from sqlalchemy import select

            async with async_session() as session:
                result = await session.execute(
                    select(FileRow.path).where(FileRow.id == file_id)
                )
                row = result.scalar_one_or_none()
                if row:
                    return str(row)
        except Exception:
            pass
        return None

    async def _run_database_input(self, node: WorkflowNode) -> str:
        """Execute a database query configured on an Input node."""
        data = node.data
        db_type = _get(data, "dbType", "db_type", "sqlite")
        conn_str = _get(data, "connectionString", "connection_string", "")
        query = data.get("query", "")
        if not query:
            return "[Database Input: nessuna query configurata]"
        try:
            from tools import get_tool
            tool = get_tool("database_tool")
            if tool is None:
                return "[Database Input: database_tool non disponibile]"
            config: dict[str, Any] = {}
            if conn_str:
                config["connection_string"] = conn_str
            if db_type:
                config["db_type"] = db_type
            config["query"] = query
            return await tool.execute(query, **config)
        except Exception as e:
            return f"[Database Input error: {e}]"

    def _collect_input(self, node_id: str, initial_input: str) -> str:
        """Collect outputs from parent nodes, or use initial_input for root nodes."""
        incoming = self._incoming_edges.get(node_id, [])
        if not incoming:
            return initial_input
        # Only collect from non-blocked edges
        active_sources = [e.source for e in incoming if e.id not in self._blocked_edges]
        if not active_sources:
            return initial_input
        parts = [str(self._results.get(s, "")) for s in active_sources]
        return "\n\n---\n\n".join(parts)

    def _run_aggregator_node(self, node: WorkflowNode) -> str:
        """Aggregate results from parent nodes using the configured strategy."""
        data = node.data
        strategy = data.get("strategy", "concatenate")
        separator = data.get("separator", "\n\n---\n\n")
        incoming = self._incoming_edges.get(node.id, [])
        sources = [e.source for e in incoming if e.id not in self._blocked_edges]
        parts = [str(self._results.get(s, "")) for s in sources]

        if strategy == "concatenate":
            return separator.join(parts)

        if strategy == "summarize":
            # For summarize, join and let a downstream agent handle it
            return separator.join(parts)

        if strategy == "custom":
            template = _get(data, "customTemplate", "custom_template", "{inputs}")
            combined = separator.join(parts)
            return template.replace("{inputs}", combined)

        return separator.join(parts)

    def _run_condition_node(self, node: WorkflowNode, input_text: str) -> str:
        """Evaluate a condition and block edges for the branch not taken."""
        result = self._evaluate_condition(node, input_text)
        # Block outgoing edges for the opposite branch
        for edge in self._outgoing_edges.get(node.id, []):
            label = edge.label.strip().lower()
            if result and label == "false":
                self._blocked_edges.add(edge.id)
            elif not result and label == "true":
                self._blocked_edges.add(edge.id)
        return input_text  # pass input through to the taken branch

    def _evaluate_condition(self, node: WorkflowNode, input_text: str) -> bool:
        """Evaluate the condition configured on this node. Returns True/False."""
        data = node.data
        cond_type = _get(data, "conditionType", "condition_type", "contains")
        cond_value = _get(data, "conditionValue", "condition_value", "")

        if cond_type == "contains":
            return cond_value.lower() in input_text.lower()

        if cond_type == "not_contains":
            return cond_value.lower() not in input_text.lower()

        if cond_type == "score_threshold":
            # Extract numbers from the text and compare to threshold
            numbers = re.findall(r'\b(\d+(?:\.\d+)?)\b', input_text)
            if not numbers:
                return False
            score = float(numbers[-1])
            threshold = float(cond_value) if cond_value else 7.0
            operator = data.get("operator", "gte")
            if operator == "gte":
                return score >= threshold
            if operator == "gt":
                return score > threshold
            if operator == "lte":
                return score <= threshold
            if operator == "lt":
                return score < threshold
            if operator == "eq":
                return score == threshold
            return score >= threshold

        if cond_type == "keyword":
            return cond_value.upper() in input_text.upper()[:500]

        if cond_type == "regex":
            return bool(re.search(cond_value, input_text))

        if cond_type == "length_above":
            return len(input_text) > int(cond_value or 0)

        if cond_type == "length_below":
            return len(input_text) < int(cond_value or 1000)

        # Default: true
        return True

    async def _log_usage(self, model: str, provider: str, input_tokens: int, output_tokens: int, duration_ms: int) -> None:
        """Log usage to analytics (best-effort)."""
        try:
            from api.analytics import log_usage
            from storage.database import async_session
            async with async_session() as session:
                await log_usage(
                    session,
                    model=model,
                    provider=provider,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    duration_ms=duration_ms,
                    source="workflow",
                )
        except Exception:
            pass  # Don't fail workflow for analytics

    @staticmethod
    def _strip_artifacts(text: str) -> str:
        """Remove ```artifact blocks from text to avoid sending large binary data to agents."""
        import re
        return re.sub(r"```artifact\s*\n[\s\S]*?```", "[artifact rimosso]", text)

    async def _stream_broadcast(self, node_id: str, chunk: str, partial: str) -> None:
        """Broadcast a streaming token for a specific node (throttled)."""
        if self._broadcast is None:
            return
        now = time.monotonic()
        last = self._last_stream_time.get(node_id, 0.0)
        # Throttle: send at most every 80ms to avoid overwhelming the WebSocket
        if now - last < 0.08:
            return
        self._last_stream_time[node_id] = now
        await self._broadcast({
            "type": "node_streaming",
            "workflow_id": self.workflow_id,
            "node_id": node_id,
            "chunk": chunk,
            "partial": partial,
        })

    async def _run_agent_node(self, node: WorkflowNode, input_text: str) -> str:
        """Run an agent node with token-by-token streaming and model fallback."""
        data = node.data
        model = data.get("model", "claude-sonnet-4-5-20250929")
        fallback_model = _get(data, "fallbackModel", "fallback_model", "")
        system_prompt = _get(data, "systemPrompt", "system_prompt", "You are a helpful assistant.")
        temperature = data.get("temperature", 0.7)
        max_tokens = _get(data, "maxTokens", "max_tokens", 4096)

        # Strip artifact blocks to save tokens — agents shouldn't process raw GeoJSON/images
        input_text = self._strip_artifacts(input_text)

        try:
            return await self._run_agent_with_model(
                node, input_text, model, system_prompt, temperature, max_tokens,
            )
        except Exception as primary_err:
            if fallback_model:
                self._logger.warning(
                    "Node %s: primary model %s failed (%s), falling back to %s",
                    node.id, model, primary_err, fallback_model,
                )
                if self._broadcast:
                    await self._broadcast({
                        "type": "node_streaming",
                        "workflow_id": self.workflow_id,
                        "node_id": node.id,
                        "chunk": f"\n[Fallback: {model} → {fallback_model}]\n",
                        "partial": f"[Fallback: {model} → {fallback_model}]\n",
                    })
                return await self._run_agent_with_model(
                    node, input_text, fallback_model, system_prompt, temperature, max_tokens,
                )
            raise

    async def _run_agent_with_model(
        self, node: WorkflowNode, input_text: str,
        model: str, system_prompt: str, temperature: Any, max_tokens: Any,
    ) -> str:
        """Run a specific model and stream results."""
        agent = create_agent(
            model,
            system_prompt=system_prompt,
            temperature=float(temperature),
            max_tokens=int(max_tokens),
        )
        t0 = time.monotonic()

        # Stream token-by-token and broadcast via WebSocket
        content_parts: list[str] = []
        gen = await agent.chat([{"role": "user", "content": input_text}], stream=True)
        async for chunk in gen:
            content_parts.append(chunk)
            await self._stream_broadcast(node.id, chunk, "".join(content_parts))

        full_content = "".join(content_parts)
        duration_ms = int((time.monotonic() - t0) * 1000)

        # Send final complete content
        if self._broadcast:
            self._last_stream_time[node.id] = 0  # reset throttle
            await self._stream_broadcast(node.id, "", full_content)

        await self._log_usage(
            model=model,
            provider=agent.provider.value,
            input_tokens=0,
            output_tokens=0,
            duration_ms=duration_ms,
        )

        return full_content

    async def _run_tool_node(self, node: WorkflowNode, input_text: str) -> str:
        """Run a tool node."""
        # Frontend uses "tool" key, legacy uses "tool_name"
        tool_name = node.data.get("tool", "") or node.data.get("tool_name", "")
        data = node.data

        try:
            from tools import get_tool
            tool = get_tool(tool_name)
            if tool is None:
                return f"[Tool '{tool_name}' not found]"

            # Build config from node data depending on tool type
            config: dict[str, Any] = {}
            if tool_name == "web_search":
                query_tpl = _get(data, "queryTemplate", "query_template", "{input}")
                config["query"] = query_tpl.replace("{input}", input_text)
                return await tool.execute(config["query"])
            elif tool_name == "code_executor":
                config["language"] = data.get("language", "python")
                config["timeout"] = data.get("timeout", 30)
                code_tpl = _get(data, "codeTemplate", "code_template", "")
                if code_tpl:
                    # Inject input data into the code template
                    escaped = input_text.replace("\\", "\\\\").replace('"""', '\\"\\"\\"')
                    input_text = code_tpl.replace("{input}", escaped)
            elif tool_name == "database_tool":
                conn = _get(data, "connectionString", "connection_string", "")
                db_type = _get(data, "dbType", "db_type", "")
                query_tpl = _get(data, "queryTemplate", "query_template", "")
                if conn:
                    config["connection_string"] = conn
                if db_type:
                    config["db_type"] = db_type
                if query_tpl:
                    config["query"] = query_tpl.replace("{input}", input_text)
            elif tool_name == "file_processor":
                config["operation"] = data.get("operation", "read")
            elif tool_name == "image_tool":
                config["operation"] = data.get("operation", "analyze")
            elif tool_name == "ml_pipeline":
                config["operation"] = data.get("operation", "train")
                if data.get("modelType"):
                    config["model_type"] = data["modelType"]
                if data.get("targetColumn"):
                    config["target_column"] = data["targetColumn"]
                if data.get("modelName"):
                    config["model_name"] = data["modelName"]
            elif tool_name == "website_generator":
                pass  # Uses input_text directly
            elif tool_name == "gis_tool":
                config["operation"] = data.get("operation", "info")
                if data.get("analysis_type"):
                    config["analysis_type"] = data["analysis_type"]
                if data.get("distance"):
                    config["distance"] = data["distance"]
                if data.get("target_crs"):
                    config["target_crs"] = data["target_crs"]
                if data.get("title"):
                    config["title"] = data["title"]
                if data.get("colormap"):
                    config["colormap"] = data["colormap"]
                if data.get("column"):
                    config["column"] = data["column"]
                if data.get("how"):
                    config["how"] = data["how"]
                if data.get("band"):
                    config["band"] = data["band"]
                if data.get("layer"):
                    config["layer"] = data["layer"]
                # Coordinate map params
                if data.get("zoom"):
                    config["zoom"] = data["zoom"]
                if data.get("mapType"):
                    config["mapType"] = data["mapType"]
                if data.get("addMarker") is not None:
                    config["addMarker"] = data["addMarker"]
                if data.get("markerLabel"):
                    config["markerLabel"] = data["markerLabel"]
                # Use coordinates field as input_text if present
                coords = _get(data, "coordinates", "coords", "")
                if coords:
                    input_text = coords.replace("{input}", input_text)

            elif tool_name == "file_search":
                config["source"] = data.get("source", "local")
                config["mode"] = data.get("mode", "filename")
                config["max_results"] = data.get("max_results", 20)
                if data.get("roots"):
                    config["roots"] = data["roots"]
                if data.get("extensions"):
                    config["extensions"] = data["extensions"]

            elif tool_name == "email_search":
                config["source"] = data.get("source", "gmail")
                config["max_results"] = data.get("max_results", 20)
                for k in ("imap_server", "imap_port", "imap_username", "imap_password"):
                    if data.get(k):
                        config[k] = data[k]

            elif tool_name == "project_analyzer":
                config["max_depth"] = data.get("max_depth", 4)
                config["max_file_size"] = data.get("max_file_size", 50000)
                config["max_files_read"] = data.get("max_files_read", 20)

            elif tool_name == "email_sender":
                config["source"] = _get(data, "emailSource", "email_source", "smtp")
                config["to"] = _get(data, "emailTo", "email_to", "")
                config["subject"] = _get(data, "emailSubject", "email_subject", "Gennaro Workflow Result")
                if data.get("smtpHost"):
                    config["smtp_host"] = data["smtpHost"]
                if data.get("smtpPort"):
                    config["smtp_port"] = data["smtpPort"]
                if data.get("smtpUsername"):
                    config["smtp_username"] = data["smtpUsername"]
                if data.get("smtpPassword"):
                    config["smtp_password"] = data["smtpPassword"]
                if data.get("smtpTls") is not None:
                    config["smtp_tls"] = data["smtpTls"] != "false"

            elif tool_name == "web_scraper":
                config["operation"] = data.get("operation", "extract_text")
                config["css_selector"] = _get(data, "cssSelector", "css_selector", "")
                config["timeout"] = data.get("timeout", 15)
                config["user_agent"] = _get(data, "userAgent", "user_agent", "")

            elif tool_name == "file_manager":
                config["operation"] = data.get("operation", "list")
                config["base_dir"] = _get(data, "baseDir", "base_dir", "")
                config["destination"] = data.get("destination", "")
                config["confirm"] = data.get("confirm", False)
                config["content_source"] = _get(data, "contentSource", "content_source", "input")

            elif tool_name == "http_request":
                config["method"] = data.get("method", "GET")
                config["url_template"] = _get(data, "urlTemplate", "url_template", "{input}")
                config["headers"] = data.get("headers", "")
                config["body"] = data.get("body", "")
                config["auth_type"] = _get(data, "authType", "auth_type", "none")
                config["auth_token"] = _get(data, "authToken", "auth_token", "")
                config["timeout"] = data.get("timeout", 15)

            elif tool_name == "text_transformer":
                config["operation"] = data.get("operation", "trim")
                config["pattern"] = data.get("pattern", "")
                config["replacement"] = data.get("replacement", "")
                config["separator"] = data.get("separator", "\\n")
                config["template"] = data.get("template", "")
                config["max_length"] = _get(data, "maxLength", "max_length", 0)

            elif tool_name == "notifier":
                config["channel"] = data.get("channel", "webhook")
                config["webhook_url"] = _get(data, "webhookUrl", "webhook_url", "")
                config["bot_token"] = _get(data, "botToken", "bot_token", "")
                config["chat_id"] = _get(data, "chatId", "chat_id", "")
                config["method"] = data.get("method", "POST")
                config["headers"] = data.get("headers", "")
                config["timeout"] = data.get("timeout", 10)

            elif tool_name == "json_parser":
                config["operation"] = data.get("operation", "extract")
                config["path"] = data.get("path", "")
                config["filter_field"] = _get(data, "filterField", "filter_field", "")
                config["filter_value"] = _get(data, "filterValue", "filter_value", "")

            elif tool_name == "telegram_bot":
                config["operation"] = data.get("operation", "send_message")
                config["bot_token"] = _get(data, "botToken", "bot_token", "")
                config["chat_id"] = _get(data, "chatId", "chat_id", "")
                config["parse_mode"] = _get(data, "parseMode", "parse_mode", "Markdown")

            elif tool_name == "whatsapp":
                config["operation"] = data.get("operation", "send_message")
                config["token"] = _get(data, "waToken", "token", "")
                config["phone_number_id"] = _get(data, "phoneNumberId", "phone_number_id", "")
                config["recipient"] = data.get("recipient", "")
                config["template_name"] = _get(data, "templateName", "template_name", "")

            elif tool_name == "pyarchinit_tool":
                config["operation"] = data.get("operation", "query_us")
                config["db_path"] = _get(data, "dbPath", "db_path", "")
                config["db_type"] = _get(data, "dbType", "db_type", "sqlite")
                config["sito"] = data.get("sito", "")
                config["area"] = data.get("area", "")
                config["us"] = data.get("us", "")
                config["custom_query"] = _get(data, "customQuery", "custom_query", "")

            elif tool_name == "qgis_project":
                config["operation"] = data.get("operation", "list_layers")
                config["project_path"] = _get(data, "projectPath", "project_path", "")
                config["layer_name"] = _get(data, "layerName", "layer_name", "")

            # Also merge any explicit "config" dict from legacy format
            explicit_config = data.get("config", {})
            if isinstance(explicit_config, dict):
                config.update(explicit_config)

            # Merge customParams JSON from the UI config panel
            custom_raw = _get(data, "customParams", "custom_params", "")
            if custom_raw and isinstance(custom_raw, str):
                try:
                    import json as _json
                    custom = _json.loads(custom_raw)
                    if isinstance(custom, dict):
                        config.update(custom)
                except (ValueError, TypeError):
                    pass  # invalid JSON, ignore

            return await tool.execute(input_text, **config)
        except ImportError:
            return f"[Tool '{tool_name}' not available]"

    def _substitute_variables(self, text: str) -> str:
        """Replace {var:name} tokens with values from the variable store."""
        def _replacer(match: re.Match) -> str:
            var_name = match.group(1)
            return self._variables.get(var_name, match.group(0))
        return re.sub(r'\{var:(\w+)\}', _replacer, text)

    async def _run_delay_node(self, node: WorkflowNode, input_text: str) -> str:
        """Pause for N seconds then pass input through."""
        delay = float(_get(node.data, "delaySeconds", "delay_seconds", 1))
        delay = max(0, min(delay, 300))  # cap at 5 minutes
        if self._broadcast:
            await self._broadcast({
                "type": "workflow_status",
                "workflow_id": self.workflow_id,
                "status": "running",
                "node_statuses": {node.id: f"waiting {delay}s"},
                "results": {},
                "error": None,
            })
        await asyncio.sleep(delay)
        return input_text

    def _run_switch_node(self, node: WorkflowNode, input_text: str) -> str:
        """Multi-way branching — block edges whose label doesn't match."""
        data = node.data
        switch_type = _get(data, "switchType", "switch_type", "keyword")

        # Find the matching case
        matched_label = "default"
        for edge in self._outgoing_edges.get(node.id, []):
            label = edge.label.strip().lower()
            if not label or label == "default":
                continue

            if switch_type == "keyword":
                if label in input_text.lower():
                    matched_label = label
                    break
            elif switch_type == "regex":
                if re.search(label, input_text, re.IGNORECASE):
                    matched_label = label
                    break
            elif switch_type == "score":
                # Extract last number from input and compare
                numbers = re.findall(r'\b(\d+(?:\.\d+)?)\b', input_text)
                if numbers:
                    score = float(numbers[-1])
                    try:
                        threshold = float(label)
                        if score >= threshold:
                            matched_label = label
                            break
                    except ValueError:
                        pass

        # Block all non-matching edges
        for edge in self._outgoing_edges.get(node.id, []):
            label = edge.label.strip().lower()
            if label and label != matched_label and label != "default":
                self._blocked_edges.add(edge.id)
            elif not label and matched_label != "default":
                # Unlabeled edges are treated as default
                pass
            elif label == "default" and matched_label != "default":
                self._blocked_edges.add(edge.id)

        return input_text

    async def _run_validator_node(self, node: WorkflowNode, input_text: str) -> str:
        """Run an AI-powered validator node with pass/fail branching."""
        import json as _json

        data = node.data
        model = data.get("model", "claude-haiku-4-5-20251001")
        validation_prompt = _get(data, "validationPrompt", "validation_prompt", "")
        strictness = int(_get(data, "strictness", "strictness", 7))
        include_context = _get(data, "includeContext", "include_context", False)

        # Strip artifacts from input
        clean_input = self._strip_artifacts(input_text)

        # Build system prompt for the validator agent
        system_prompt = (
            "You are a strict quality validator. Analyze the input and determine if it meets the criteria.\n"
            f"Strictness level: {strictness}/10 (10 = extremely strict, 1 = very lenient).\n"
        )
        if validation_prompt:
            system_prompt += f"\nValidation criteria:\n{validation_prompt}\n"
        system_prompt += (
            "\nRespond ONLY with valid JSON in this exact format:\n"
            '{"valid": true/false, "reason": "brief explanation", "score": 0-10}\n'
            "No other text before or after the JSON."
        )

        user_msg = f"Validate the following content:\n\n{clean_input}"

        # Optionally add workflow context
        if include_context:
            nodes_summary = [
                {"id": n.id, "type": n.type.value, "label": n.data.get("label", "")}
                for n in self.definition.nodes
            ]
            user_msg += f"\n\n[Workflow context: {_json.dumps(nodes_summary)}]"

        agent = create_agent(model, system_prompt=system_prompt, temperature=0.1, max_tokens=256)

        content_parts: list[str] = []
        gen = await agent.chat([{"role": "user", "content": user_msg}], stream=True)
        async for chunk in gen:
            content_parts.append(chunk)
            await self._stream_broadcast(node.id, chunk, "".join(content_parts))

        raw_response = "".join(content_parts)

        # Parse JSON response
        valid = False
        reason = "Could not parse validator response"
        score = 0
        try:
            # Extract JSON from response (handle wrapped responses)
            json_match = re.search(r'\{[^}]*"valid"[^}]*\}', raw_response)
            if json_match:
                parsed = _json.loads(json_match.group())
                valid = bool(parsed.get("valid", False))
                reason = parsed.get("reason", "")
                score = int(parsed.get("score", 0))
        except (ValueError, TypeError, KeyError):
            pass

        # Block edges based on validation result (same logic as condition node)
        for edge in self._outgoing_edges.get(node.id, []):
            label = edge.label.strip().lower()
            if valid and label == "fail":
                self._blocked_edges.add(edge.id)
            elif not valid and label == "pass":
                self._blocked_edges.add(edge.id)

        # Return original input + validation report
        report = f"\n\n---\n**Validation:** {'PASS' if valid else 'FAIL'} (score: {score}/10)\n**Reason:** {reason}"
        return input_text + report

    async def _run_loop_node(self, node: WorkflowNode, input_text: str) -> str:
        """Run a loop: graph-level (with back-edges) or internal agent loop."""
        data = node.data
        max_iter = int(_get(data, "maxIterations", "max_iterations", 3))
        exit_type = _get(data, "exitConditionType", "exit_condition_type", "keyword")
        exit_value = _get(data, "exitValue", "exit_value", "APPROVED")

        # Graph-level loop: back-edges exist pointing to this node
        loop_back_edges = [e for e in self._back_edges if e.target == node.id]
        if loop_back_edges:
            return await self._run_graph_loop(
                node, input_text, loop_back_edges, max_iter, exit_type, exit_value,
            )

        # ── Internal agent loop (existing behavior) ──
        stop_condition = exit_value or data.get("stop_condition", "PASS")

        # Find downstream nodes connected from this loop node
        # to use as the critic/evaluator
        downstream = []
        for edge in self.definition.edges:
            if edge.source == node.id:
                downstream.append(edge.target)

        model = data.get("model", "claude-sonnet-4-5-20250929")
        refinement_prompt = _get(data, "refinementPrompt", "refinement_prompt",
                                 "Improve the content based on the feedback.")
        generator = create_agent(model, system_prompt="Generate the best possible output for the given task.")
        critic = create_agent(
            model,
            system_prompt=f"Review the output. If it meets quality standards, respond with {stop_condition}. "
                          f"Otherwise, provide specific feedback for improvement.",
        )

        current = input_text
        gen_content = ""
        for iteration in range(int(max_iter)):
            # Stream generator response
            gen_parts: list[str] = []
            gen_stream = await generator.chat([{"role": "user", "content": current}], stream=True)
            async for token in gen_stream:
                gen_parts.append(token)
                await self._stream_broadcast(node.id, token, "".join(gen_parts))
            gen_content = "".join(gen_parts)

            # Critic (no need to stream critic to user)
            critic_resp = await critic.chat(
                [{"role": "user", "content": f"Review this:\n\n{gen_content}"}],
                stream=False,
            )
            if exit_type == "keyword" and stop_condition.upper() in critic_resp.content.upper()[:100]:
                return gen_content
            current = (
                f"Original: {input_text}\n\n"
                f"Previous output:\n{gen_content}\n\n"
                f"Feedback:\n{critic_resp.content}\n\n"
                f"{refinement_prompt}"
            )

        return gen_content

    async def _run_graph_loop(
        self, node: WorkflowNode, input_text: str,
        back_edges: list[WorkflowEdge], max_iter: int,
        exit_type: str, exit_value: str,
    ) -> str:
        """Execute a graph-level loop: the loop body is defined by downstream nodes with a back-edge.

        Identifies the loop body subgraph, creates a sub-engine, and executes it
        repeatedly until the exit condition is met or max iterations reached.
        """
        # Identify loop body nodes
        loop_body_ids: set[str] = set()
        for be in back_edges:
            body = self._identify_loop_body(node.id, be.source)
            loop_body_ids.update(body)

        if not loop_body_ids:
            return input_text

        # Mark loop body nodes to be skipped by main engine
        self._skip_nodes.update(loop_body_ids)

        # Build sub-workflow definition (only loop body nodes and their internal edges)
        body_nodes = [self._nodes[nid] for nid in loop_body_ids if nid in self._nodes]
        back_edge_ids = {be.id for be in self._back_edges}
        body_edges = [
            e for e in self.definition.edges
            if e.source in loop_body_ids and e.target in loop_body_ids
            and e.id not in back_edge_ids
        ]

        sub_def = WorkflowDefinition(nodes=body_nodes, edges=body_edges)

        # Find the exit node (back-edge source) to get the result each iteration
        exit_node_id = back_edges[0].source

        # Execute loop
        transcript_parts: list[str] = []
        current_input = input_text

        for iteration in range(max_iter):
            # Broadcast loop progress
            if self._broadcast:
                await self._broadcast({
                    "type": "workflow_status",
                    "workflow_id": self.workflow_id,
                    "status": "running",
                    "node_statuses": {node.id: f"loop {iteration + 1}/{max_iter}"},
                    "results": {},
                    "error": None,
                })

            # Reset loop body node statuses for this iteration
            for nid in loop_body_ids:
                self._status.node_statuses[nid] = NodeStatus.RUNNING
            await self._emit()

            # Create and run sub-engine for this iteration
            sub_engine = WorkflowEngine(
                sub_def,
                workflow_id=self.workflow_id,
                broadcast=self._broadcast,
            )
            results = await sub_engine.run(initial_input=current_input)

            # Update main engine results and statuses
            for nid, result in results.items():
                self._results[nid] = result
                self._status.results[nid] = result
                self._status.node_statuses[nid] = NodeStatus.DONE

            # Get exit node result
            exit_result = str(results.get(exit_node_id, ""))
            transcript_parts.append(f"**--- Round {iteration + 1} ---**\n\n{exit_result}")

            await self._emit()

            # Check exit condition
            if exit_type == "always":
                # Always continue — run all max_iter iterations
                current_input = exit_result
                continue
            elif exit_type == "keyword":
                if exit_value and exit_value.upper() in exit_result.upper()[:500]:
                    break
            elif exit_type == "no_change":
                if iteration > 0 and exit_result.strip() == current_input.strip():
                    break
            elif exit_type == "score":
                numbers = re.findall(r'\b(\d+(?:\.\d+)?)\b', exit_result)
                if numbers:
                    score = float(numbers[-1])
                    threshold = float(exit_value) if exit_value else 7.0
                    if score >= threshold:
                        break

            # Feed result back as input for next iteration
            current_input = exit_result

        # Mark loop body nodes as DONE
        for nid in loop_body_ids:
            self._status.node_statuses[nid] = NodeStatus.DONE

        return "\n\n".join(transcript_parts)

    async def _run_meta_agent_node(self, node: WorkflowNode, input_text: str) -> str:
        """Run a sub-workflow inside this node (recursive Gennaro).

        The meta-agent node takes a workflow definition from its config
        and executes it as a nested workflow, with recursion depth limit.
        """
        data = node.data
        sub_definition = data.get("workflowDefinition") or data.get("workflow_definition")

        if not sub_definition:
            return "[Meta-Agent: no sub-workflow definition configured]"

        # Enforce max recursion depth
        max_depth = int(data.get("maxDepth", 3))
        current_depth = int(data.get("_currentDepth", 0))
        if current_depth >= max_depth:
            return f"[Meta-Agent: max recursion depth ({max_depth}) reached]"

        # Build sub-workflow definition
        from models.workflow_models import WorkflowDefinition
        if isinstance(sub_definition, dict):
            sub_def = WorkflowDefinition(**sub_definition)
        else:
            return "[Meta-Agent: invalid workflow definition]"

        # Inject current depth into any nested meta-agent nodes
        for sub_node in sub_def.nodes:
            if sub_node.type == NodeType.META_AGENT:
                sub_node.data["_currentDepth"] = current_depth + 1

        # Execute sub-workflow
        sub_engine = WorkflowEngine(
            sub_def,
            workflow_id=f"{self.workflow_id}_sub_{node.id}",
            broadcast=self._broadcast,
        )
        results = await sub_engine.run(initial_input=input_text)

        # Return concatenated results from output nodes, or all results
        output_results = []
        for n in sub_def.nodes:
            if n.type == NodeType.OUTPUT and n.id in results:
                output_results.append(str(results[n.id]))
        if output_results:
            return "\n\n---\n\n".join(output_results)
        return "\n\n---\n\n".join(str(v) for v in results.values())

    async def _run_chunker_node(self, node: WorkflowNode, input_text: str) -> str:
        """Split input into chunks, process each through an agent, then aggregate.

        Useful for handling long documents that exceed token limits.
        """
        data = node.data
        chunk_size = int(_get(data, "chunkSize", "chunk_size", 2000))
        overlap = int(_get(data, "overlap", "overlap", 200))
        model = data.get("model", "claude-sonnet-4-5-20250929")
        system_prompt = _get(data, "systemPrompt", "system_prompt",
                             "Process the following chunk of text:")
        separator = data.get("separator", "\n\n---\n\n")

        # Split input into chunks
        chunks = self._split_text(input_text, chunk_size, overlap)

        if not chunks:
            return input_text

        agent = create_agent(model, system_prompt=system_prompt)

        results = []
        for i, chunk in enumerate(chunks):
            prompt = f"[Chunk {i + 1}/{len(chunks)}]\n\n{chunk}"

            # Stream each chunk's response
            content_parts: list[str] = []
            gen = await agent.chat(
                [{"role": "user", "content": prompt}], stream=True,
            )
            async for token in gen:
                content_parts.append(token)
                partial_all = separator.join(results + ["".join(content_parts)])
                await self._stream_broadcast(node.id, token, partial_all)
            results.append("".join(content_parts))

            # Emit chunk progress via broadcast
            if self._broadcast:
                await self._broadcast({
                    "type": "workflow_status",
                    "workflow_id": self.workflow_id,
                    "status": "running",
                    "node_statuses": {node.id: f"chunk {i + 1}/{len(chunks)}"},
                    "results": {},
                    "error": None,
                })

        return separator.join(results)

    @staticmethod
    def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
        """Split text into chunks with overlap."""
        if len(text) <= chunk_size:
            return [text]
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
        return chunks
