# GENNARO — AI Agent Orchestrator & Model Builder

## Panoramica del Progetto

**Gennaro** è una piattaforma di orchestrazione AI con interfaccia React che permette di costruire pipeline di agenti, combinare modelli diversi (Claude, GPT, Gemini), e gestire workflow complessi — ispirato a NotebookLM/AI ma con capacità di orchestrazione multi-agente.

---

## 🏗️ Architettura

```
gennaro/
├── backend/                     # FastAPI Python backend
│   ├── main.py                  # Entry point FastAPI
│   ├── config.py                # Configurazione API keys e settings
│   ├── requirements.txt         # Dipendenze Python
│   ├── agents/                  # Core Agent System
│   │   ├── __init__.py
│   │   ├── base_agent.py        # Classe base astratta per tutti gli agenti
│   │   ├── claude_agent.py      # Agente Claude (Opus, Sonnet, Haiku)
│   │   ├── openai_agent.py      # Agente OpenAI (GPT-4o, GPT-4-turbo, o1, o3)
│   │   ├── gemini_agent.py      # Agente Google Gemini (opzionale)
│   │   └── local_agent.py       # Agente per modelli locali via Ollama
│   ├── orchestrator/            # Orchestrazione e Pipeline
│   │   ├── __init__.py
│   │   ├── orchestrator.py      # Engine principale di orchestrazione
│   │   ├── pipeline.py          # Definizione e esecuzione pipeline
│   │   ├── router.py            # Routing intelligente tra agenti
│   │   └── memory.py            # Memoria condivisa tra agenti
│   ├── builder/                 # Model Builder / Workflow Designer
│   │   ├── __init__.py
│   │   ├── workflow_engine.py   # Esecuzione workflow definiti dall'utente
│   │   ├── node_registry.py     # Registry dei nodi disponibili
│   │   └── templates.py         # Template predefiniti per workflow
│   ├── tools/                   # Strumenti disponibili per gli agenti
│   │   ├── __init__.py
│   │   ├── web_search.py        # Ricerca web
│   │   ├── file_processor.py    # Lettura/scrittura file (PDF, DOCX, CSV, etc.)
│   │   ├── code_executor.py     # Esecuzione codice sandboxed
│   │   ├── database_tool.py     # Query database
│   │   └── image_tool.py        # Generazione/analisi immagini
│   ├── models/                  # Pydantic models
│   │   ├── __init__.py
│   │   ├── agent_models.py      # Modelli dati agenti
│   │   ├── workflow_models.py   # Modelli dati workflow
│   │   ├── chat_models.py       # Modelli dati chat/conversazione
│   │   └── project_models.py    # Modelli dati progetto
│   ├── storage/                 # Persistenza dati
│   │   ├── __init__.py
│   │   ├── database.py          # SQLite/PostgreSQL con SQLAlchemy
│   │   ├── vector_store.py      # Vector store per RAG (ChromaDB)
│   │   └── file_store.py        # Storage file uploadati
│   ├── api/                     # Route API
│   │   ├── __init__.py
│   │   ├── chat.py              # Endpoint chat e streaming
│   │   ├── agents.py            # CRUD agenti
│   │   ├── workflows.py         # CRUD workflow/pipeline
│   │   ├── projects.py          # Gestione progetti
│   │   └── files.py             # Upload/download file
│   └── websocket/               # WebSocket per real-time
│       ├── __init__.py
│       └── handlers.py          # Handler WebSocket per streaming
│
├── frontend/                    # React Frontend (Vite + TypeScript)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx           # Sidebar navigazione progetti
│       │   │   ├── Header.tsx            # Header con switch modelli
│       │   │   └── MainLayout.tsx        # Layout principale
│       │   ├── chat/
│       │   │   ├── ChatPanel.tsx         # Pannello chat principale
│       │   │   ├── MessageBubble.tsx     # Singolo messaggio
│       │   │   ├── StreamingMessage.tsx  # Messaggio in streaming
│       │   │   ├── ModelSelector.tsx     # Selettore modello AI
│       │   │   └── ChatInput.tsx         # Input con upload file
│       │   ├── builder/
│       │   │   ├── WorkflowCanvas.tsx    # Canvas drag-and-drop (React Flow)
│       │   │   ├── NodePalette.tsx       # Palette nodi disponibili
│       │   │   ├── AgentNode.tsx         # Nodo agente nel canvas
│       │   │   ├── ToolNode.tsx          # Nodo tool nel canvas
│       │   │   ├── ConditionNode.tsx     # Nodo condizionale
│       │   │   ├── OutputNode.tsx        # Nodo output
│       │   │   └── NodeConfig.tsx        # Pannello configurazione nodo
│       │   ├── orchestrator/
│       │   │   ├── PipelineView.tsx      # Vista pipeline in esecuzione
│       │   │   ├── AgentCard.tsx         # Card singolo agente
│       │   │   ├── ExecutionLog.tsx      # Log esecuzione real-time
│       │   │   └── ResultsPanel.tsx      # Pannello risultati
│       │   ├── projects/
│       │   │   ├── ProjectList.tsx       # Lista progetti
│       │   │   ├── ProjectDetail.tsx     # Dettaglio progetto
│       │   │   └── SourceManager.tsx     # Gestione fonti/documenti
│       │   └── common/
│       │       ├── FileUpload.tsx        # Upload file drag-and-drop
│       │       ├── CodeBlock.tsx         # Rendering codice con highlight
│       │       ├── MarkdownRenderer.tsx  # Rendering markdown
│       │       └── LoadingSpinner.tsx    # Spinner/skeleton
│       ├── hooks/
│       │   ├── useChat.ts               # Hook gestione chat + streaming
│       │   ├── useWebSocket.ts          # Hook WebSocket
│       │   ├── useWorkflow.ts           # Hook gestione workflow
│       │   └── useAgents.ts             # Hook gestione agenti
│       ├── stores/                      # Zustand state management
│       │   ├── chatStore.ts
│       │   ├── projectStore.ts
│       │   ├── workflowStore.ts
│       │   └── settingsStore.ts
│       ├── services/
│       │   ├── api.ts                   # Client API (axios/fetch)
│       │   └── websocket.ts             # Client WebSocket
│       ├── types/
│       │   └── index.ts                 # TypeScript types
│       └── utils/
│           └── helpers.ts
│
├── data/                        # Directory dati persistenti
│   ├── db/                      # Database SQLite
│   ├── uploads/                 # File uploadati
│   ├── vectors/                 # ChromaDB vector store
│   └── exports/                 # File esportati
│
├── TASK.md                      # Questo file
├── start.sh                     # Script avvio
├── docker-compose.yml           # Docker compose (opzionale)
├── .env.example                 # Template variabili ambiente
└── README.md                    # Documentazione
```

---

## 📋 TASK LIST — Ordine di Implementazione

### FASE 1: Fondamenta Backend (Priority: 🔴 CRITICA)

#### Task 1.1 — Setup Progetto e Configurazione
- [ ] Creare struttura directory completa
- [ ] Creare `backend/requirements.txt` con dipendenze:
  ```
  fastapi>=0.110.0
  uvicorn[standard]>=0.27.0
  anthropic>=0.40.0
  openai>=1.50.0
  python-dotenv>=1.0.0
  pydantic>=2.5.0
  pydantic-settings>=2.1.0
  sqlalchemy>=2.0.0
  aiosqlite>=0.19.0
  chromadb>=0.4.0
  websockets>=12.0
  python-multipart>=0.0.9
  aiofiles>=23.0
  httpx>=0.27.0
  sse-starlette>=2.0.0
  ```
- [ ] Creare `.env.example`:
  ```env
  ANTHROPIC_API_KEY=sk-ant-...
  OPENAI_API_KEY=sk-...
  GOOGLE_API_KEY=...  # opzionale
  DATABASE_URL=sqlite+aiosqlite:///./data/db/gennaro.db
  CHROMA_PATH=./data/vectors
  UPLOAD_PATH=./data/uploads
  HOST=0.0.0.0
  PORT=8000
  CORS_ORIGINS=http://localhost:5173
  ```
- [ ] Creare `backend/config.py` con Pydantic Settings

#### Task 1.2 — Sistema Agenti Base
- [ ] `base_agent.py` — Classe astratta `BaseAgent`:
  ```python
  class BaseAgent(ABC):
      name: str
      model: str
      system_prompt: str
      tools: list[Tool]
      temperature: float
      max_tokens: int
      
      @abstractmethod
      async def chat(self, messages, stream=False) -> AsyncGenerator
      
      @abstractmethod
      async def chat_with_tools(self, messages, tools) -> AgentResponse
  ```
- [ ] `claude_agent.py` — Implementazione per Claude:
  - Modelli supportati: `claude-opus-4-5-20250929`, `claude-sonnet-4-5-20250514`, `claude-haiku-4-5-20251001`
  - Supporto streaming via SSE
  - Supporto tool use nativo
  - Supporto extended thinking (per Sonnet)
  - Gestione conversation memory
- [ ] `openai_agent.py` — Implementazione per OpenAI:
  - Modelli: `gpt-4o`, `gpt-4-turbo`, `gpt-4o-mini`, `o1`, `o3-mini`
  - Streaming via SSE
  - Function calling
  - Vision support
- [ ] `local_agent.py` — Wrapper per Ollama (modelli locali):
  - Supporto qualsiasi modello Ollama installato
  - Fallback quando API non disponibili

#### Task 1.3 — Orchestratore Core
- [ ] `orchestrator.py` — Engine di orchestrazione:
  - **Sequential**: agenti eseguiti in sequenza, output → input
  - **Parallel**: agenti eseguiti in parallelo, risultati aggregati
  - **Router**: routing dinamico basato su contenuto/intent
  - **Loop**: cicli con condizione di uscita
  - **Debate**: due agenti discutono, un terzo giudica
  ```python
  class Orchestrator:
      async def run_sequential(agents, input) -> Result
      async def run_parallel(agents, input) -> list[Result]
      async def run_router(router_agent, specialist_agents, input) -> Result
      async def run_debate(agent_a, agent_b, judge, topic, rounds) -> Result
      async def run_pipeline(pipeline: Pipeline) -> PipelineResult
  ```
- [ ] `pipeline.py` — Sistema pipeline:
  - Definizione pipeline come DAG (Directed Acyclic Graph)
  - Serializzazione/deserializzazione JSON
  - Validazione pipeline prima dell'esecuzione
- [ ] `memory.py` — Memoria condivisa:
  - Short-term: contesto conversazione corrente
  - Long-term: vector store (ChromaDB) per RAG
  - Shared: stato condiviso tra agenti nella pipeline
- [ ] `router.py` — Router intelligente:
  - Classificazione intent con LLM leggero
  - Routing basato su regole + AI
  - Load balancing tra modelli

#### Task 1.4 — API REST e WebSocket
- [ ] `api/chat.py`:
  - `POST /api/chat` — Chat singola con modello scelto
  - `POST /api/chat/stream` — Chat con streaming SSE
  - `POST /api/chat/multi` — Chat con orchestrazione multi-agente
  - `GET /api/chat/history/{project_id}` — Storico chat
- [ ] `api/agents.py`:
  - `GET /api/agents` — Lista agenti disponibili
  - `POST /api/agents` — Crea agente custom
  - `PUT /api/agents/{id}` — Modifica agente
  - `DELETE /api/agents/{id}` — Elimina agente
  - `GET /api/agents/models` — Lista modelli disponibili per provider
- [ ] `api/workflows.py`:
  - `GET /api/workflows` — Lista workflow
  - `POST /api/workflows` — Crea workflow
  - `POST /api/workflows/{id}/run` — Esegui workflow
  - `GET /api/workflows/{id}/status` — Stato esecuzione
- [ ] `api/projects.py`:
  - CRUD completo progetti
  - Gestione fonti/documenti per progetto
- [ ] `api/files.py`:
  - Upload file (PDF, DOCX, CSV, immagini, etc.)
  - Indicizzazione automatica in vector store
  - Download risultati
- [ ] `websocket/handlers.py`:
  - Streaming real-time output agenti
  - Notifiche stato pipeline
  - Log esecuzione live

#### Task 1.5 — Storage e Database
- [ ] `storage/database.py`:
  - Schema SQLAlchemy: projects, conversations, messages, agents, workflows, files
  - Migrations con Alembic (opzionale)
- [ ] `storage/vector_store.py`:
  - ChromaDB per embedding documenti
  - Chunking intelligente per RAG
  - Ricerca semantica
- [ ] `storage/file_store.py`:
  - Gestione upload con deduplica
  - Parsing automatico (PDF→text, DOCX→text, etc.)

---

### FASE 2: Frontend React (Priority: 🔴 CRITICA)

#### Task 2.1 — Setup Frontend
- [ ] Inizializzare progetto con Vite + React + TypeScript
- [ ] Installare dipendenze:
  ```
  @reactflow/core, @reactflow/background, @reactflow/controls, @reactflow/minimap
  zustand
  axios
  react-markdown
  react-syntax-highlighter
  lucide-react
  tailwindcss
  @radix-ui/react-*  (dialog, dropdown, tabs, tooltip, etc.)
  framer-motion
  ```
- [ ] Configurare Tailwind con tema custom (dark mode default)
- [ ] Setup routing con React Router

#### Task 2.2 — Layout e Navigazione
- [ ] `MainLayout.tsx` — Layout a 3 pannelli:
  - Sidebar sinistra: progetti, conversazioni, navigazione
  - Centro: area di lavoro principale (chat o builder)
  - Destra (collapsible): configurazione, log, risultati
- [ ] `Sidebar.tsx`:
  - Lista progetti con ricerca
  - Nuovo progetto
  - Accesso rapido a workflow salvati
  - Settings
- [ ] `Header.tsx`:
  - Switch tra modalità: Chat / Builder / Orchestrator
  - Selettore modello rapido
  - Indicatore stato connessione

#### Task 2.3 — Pannello Chat (stile NotebookLM)
- [ ] `ChatPanel.tsx`:
  - Conversazione con supporto multi-modello
  - Switch modello in-line durante la conversazione
  - Riferimento a fonti/documenti del progetto
  - Citazioni inline con link alle fonti
- [ ] `ModelSelector.tsx`:
  - Dropdown con tutti i modelli disponibili raggruppati per provider
  - Badge con costo stimato per token
  - Indicatore latenza media
- [ ] `ChatInput.tsx`:
  - Textarea auto-resize
  - Upload file drag-and-drop
  - Menzioni @agente per indirizzare specifici agenti
  - Slash commands (/workflow, /compare, /debate)
- [ ] `StreamingMessage.tsx`:
  - Rendering incrementale markdown
  - Syntax highlighting per codice
  - Rendering LaTeX per formule
  - Indicatore "thinking" per modelli con reasoning
- [ ] `SourceManager.tsx`:
  - Upload e gestione documenti del progetto
  - Preview documenti
  - Tag e categorizzazione

#### Task 2.4 — Workflow Builder (Visual Canvas)
- [ ] `WorkflowCanvas.tsx` con React Flow:
  - Canvas infinito con zoom/pan
  - Drag-and-drop nodi dalla palette
  - Connessioni tra nodi con validazione
  - Mini-map per navigazione
  - Salvataggio/caricamento workflow
- [ ] Nodi disponibili:
  - `AgentNode.tsx` — Nodo agente (configurabile: modello, prompt, tools)
  - `ToolNode.tsx` — Nodo tool (web search, file read, code exec, etc.)
  - `ConditionNode.tsx` — Branch condizionale
  - `OutputNode.tsx` — Output finale (testo, file, etc.)
  - `InputNode.tsx` — Input iniziale (testo, file, variabili)
  - `LoopNode.tsx` — Ciclo con condizione
  - `AggregatorNode.tsx` — Aggregazione risultati paralleli
- [ ] `NodeConfig.tsx`:
  - Pannello laterale configurazione per nodo selezionato
  - System prompt editor con syntax highlighting
  - Selettore tools disponibili
  - Configurazione parametri (temperature, max_tokens, etc.)
- [ ] `NodePalette.tsx`:
  - Palette categorizzata dei nodi
  - Ricerca nodi
  - Template nodi preconfigurati

#### Task 2.5 — Vista Orchestratore
- [ ] `PipelineView.tsx`:
  - Visualizzazione pipeline in esecuzione
  - Stato real-time di ogni nodo (waiting → running → done/error)
  - Flusso dati visibile tra nodi
- [ ] `ExecutionLog.tsx`:
  - Log real-time con filtri per agente/severità
  - Tempo di esecuzione per step
  - Token utilizzati per step
  - Costo stimato
- [ ] `ResultsPanel.tsx`:
  - Output finale formattato
  - Confronto output di agenti diversi (side by side)
  - Export risultati (MD, PDF, JSON)

#### Task 2.6 — State Management (Zustand)
- [ ] `chatStore.ts` — Stato chat: messaggi, conversazioni, streaming
- [ ] `projectStore.ts` — Stato progetti: CRUD, fonti, settings
- [ ] `workflowStore.ts` — Stato workflow: nodi, connessioni, esecuzione
- [ ] `settingsStore.ts` — Settings globali: API keys, preferenze UI, tema

---

### FASE 3: Funzionalità Avanzate (Priority: 🟡 IMPORTANTE)

#### Task 3.1 — Template Workflow Predefiniti
- [ ] **Research Assistant**: Web search → Analisi → Sintesi → Report
- [ ] **Code Review Pipeline**: Analisi codice → Bug detection → Suggerimenti → Refactor
- [ ] **Document Analyzer**: Upload PDF → Estrazione → Riassunto → Q&A
- [ ] **Debate Mode**: Due agenti argomentano → Judge decide
- [ ] **Translation Pipeline**: Traduzione → Review → Quality check
- [ ] **Archaeological Analysis**: Classificazione → Confronto → Report (custom per PyArchInit)

#### Task 3.2 — RAG (Retrieval Augmented Generation)
- [ ] Chunking intelligente documenti uploadati
- [ ] Embedding con modello locale o API
- [ ] Ricerca semantica con ChromaDB
- [ ] Iniezione contesto automatica nelle chat
- [ ] Citazioni con riferimento a chunk specifici

#### Task 3.3 — Strumenti Agenti
- [ ] `web_search.py` — Ricerca web con parsing risultati
- [ ] `code_executor.py` — Esecuzione Python sandboxed
- [ ] `file_processor.py` — Parsing multi-formato
- [ ] `database_tool.py` — Query SQL con risultati formattati
- [ ] `image_tool.py` — Analisi immagini (vision) e generazione

#### Task 3.4 — Monitoraggio e Analytics
- [ ] Dashboard uso token per modello
- [ ] Costi stimati per progetto
- [ ] Performance comparison tra modelli
- [ ] History esecuzioni workflow

---

### FASE 4: Polish e Extra (Priority: 🟢 NICE TO HAVE)

- [ ] Dark/Light mode toggle
- [ ] Export progetti completi
- [ ] Import/Export workflow come JSON
- [ ] Keyboard shortcuts
- [ ] Collaborative editing (WebSocket)
- [ ] Plugin system per tools custom
- [ ] Docker compose per deploy
- [ ] Autenticazione utente (opzionale)
- [ ] Mobile responsive

---

## ⚙️ Configurazione Modelli

### Claude (Anthropic)
| Modello | ID | Use Case |
|---------|-----|----------|
| Claude Opus 4.5 | `claude-opus-4-5-20250929` | Task complessi, ragionamento profondo |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250514` | Bilanciato, coding, analisi |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Veloce, classificazione, routing |

### OpenAI
| Modello | ID | Use Case |
|---------|-----|----------|
| GPT-4o | `gpt-4o` | Multimodale, general purpose |
| GPT-4o mini | `gpt-4o-mini` | Veloce, economico |
| o1 | `o1` | Ragionamento avanzato |
| o3-mini | `o3-mini` | Ragionamento economico |

### Locali (via Ollama)
| Modello | Use Case |
|---------|----------|
| llama3.2 | General purpose locale |
| codellama | Coding locale |
| mistral | Europeo, multilingue |

---

## 🎯 Pattern di Orchestrazione

### 1. Sequential Chain
```
[Input] → [Agent A] → [Agent B] → [Agent C] → [Output]
```
Ogni agente riceve l'output del precedente.

### 2. Parallel Fan-out
```
            ┌→ [Agent A] →┐
[Input] → ─┼→ [Agent B] →─┼→ [Aggregator] → [Output]
            └→ [Agent C] →┘
```
Stessi dati a più agenti, risultati aggregati.

### 3. Router
```
                ┌→ [Specialist A] →┐
[Input] → [Router] →─────────────→─┼→ [Output]
                └→ [Specialist B] →┘
```
Router decide quale specialista usare.

### 4. Debate
```
[Topic] → [Agent A] ↔ [Agent B] → [Judge] → [Verdict]
```
Due agenti discutono, un giudice sintetizza.

### 5. Loop with Refinement
```
[Input] → [Generator] → [Critic] → {pass?} → [Output]
                ↑            │ no
                └────────────┘
```
Generazione iterativa con auto-critica.

---

## 📝 Note Tecniche

- **Streaming**: Usare SSE (Server-Sent Events) per streaming chat, WebSocket per stato pipeline
- **Error handling**: Retry con backoff esponenziale per API calls, fallback tra modelli
- **Rate limiting**: Rispettare limiti API di ogni provider, queue interna
- **Caching**: Cache risposte per query identiche (opzionale, configurabile)
- **Security**: API keys solo nel backend, mai esposte al frontend
- **Persistenza**: SQLite per sviluppo, PostgreSQL per produzione

---

## 🚀 Quick Start

```bash
# 1. Clona e setup
./start.sh

# 2. Configura API keys in .env

# 3. Apri http://localhost:5173
```
