"""Workflow execution engine — run a WorkflowDefinition through the orchestrator."""

from __future__ import annotations

import asyncio
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
        self._executor = PipelineExecutor(definition)
        self._nodes = {n.id: n for n in definition.nodes}
        self._results: dict[str, Any] = {}
        self._status = PipelineStatus(
            workflow_id=workflow_id,
            status="pending",
            node_statuses={n.id: NodeStatus.WAITING for n in definition.nodes},
        )
        # Edge lookup maps for condition branching
        self._incoming_edges: dict[str, list[WorkflowEdge]] = {}
        self._outgoing_edges: dict[str, list[WorkflowEdge]] = {}
        for edge in definition.edges:
            self._incoming_edges.setdefault(edge.target, []).append(edge)
            self._outgoing_edges.setdefault(edge.source, []).append(edge)
        # Blocked edges (set by condition nodes to skip branches)
        self._blocked_edges: set[str] = set()
        # Throttle tracking for streaming broadcasts
        self._last_stream_time: dict[str, float] = {}

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

    async def run(self, initial_input: str = "") -> dict[str, Any]:
        """Execute all nodes in topological order and return results."""
        self._status.status = "running"
        await self._emit()

        order = self._executor.topological_order()

        for node_id in order:
            node = self._nodes[node_id]

            # Skip nodes whose ALL incoming edges are blocked (condition branch not taken)
            incoming = self._incoming_edges.get(node_id, [])
            if incoming and all(e.id in self._blocked_edges for e in incoming):
                self._results[node_id] = ""
                self._status.results[node_id] = "[skipped]"
                self._status.node_statuses[node_id] = NodeStatus.DONE
                # Propagate: block all outgoing edges from this skipped node
                for edge in self._outgoing_edges.get(node_id, []):
                    self._blocked_edges.add(edge.id)
                await self._emit()
                continue

            self._status.node_statuses[node_id] = NodeStatus.RUNNING
            await self._emit()

            # Small delay so the frontend can see the "running" state
            await asyncio.sleep(0.3)

            try:
                result = await self._execute_node(node, initial_input)
                self._results[node_id] = result
                self._status.results[node_id] = result
                self._status.node_statuses[node_id] = NodeStatus.DONE
                await self._emit()
            except Exception as e:
                self._status.node_statuses[node_id] = NodeStatus.ERROR
                self._status.error = f"Node {node_id}: {e}"
                self._status.status = "error"
                await self._emit()
                return self._results

        self._status.status = "completed"
        await self._emit(full_results=True)
        return self._results

    async def _execute_node(self, node: WorkflowNode, initial_input: str) -> str:
        """Execute a single node with its collected inputs."""
        node_input = self._collect_input(node.id, initial_input)

        if node.type == NodeType.INPUT:
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
        """Run an agent node with token-by-token streaming."""
        data = node.data
        model = data.get("model", "claude-sonnet-4-5-20250929")
        system_prompt = _get(data, "systemPrompt", "system_prompt", "You are a helpful assistant.")
        temperature = data.get("temperature", 0.7)
        max_tokens = _get(data, "maxTokens", "max_tokens", 4096)

        # Strip artifact blocks to save tokens — agents shouldn't process raw GeoJSON/images
        input_text = self._strip_artifacts(input_text)

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
            elif tool_name == "database_tool":
                conn = _get(data, "connectionString", "connection_string", "")
                query_tpl = _get(data, "queryTemplate", "query_template", "")
                if conn:
                    config["connection_string"] = conn
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

            # Also merge any explicit "config" dict from legacy format
            explicit_config = data.get("config", {})
            if isinstance(explicit_config, dict):
                config.update(explicit_config)

            return await tool.execute(input_text, **config)
        except ImportError:
            return f"[Tool '{tool_name}' not available]"

    async def _run_loop_node(self, node: WorkflowNode, input_text: str) -> str:
        """Run a generate→critique loop.

        The loop node sits between a generator and a critic in the graph.
        It passes input through, collecting the downstream critic result
        to decide whether to loop back.
        """
        data = node.data
        max_iter = _get(data, "maxIterations", "max_iterations", 3)
        exit_type = _get(data, "exitConditionType", "exit_condition_type", "keyword")
        exit_value = _get(data, "exitValue", "exit_value", "APPROVED")
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
