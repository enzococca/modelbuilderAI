# Gennaro — AI Agent Orchestrator & Visual Workflow Builder

Gennaro is a full-stack platform for building, executing, and managing AI agent pipelines through a visual drag-and-drop interface. Connect AI models, tools, and logic nodes into complex workflows — then run them with real-time streaming output.

## Features

- **Visual Workflow Builder** — Drag-and-drop canvas powered by React Flow. Create pipelines by connecting nodes with edges.
- **9 Node Types** — Agent, Tool, Condition, Input, Output, Loop, Aggregator, Meta-Agent (recursive sub-workflows), Chunker (long document processing).
- **Multi-Provider AI** — Claude (Anthropic), GPT-4o (OpenAI), Ollama, and LM Studio local models.
- **10 Built-in Tools** — Web search, code executor, file processor, database queries, image analysis, ML pipeline (train/predict/evaluate), website generator, GIS analysis, file search, email search, project analyzer.
- **Real-time Streaming** — Token-by-token output displayed live per node during workflow execution via WebSocket.
- **Chat Interface** — Direct conversation with AI models. Ask the chat to generate workflows automatically.
- **RAG Support** — Upload documents, auto-embed with ChromaDB, retrieve context for chat and workflows.
- **Multi-format Export** — Export workflow results as Markdown, PDF, DOCX, CSV, Excel (XLSX), or ZIP.
- **19 Tutorial Templates** — Pre-built workflows covering common patterns (translation, code review, debate, auto-refine loops, ML pipelines, GIS analysis, etc.).
- **Analytics Dashboard** — Track token usage, costs, and model performance over time.
- **Project Management** — Organize workflows, chats, and files into projects.

## Architecture

```
modelbuilderAI/
  backend/              # FastAPI + Python
    agents/             # AI provider adapters (Claude, OpenAI, Ollama, LM Studio)
    api/                # REST endpoints (chat, workflows, projects, files, analytics, settings)
    builder/            # Workflow engine, node registry, templates
    tools/              # Built-in tool implementations
    orchestrator/       # Pipeline execution, agent routing
    models/             # Pydantic models
    storage/            # SQLite (async), ChromaDB vector store
    websocket/          # WebSocket connection manager
  frontend/             # React 19 + TypeScript + Vite
    src/
      components/       # UI components (builder, chat, settings)
      services/         # API client, WebSocket client
      stores/           # Zustand state management
      types/            # TypeScript type definitions
  data/                 # Runtime data (db, uploads, vectors, exports)
```

**Backend:** FastAPI on port 8000 — async SQLite via SQLAlchemy, ChromaDB for vector search, WebSocket for real-time updates, SSE for chat streaming.

**Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Vite on port 5173 — React Flow for the visual canvas, Zustand for state management, proxies `/api` and `/ws` to the backend.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- At least one API key: `ANTHROPIC_API_KEY` (Claude) or `OPENAI_API_KEY` (GPT)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/modelbuilderAI.git
cd modelbuilderAI
```

### 2. Set up environment variables

```bash
cp .env.example .env   # or create .env manually
```

Edit `.env` and add your API keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional
DATABASE_URL=sqlite+aiosqlite:///./data/db/gennaro.db
CHROMA_PATH=./data/vectors
UPLOAD_PATH=./data/uploads
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Backend setup

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

### 5. Run

**Option A: Quick launch** (requires setup already done)

```bash
./run.sh          # macOS / Linux
run.bat           # Windows
```

**Option B: Full setup + launch** (first time)

```bash
./start.sh        # Creates venv, installs deps, starts services
```

**Option C: Manual (two terminals)**

Terminal 1 — Backend:
```bash
cd backend
source ../.venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

### 6. Open

Navigate to **http://localhost:5173** in your browser.

- **Builder** tab: Visual workflow editor
- **Chat** tab: Direct AI conversation
- **Settings** tab: Model configuration, API keys

## Usage

### Building a Workflow

1. Drag nodes from the left palette onto the canvas
2. Connect nodes by dragging from output handles to input handles
3. Click a node to configure it (model, prompt, tool settings, etc.)
4. Click **Save**, then **Run**
5. Watch results stream in real-time in the results panel
6. Export results in your preferred format (PDF, DOCX, CSV, XLSX, Markdown, ZIP)

### Node Types

| Node | Purpose |
|------|---------|
| **Input** | Entry point — text input or uploaded file |
| **Agent** | Call an AI model with a system prompt |
| **Tool** | Run a built-in tool (web search, code execution, etc.) |
| **Condition** | If/else branching based on content, score, regex |
| **Output** | Final result with format hint (markdown, JSON, map, HTML) |
| **Loop** | Generate-critique loop with exit conditions |
| **Aggregator** | Merge parallel branches (concatenate, summarize, custom) |
| **Meta-Agent** | Execute a nested sub-workflow recursively |
| **Chunker** | Split long text into chunks, process each with an agent |

### Chat-to-Workflow

In the Chat tab, ask the AI to build a workflow:

> "Create a workflow that takes a topic, searches the web for it, then writes a summary"

The AI generates a `workflow` JSON block that auto-loads into the Builder.

### Tutorial Templates

The left palette includes 19 ready-to-use templates covering:
- Simple pipelines, multi-language translation, web research
- Code review, AI debate, document analysis
- Auto-refine loops, content factory, quality gates
- ML training pipelines, website generation
- Document chunking, recursive sub-workflows, GIS analysis
- Document task extraction, project analysis

## Local Models

Gennaro supports **Ollama** and **LM Studio** for running models locally:

1. Install [Ollama](https://ollama.ai) and pull a model: `ollama pull llama3`
2. Set `OLLAMA_BASE_URL=http://localhost:11434` in `.env`
3. Local models appear in the Settings tab and model dropdowns

## API Documentation

With the backend running, visit **http://localhost:8000/docs** for the auto-generated Swagger UI.

Key endpoints:
- `POST /api/chat` — Non-streaming chat
- `POST /api/chat/stream` — SSE streaming chat
- `POST /api/workflows/{id}/run` — Execute a workflow
- `POST /api/workflows/{id}/export?format=pdf|docx|csv|xlsx|markdown|zip` — Export results
- `GET /ws` — WebSocket for real-time workflow updates

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, FastAPI, SQLAlchemy (async), ChromaDB |
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite |
| Workflow Canvas | @xyflow/react (React Flow) |
| State Management | Zustand |
| AI Providers | Anthropic SDK, OpenAI SDK, Ollama (HTTP), LM Studio |
| Real-time | WebSocket (workflow streaming), SSE (chat streaming) |
| Export | fpdf2 (PDF), python-docx (DOCX), openpyxl (XLSX), csv (CSV) |

## License

MIT
