<p align="center">
  <img src="frontend/public/mascot/mascot-12-pizza.png" alt="Gennaro mascot" width="300" />
</p>

<h1 align="center">Gennaro — AI Agent Orchestrator & Visual Workflow Builder</h1>

<p align="center">
  <em>Build, execute, and manage AI agent pipelines through a visual drag-and-drop interface.<br/>Connect AI models, tools, and logic nodes into complex workflows — then run them with real-time streaming output.</em>
</p>

<p align="center">
  <img src="frontend/public/demo-builder.gif" alt="Gennaro Demo — Interface" width="720" />
</p>

<p align="center">
  <img src="frontend/public/demo-chat.gif" alt="Gennaro Demo — Chat & Workflows" width="720" />
</p>

## Features

- **Visual Workflow Builder** — Drag-and-drop canvas powered by React Flow. Create pipelines by connecting nodes with edges.
- **12 Node Types** — Agent, Tool, Condition, Input, Output, Loop, Aggregator, Meta-Agent, Chunker, Delay, Switch, Validator.
- **Multi-Provider AI** — Claude (Anthropic), GPT-4o (OpenAI), Ollama, and LM Studio local models.
- **22 Built-in Tools** — Web search, code executor, file processor, database queries, image analysis, ML pipeline, website generator, GIS analysis, file search, email search, project analyzer, email sender, web scraper, file manager, HTTP request, text transformer, notifier, JSON parser, Telegram Bot, WhatsApp, PyArchInit, QGIS Project.
- **Real-time Streaming** — Token-by-token output displayed live per node during workflow execution via WebSocket.
- **Chat Interface** — Direct conversation with AI models. Ask the chat to generate workflows automatically.
- **RAG Support** — Upload documents, auto-embed with ChromaDB, retrieve context for chat and workflows.
- **Multi-format Export** — Export workflow results as Markdown, PDF, DOCX, CSV, Excel (XLSX), GeoJSON, Shapefile, PNG, or ZIP.
- **51 Tutorial Templates** — Pre-built workflows covering common patterns (translation, code review, debate, auto-refine loops, ML pipelines, GIS analysis, archaeology, messaging, validation, etc.).
- **Analytics Dashboard** — Track token usage, costs, and model performance over time.
- **Project Management** — Organize workflows, chats, and files into projects.
- **Robustness** — Retry with exponential backoff, model fallback, error handling (stop/skip/fallback), variable store for cross-node data sharing.

## Architecture

```
modelbuilderAI/
  backend/              # FastAPI + Python
    agents/             # AI provider adapters (Claude, OpenAI, Ollama, LM Studio)
    api/                # REST endpoints (chat, workflows, projects, files, analytics, settings, scheduler)
    builder/            # Workflow engine, node registry, templates
    tools/              # 22 built-in tool implementations
    orchestrator/       # Pipeline execution, agent routing
    models/             # Pydantic models
    storage/            # SQLite (async), ChromaDB vector store
    websocket/          # WebSocket connection manager
    scheduler/          # Scheduled workflow execution
  frontend/             # React 19 + TypeScript + Vite
    src/
      components/       # UI components (builder, chat, settings, tutorial, analytics)
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
git clone https://github.com/enzococca/modelbuilderAI.git
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

# Optional — Local models
OLLAMA_BASE_URL=http://localhost:11434
LMSTUDIO_BASE_URL=http://localhost:1234

# Optional — Database & storage
DATABASE_URL=sqlite+aiosqlite:///./data/db/gennaro.db
CHROMA_PATH=./data/vectors
UPLOAD_PATH=./data/uploads

# Optional — Email sending (Resend, 100 free/day)
RESEND_API_KEY=re_...
RESEND_FROM=Gennaro <onboarding@resend.dev>

# Optional — Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdef...

# Optional — WhatsApp Business
WHATSAPP_TOKEN=EAAx...
WHATSAPP_PHONE_NUMBER_ID=1234567890
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
- **Chat** tab: Direct AI conversation (also generates workflows on request)
- **Tutorial** tab: Interactive guide with 34 step-by-step tutorials
- **Analytics** tab: Usage tracking and cost monitoring
- **Settings** tab: API keys, local models, Telegram/WhatsApp/Resend configuration

## Usage

### Building a Workflow

1. Drag nodes from the left palette onto the canvas
2. Connect nodes by dragging from output handles to input handles
3. Click a node to configure it (model, prompt, tool settings, etc.)
4. Click **Save**, then **Run**
5. Watch results stream in real-time in the results panel
6. Export results in your preferred format (PDF, DOCX, CSV, XLSX, Markdown, GeoJSON, PNG, ZIP)

### Node Types

| Node | Purpose |
|------|---------|
| **Input** | Entry point — text, file upload, URL, email, API, variable, database query |
| **Agent** | Call an AI model with a system prompt (supports model fallback) |
| **Tool** | Run one of 22 built-in tools (web search, code execution, GIS, etc.) |
| **Condition** | If/else branching based on content, score, regex, length |
| **Output** | Final result with format hint (markdown, JSON, map, HTML, PDF, CSV) |
| **Loop** | Generate-critique loop with configurable exit conditions |
| **Aggregator** | Merge parallel branches (concatenate, summarize, custom template) |
| **Meta-Agent** | Execute a nested sub-workflow recursively (max depth configurable) |
| **Chunker** | Split long text into chunks, process each with an agent, then aggregate |
| **Delay** | Pause N seconds between nodes (rate limiting, wait) |
| **Switch** | Multi-way branching (N outputs based on keyword/regex/score match) |
| **Validator** | AI-powered quality gate with pass/fail branching (configurable strictness) |

### Built-in Tools (22)

| Tool | Description |
|------|-------------|
| **Web Search** | Search the web, return text results |
| **Code Executor** | Run Python/JavaScript/Bash in sandbox (numpy, pandas, matplotlib, plotly, sklearn) |
| **File Processor** | Parse PDF, DOCX, CSV, and other documents |
| **Database Query** | SQL queries on SQLite, PostgreSQL, MySQL, MongoDB |
| **Image Analysis** | Analyze images with vision AI models |
| **ML Pipeline** | Train, predict, evaluate ML models (Random Forest, Gradient Boosting, Linear, SVM, KNN) |
| **Website Generator** | Generate HTML/CSS/JS websites as downloadable ZIP |
| **GIS Analysis** | Geospatial analysis: shapefiles, geopackages, GeoTIFF, DEM, interactive maps |
| **File Search** | Search files on local PC, Dropbox, Google Drive, OneDrive |
| **Email Search** | Search emails on Gmail, Outlook, IMAP |
| **Project Analyzer** | Analyze software project structure, dependencies, key files |
| **Email Sender** | Send emails via SMTP, Gmail, Outlook, or Resend API |
| **Web Scraper** | Scrape web pages: text, links, tables, CSS selectors |
| **File Manager** | Manage local files: create, read, write, copy, move, delete |
| **HTTP Request** | Call REST APIs: GET, POST, PUT, DELETE, PATCH with auth and headers |
| **Text Transformer** | Transform text without AI: regex, split, join, template, case, count |
| **Notifier** | Send notifications: Slack, Discord, Telegram, webhook |
| **JSON Parser** | Parse JSON: extract fields, filter, flatten, convert to CSV |
| **Telegram Bot** | Telegram Bot API: send messages, documents, photos, get updates |
| **WhatsApp** | WhatsApp Business API: send messages, templates, documents, images |
| **PyArchInit** | Query PyArchInit archaeological databases (US, inventory, pottery, sites) |
| **QGIS Project** | Parse QGIS projects (.qgs/.qgz): layers, info, plugins, styles |

### Robustness Features

Every node supports optional error handling:

- **Retry** — Automatic retry with exponential backoff (`retryCount`, `retryDelay`)
- **Error Handling** — `onError`: stop workflow, skip node, or use fallback value
- **Model Fallback** — If the primary AI model fails, automatically switch to a backup (e.g. Claude → GPT-4o)
- **Variable Store** — Save node output as a named variable (`setVariable`), access it in other nodes with `{var:name}`
- **Workflow Timeout** — Global timeout for the entire workflow (default 300s)

### Chat-to-Workflow

In the Chat tab, ask the AI to build a workflow:

> "Create a workflow that takes a topic, searches the web for it, then writes a summary"

The AI generates a `workflow` JSON block that you can validate and load directly into the Builder with one click.

### Tutorial Templates (51)

The left palette includes 51 ready-to-use templates organized by complexity:

| # | Template | Pattern |
|---|----------|---------|
| 1-9 | Basic pipelines, translation, web research, code review, debate, RAG, archaeology, auto-refine, content factory | Sequential, Parallel, Loop |
| 10-12 | Validation, model fallback, quality gate | Condition, Loop |
| 13-17 | ML pipeline, website generator, chunker, meta-agent, GIS analysis | Advanced tools |
| 18-20 | Document task extraction, project analyzer, parallel analysis | File tools |
| 21-25 | Web scraper, file manager, HTTP API, text transform, notifier | New tools |
| 26-29 | Delay + rate limiting, switch routing, switch+delay combo, triple pipeline | Flow control |
| 30-37 | Archaeology: stratigraphy, pottery, inventory, multi-site, pipeline, statistics, maps, buffer | PyArchInit + GIS |
| 38-39 | Email report, Plotly dashboard | Email + visualization |
| 40-46 | Input types: text, file, URL, email, API, variable, database | Input variations |
| 47-50 | Telegram bot, WhatsApp, PyArchInit analysis, QGIS project | Messaging + GIS |
| 51 | Validator quality gate | AI validation with pass/fail |

## Local Models

Gennaro supports **Ollama** and **LM Studio** for running models locally with zero cost and full privacy:

1. Install [Ollama](https://ollama.ai) and pull a model: `ollama pull llama3`
2. Set `OLLAMA_BASE_URL=http://localhost:11434` in `.env` (or configure in Settings)
3. Local models appear in the Settings tab and model dropdowns
4. Supported Ollama models: Llama 3.3, Mistral, CodeLlama, Gemma 2, Phi-3, Qwen 2.5

## Settings

Configure everything from the **Settings** tab in the UI:

- **Local Models** — Ollama and LM Studio URLs with connection testing
- **API Keys** — Anthropic, OpenAI, Google (masked for security)
- **Cloud Storage** — Dropbox, Google Drive, Microsoft OneDrive
- **Email Search** — Gmail OAuth, IMAP
- **Email Sending** — Resend API (100 free emails/day)
- **Telegram Bot** — Bot token (create via @BotFather)
- **WhatsApp Business** — Access token and Phone Number ID

All settings are persisted and API keys are stored securely.

## API Documentation

With the backend running, visit **http://localhost:8000/docs** for the auto-generated Swagger UI.

Key endpoints:
- `POST /api/chat` — Non-streaming chat
- `POST /api/chat/stream` — SSE streaming chat
- `POST /api/workflows/{id}/run` — Execute a workflow
- `POST /api/workflows/{id}/export?format=pdf|docx|csv|xlsx|markdown|geojson|shapefile|png|zip` — Export results
- `GET /api/settings` — Read settings (masked keys)
- `PUT /api/settings` — Update settings
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
| Messaging | Resend (email), Telegram Bot API, WhatsApp Business API |
| GIS | GeoPandas, Rasterio, Fiona, Folium |
| ML | scikit-learn (Random Forest, Gradient Boosting, Linear, SVM, KNN) |

## License

MIT
