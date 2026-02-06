# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gennaro** is an AI Agent Orchestrator & Model Builder. FastAPI backend + React frontend for building multi-agent AI pipelines via a visual drag-and-drop canvas. Full specification in `TASK.md`.

## Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000     # dev server (runs from backend/)
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # dev server on :5173, proxies /api and /ws to :8000
npm run build     # tsc -b && vite build
npm run lint      # eslint
```

### Full stack
```bash
./start.sh        # interactive setup + launches both servers
```

No test suite exists yet — no pytest or vitest configured.

## Architecture

### Backend (`backend/`) — FastAPI + Python 3.13

Entry point: `main.py` — mounts all API routers under `/api` prefix, initializes DB on startup via lifespan. Config via Pydantic Settings in `config.py`, reads from `.env`.

- **`agents/`** — `BaseAgent` ABC → `ClaudeAgent`, `OpenAIAgent`, `LocalAgent` (Ollama). Each implements `async chat()` with streaming support. Factory: `orchestrator/router.py:create_agent()`.
- **`orchestrator/`** — Execution patterns: sequential, parallel, router, debate, loop. `pipeline.py` runs DAG-based workflows. `memory.py` holds shared context between agents.
- **`builder/`** — `workflow_engine.py` executes visual workflows. `templates.py` has 6 predefined templates. `node_registry.py` lists available node types.
- **`tools/`** — 5 tools: `web_search`, `code_executor`, `file_processor`, `database_tool`, `image_tool`.
- **`api/`** — REST routes: `chat.py` (streaming via SSE), `agents.py`, `workflows.py`, `projects.py`, `files.py`, `analytics.py`.
- **`storage/`** — `database.py` (async SQLAlchemy, SQLite dev/PostgreSQL prod; tables: projects, conversations, messages, agents, workflows, files, usage_logs). `vector_store.py` (ChromaDB for RAG). `file_store.py` (upload handling).
- **`websocket/handlers.py`** — Real-time pipeline state at `/ws`.

### Frontend (`frontend/`) — React 19 + TypeScript + Vite

Uses `rolldown-vite` (aliased as vite in package.json). Path alias: `@/` → `src/`.

- **`stores/`** — Zustand stores: `chatStore` (`currentModel`, `isStreaming`, `appendStreamingContent`), `projectStore` (`currentProject: Project | null`), `workflowStore` (`currentWorkflow: Workflow | null`), `settingsStore` (`viewMode`, `toggleSidebar`).
- **`services/api.ts`** — Axios client. Models endpoint: `/api/agents/models` returns `{ anthropic: [...], openai: [...] }`, `getModels()` flattens to `ModelInfo[]`.
- **`services/websocket.ts`** — `wsClient.on(event, handler)` returns unsubscribe function.
- **`components/builder/`** — `WorkflowCanvas` uses `@xyflow/react` (React Flow). Node types: Agent, Tool, Condition, Output.
- **`components/chat/`** — Chat panel with SSE streaming, model selector, file upload.
- **`components/analytics/`** — `AnalyticsDashboard` for usage/cost tracking.
- **`types/index.ts`** — All shared TypeScript types.

### Data flow

Frontend (`:5173`) → Vite proxy → Backend (`:8000`). Chat streaming uses SSE (`/api/chat/stream`). Pipeline status uses WebSocket (`/ws`). RAG: enable `use_rag: true` in ChatRequest for context injection with citations from `/api/files/search`.

## TypeScript Gotchas

- **`verbatimModuleSyntax`**: must use `import type` for type-only imports
- **`noUnusedLocals` + `noUnusedParameters`**: strict — prefix unused params with `_`
- **`@xyflow/react`**: requires explicit generic types, e.g. `useNodesState<Node>([])`
- **Tailwind v4**: uses `@import "tailwindcss"` (not `@tailwind` directives)
- **`erasableSyntaxOnly`**: no `enum` — use `as const` objects or union types instead

## Commit Convention

Do not include bot attribution footers or emoji-prefixed generated-by lines in commit messages.
