#!/bin/bash
# ============================================================
#  🔄 RALPH-LOOP — One-Shot Setup & Launch for macOS
#  Configura tutto e lancia il loop autonomo di sviluppo
# ============================================================

set -e

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================================
#  Fix PATH per macOS — include ~/.local/bin dove Ralph si installa
# ============================================================
export PATH="$HOME/.local/bin:$PATH"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# ============================================================
#  CONFIGURAZIONE — Modifica questi valori se necessario
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${1:-$SCRIPT_DIR}"                # Directory progetto = stessa dir dello script
TASK_FILE="${2:-$SCRIPT_DIR/TASK.md}"          # TASK.md nella stessa dir dello script
MAX_CALLS=200                                  # Max chiamate API per ora
TIMEOUT_MINUTES=60                             # Timeout per iterazione (minuti)
SESSION_EXPIRY=48                              # Ore prima che la sessione scada
CB_NO_PROGRESS=5                               # Circuit breaker: loop senza progresso
CB_SAME_ERROR=8                                # Circuit breaker: stesso errore ripetuto

# ============================================================
#  Banner
# ============================================================
clear
echo -e "${CYAN}${BOLD}"
cat << 'BANNER'
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🔄  RALPH-LOOP — AI Orchestrator Builder         ║
║          One-Shot Setup & Autonomous Launch                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

# ============================================================
#  Funzioni
# ============================================================
log_info()  { echo -e "  ${BLUE}▸${NC} $1"; }
log_ok()    { echo -e "  ${GREEN}✔${NC} $1"; }
log_warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "  ${RED}✘${NC} $1"; }
log_step()  { echo -e "\n${BOLD}${CYAN}[$1]${NC} ${BOLD}$2${NC}\n"; }

die() { log_error "$1"; exit 1; }

# ============================================================
#  STEP 0 — Verifica prerequisiti macOS
# ============================================================
log_step "0/7" "Verifica prerequisiti macOS"

# Homebrew
if ! command -v brew &>/dev/null; then
    log_warn "Homebrew non trovato. Installazione..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
log_ok "Homebrew"

# Node.js
if ! command -v node &>/dev/null; then
    log_warn "Node.js non trovato. Installazione..."
    brew install node
fi
log_ok "Node.js $(node -v)"

# Python
if ! command -v python3 &>/dev/null; then
    log_warn "Python3 non trovato. Installazione..."
    brew install python@3.12
fi
log_ok "Python $(python3 --version | cut -d' ' -f2)"

# tmux
if ! command -v tmux &>/dev/null; then
    log_info "Installazione tmux..."
    brew install tmux
fi
log_ok "tmux"

# jq
if ! command -v jq &>/dev/null; then
    log_info "Installazione jq..."
    brew install jq
fi
log_ok "jq"

# GNU coreutils (per gtimeout su macOS)
if ! command -v gtimeout &>/dev/null; then
    log_info "Installazione GNU coreutils (per timeout)..."
    brew install coreutils
fi
log_ok "GNU coreutils (gtimeout)"

# Claude Code CLI
if ! command -v claude &>/dev/null; then
    log_warn "Claude Code CLI non trovato. Installazione..."
    npm install -g @anthropic-ai/claude-code
fi
log_ok "Claude Code CLI $(claude --version 2>/dev/null || echo 'installed')"

# Ralph
if ! command -v ralph &>/dev/null; then
    log_warn "Ralph non trovato globalmente — controllo plugin PyCharm..."
    # Cerca ralph nel path tipico dei plugin PyCharm
    PYCHARM_RALPH=$(find ~/Library/Application\ Support/JetBrains -name "ralph_loop.sh" 2>/dev/null | head -1)
    if [ -n "$PYCHARM_RALPH" ]; then
        RALPH_CMD="bash $PYCHARM_RALPH"
        log_ok "Ralph trovato come plugin PyCharm: $PYCHARM_RALPH"
    else
        log_info "Installazione Ralph da GitHub..."
        RALPH_TEMP=$(mktemp -d)
        git clone --depth 1 https://github.com/frankbria/ralph-claude-code.git "$RALPH_TEMP"
        cd "$RALPH_TEMP" && ./install.sh
        cd -
        rm -rf "$RALPH_TEMP"
        RALPH_CMD="ralph"
        log_ok "Ralph installato globalmente"
    fi
else
    RALPH_CMD="ralph"
    log_ok "Ralph $(ralph --version 2>/dev/null || echo 'installed')"
fi

# ============================================================
#  STEP 1 — Crea struttura progetto
# ============================================================
log_step "1/7" "Creazione struttura progetto: $PROJECT_DIR"

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Cartelle principali
mkdir -p backend/{agents,orchestrator,builder,tools,models,storage,api,websocket}
mkdir -p frontend/src/{components/{layout,chat,builder,orchestrator,projects,common},hooks,stores,services,types,utils}
mkdir -p data/{db,uploads,vectors,exports}
mkdir -p .ralph/{specs,logs,docs/generated}

# __init__.py per tutti i package Python
for dir in agents orchestrator builder tools models storage api websocket; do
    touch "backend/$dir/__init__.py"
done

log_ok "Struttura directory creata"

# ============================================================
#  STEP 2 — Copia/Genera TASK.md
# ============================================================
log_step "2/7" "Setup TASK.md"

# Cerca il TASK.md (stessa directory dello script)
if [ -f "$TASK_FILE" ]; then
    cp "$TASK_FILE" "$PROJECT_DIR/TASK.md" 2>/dev/null || true
    log_ok "TASK.md trovato in $(dirname "$TASK_FILE")"
else
    die "TASK.md non trovato in $SCRIPT_DIR!"
fi

# ============================================================
#  STEP 3 — Genera .ralph/PROMPT.md dal TASK.md
# ============================================================
log_step "3/7" "Generazione .ralph/PROMPT.md"

cat > .ralph/PROMPT.md << 'PROMPTEOF'
# Ralph-Loop — AI Agent Orchestrator & Model Builder

## Istruzioni per Ralph

Stai sviluppando **ralph-loop**, una piattaforma di orchestrazione AI multi-agente con:
- Backend **FastAPI** (Python) con agenti Claude, GPT, Gemini, Ollama
- Frontend **React** (Vite + TypeScript + Tailwind + React Flow)
- Sistema di orchestrazione: Sequential, Parallel, Router, Debate, Loop
- Workflow Builder visual drag-and-drop
- RAG con ChromaDB per documenti uploadati
- Chat streaming con SSE/WebSocket

## Regole di Sviluppo

1. **Leggi TASK.md** per l'architettura completa e la lista delle task
2. **Segui le FASI in ordine** (1→2→3→4), non saltare
3. **Dopo ogni file creato**, verifica che funzioni (import, syntax, test)
4. **Committa** dopo ogni task completata con messaggio descrittivo
5. **Aggiorna .ralph/fix_plan.md** spuntando le task completate
6. **Non fermarti** finché tutte le task della fase corrente non sono complete
7. **Testa sempre** backend con `cd backend && python -m pytest` e frontend con `cd frontend && npm run build`

## Stack Tecnico

- Backend: Python 3.11+, FastAPI, Anthropic SDK, OpenAI SDK, SQLAlchemy, ChromaDB
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, React Flow, Zustand
- Database: SQLite (dev), PostgreSQL (prod)
- Streaming: SSE (chat), WebSocket (pipeline status)

## Priorità Assolute

1. Il backend DEVE avviare con `uvicorn main:app` senza errori
2. Il frontend DEVE fare build con `npm run build` senza errori
3. La chat con almeno un provider (Claude O Openai) DEVE funzionare end-to-end
4. Il workflow builder DEVE permettere drag-and-drop di nodi

## EXIT_SIGNAL

Imposta EXIT_SIGNAL: true SOLO quando:
- TUTTE le checkbox in fix_plan.md sono completate
- Backend parte senza errori
- Frontend builda senza errori
- Almeno una chat end-to-end funziona

Altrimenti imposta EXIT_SIGNAL: false e continua a lavorare.
PROMPTEOF

log_ok ".ralph/PROMPT.md generato"

# ============================================================
#  STEP 4 — Genera .ralph/fix_plan.md dal TASK.md
# ============================================================
log_step "4/7" "Generazione .ralph/fix_plan.md"

cat > .ralph/fix_plan.md << 'FIXEOF'
# Ralph-Loop — Piano di Implementazione

## FASE 1: Backend Foundation [IN PROGRESS]

### Task 1.1 — Setup e Configurazione
- [ ] Creare backend/requirements.txt con tutte le dipendenze
- [ ] Creare .env.example con template variabili
- [ ] Creare backend/config.py con Pydantic Settings
- [ ] Creare backend/main.py entry point FastAPI con CORS e health check

### Task 1.2 — Sistema Agenti
- [ ] Creare backend/agents/base_agent.py (classe astratta BaseAgent)
- [ ] Creare backend/agents/claude_agent.py (Opus, Sonnet, Haiku con streaming)
- [ ] Creare backend/agents/openai_agent.py (GPT-4o, o1, o3 con streaming)
- [ ] Creare backend/agents/local_agent.py (wrapper Ollama)

### Task 1.3 — Orchestratore Core
- [ ] Creare backend/orchestrator/orchestrator.py (sequential, parallel, router, debate, loop)
- [ ] Creare backend/orchestrator/pipeline.py (DAG pipeline system)
- [ ] Creare backend/orchestrator/memory.py (shared memory + vector store)
- [ ] Creare backend/orchestrator/router.py (intelligent routing)

### Task 1.4 — API REST e WebSocket
- [ ] Creare backend/api/chat.py (POST /api/chat, /api/chat/stream SSE)
- [ ] Creare backend/api/agents.py (CRUD agenti + lista modelli)
- [ ] Creare backend/api/workflows.py (CRUD + run workflow)
- [ ] Creare backend/api/projects.py (CRUD progetti)
- [ ] Creare backend/api/files.py (upload/download con parsing)
- [ ] Creare backend/websocket/handlers.py (streaming + notifiche pipeline)

### Task 1.5 — Storage e Database
- [ ] Creare backend/storage/database.py (SQLAlchemy schema completo)
- [ ] Creare backend/storage/vector_store.py (ChromaDB per RAG)
- [ ] Creare backend/storage/file_store.py (upload + parsing PDF/DOCX)
- [ ] Creare backend/models/ (tutti i Pydantic models)

### ✅ Verifica Fase 1
- [ ] Backend avvia con uvicorn senza errori
- [ ] GET /api/health risponde OK
- [ ] GET /api/models lista i modelli disponibili
- [ ] POST /api/chat funziona con almeno un provider

## FASE 2: Frontend React [NOT STARTED]

### Task 2.1 — Setup Frontend
- [ ] Inizializzare Vite + React + TypeScript
- [ ] Installare dipendenze (React Flow, Zustand, Tailwind, etc.)
- [ ] Configurare Tailwind con dark mode
- [ ] Setup React Router

### Task 2.2 — Layout e Navigazione
- [ ] Creare MainLayout.tsx (3 pannelli)
- [ ] Creare Sidebar.tsx (progetti + navigazione)
- [ ] Creare Header.tsx (switch modalità + model selector)

### Task 2.3 — Pannello Chat
- [ ] Creare ChatPanel.tsx con multi-modello
- [ ] Creare ModelSelector.tsx (dropdown modelli per provider)
- [ ] Creare ChatInput.tsx (textarea + upload + menzioni)
- [ ] Creare StreamingMessage.tsx (rendering incrementale markdown)
- [ ] Creare MessageBubble.tsx
- [ ] Connettere chat al backend via SSE streaming

### Task 2.4 — Workflow Builder
- [ ] Creare WorkflowCanvas.tsx con React Flow
- [ ] Creare AgentNode.tsx, ToolNode.tsx, ConditionNode.tsx, OutputNode.tsx
- [ ] Creare NodePalette.tsx (palette nodi drag-and-drop)
- [ ] Creare NodeConfig.tsx (pannello configurazione)
- [ ] Connettere builder al backend API workflows

### Task 2.5 — Vista Orchestratore
- [ ] Creare PipelineView.tsx (pipeline in esecuzione)
- [ ] Creare ExecutionLog.tsx (log real-time)
- [ ] Creare ResultsPanel.tsx (output + confronto)

### Task 2.6 — State Management
- [ ] Creare stores Zustand (chat, project, workflow, settings)
- [ ] Creare hooks custom (useChat, useWebSocket, useWorkflow, useAgents)
- [ ] Creare services API (axios client + websocket client)

### ✅ Verifica Fase 2
- [ ] Frontend builda senza errori (npm run build)
- [ ] Chat funziona end-to-end con backend
- [ ] Workflow builder drag-and-drop funziona
- [ ] Streaming messaggi funziona

## FASE 3: Funzionalità Avanzate [NOT STARTED]

- [ ] Template workflow predefiniti (Research, Code Review, Document Analyzer, Debate)
- [ ] RAG completo (chunking, embedding, ricerca semantica, citazioni)
- [ ] Tools agenti (web search, code executor, file processor, DB tool)
- [ ] Dashboard analytics (token usage, costi, performance)

## FASE 4: Polish [NOT STARTED]

- [ ] Dark/Light mode toggle
- [ ] Export/Import workflow JSON
- [ ] Keyboard shortcuts
- [ ] Docker compose
- [ ] README.md completo
FIXEOF

log_ok ".ralph/fix_plan.md generato"

# ============================================================
#  STEP 5 — Genera .ralph/AGENT.md
# ============================================================
log_step "5/7" "Generazione .ralph/AGENT.md e .ralphrc"

cat > .ralph/AGENT.md << 'AGENTEOF'
# Build & Test Commands

## Backend
```bash
cd backend
pip install -r requirements.txt --break-system-packages
python -m uvicorn main:app --reload --port 8000
python -m pytest tests/ -v
```

## Frontend
```bash
cd frontend
npm install
npm run dev -- --port 5173
npm run build
npm run lint
```

## Full Stack
```bash
# Backend
cd backend && python -m uvicorn main:app --reload --port 8000 &

# Frontend
cd frontend && npm run dev -- --port 5173 &
```
AGENTEOF

# .ralphrc
cat > .ralphrc << RCEOF
# .ralphrc — Ralph-Loop Project Configuration
PROJECT_NAME="ralph-loop"
PROJECT_TYPE="typescript"

# Loop settings — generoso per progetto grande
MAX_CALLS_PER_HOUR=${MAX_CALLS}
CLAUDE_TIMEOUT_MINUTES=${TIMEOUT_MINUTES}
CLAUDE_OUTPUT_FORMAT="json"

# Tool permissions — tutto quello che serve per full-stack dev
ALLOWED_TOOLS="Write,Read,Edit,Bash(git *),Bash(npm *),Bash(npx *),Bash(node *),Bash(pip *),Bash(pip3 *),Bash(python *),Bash(python3 *),Bash(uvicorn *),Bash(pytest *),Bash(cd *),Bash(mkdir *),Bash(cp *),Bash(mv *),Bash(cat *),Bash(ls *),Bash(find *),Bash(grep *),Bash(chmod *)"

# Session management
SESSION_CONTINUITY=true
SESSION_EXPIRY_HOURS=${SESSION_EXPIRY}

# Circuit breaker — soglie alte per progetto complesso
CB_NO_PROGRESS_THRESHOLD=${CB_NO_PROGRESS}
CB_SAME_ERROR_THRESHOLD=${CB_SAME_ERROR}
RCEOF

log_ok ".ralph/AGENT.md generato"
log_ok ".ralphrc configurato (calls=$MAX_CALLS, timeout=${TIMEOUT_MINUTES}min, session=${SESSION_EXPIRY}h)"

# ============================================================
#  STEP 6 — Setup .env
# ============================================================
log_step "6/7" "Setup variabili ambiente"

if [ ! -f .env ]; then
    cat > .env << 'ENVEOF'
# ============================================================
# RALPH-LOOP — API Keys
# ============================================================
# Aggiungi almeno una key!

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/db/ralph.db

# Storage
CHROMA_PATH=./data/vectors
UPLOAD_PATH=./data/uploads

# Server
HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_PORT=5173
CORS_ORIGINS=http://localhost:5173

# Ollama (opzionale, per modelli locali)
OLLAMA_BASE_URL=http://localhost:11434
ENVEOF

    echo ""
    echo -e "  ${YELLOW}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "  ${YELLOW}${BOLD}║  ⚠️  AGGIUNGI LE TUE API KEY IN .env !          ║${NC}"
    echo -e "  ${YELLOW}${BOLD}║                                                  ║${NC}"
    echo -e "  ${YELLOW}${BOLD}║  nano $PROJECT_DIR/.env                          ║${NC}"
    echo -e "  ${YELLOW}${BOLD}║                                                  ║${NC}"
    echo -e "  ${YELLOW}${BOLD}║  Serve almeno una di:                            ║${NC}"
    echo -e "  ${YELLOW}${BOLD}║  - ANTHROPIC_API_KEY=sk-ant-...                  ║${NC}"
    echo -e "  ${YELLOW}${BOLD}║  - OPENAI_API_KEY=sk-...                         ║${NC}"
    echo -e "  ${YELLOW}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
    echo ""

    # Chiedi se vuole inserire le key ora
    read -p "  Vuoi inserire le API key ora? (s/n): " INSERT_KEYS
    if [[ "$INSERT_KEYS" =~ ^[sS] ]]; then
        read -p "  ANTHROPIC_API_KEY (lascia vuoto per skip): " ANT_KEY
        if [ -n "$ANT_KEY" ]; then
            sed -i '' "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$ANT_KEY|" .env
            log_ok "Anthropic key salvata"
        fi

        read -p "  OPENAI_API_KEY (lascia vuoto per skip): " OAI_KEY
        if [ -n "$OAI_KEY" ]; then
            sed -i '' "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$OAI_KEY|" .env
            log_ok "OpenAI key salvata"
        fi
    fi
else
    log_ok ".env già presente"
fi

# Init git se non esiste
if [ ! -d .git ]; then
    git init -q
    cat > .gitignore << 'GITEOF'
.env
*.pyc
__pycache__/
.venv/
venv/
node_modules/
data/db/
data/uploads/
data/vectors/
data/exports/
.ralph/logs/
dist/
build/
*.egg-info/
.DS_Store
GITEOF
    git add -A
    git commit -q -m "🎉 Initial setup: ralph-loop project structure"
    log_ok "Git repo inizializzato"
else
    log_ok "Git repo già esistente"
fi

# ============================================================
#  STEP 7 — Lancia Ralph!
# ============================================================
log_step "7/7" "Lancio loop autonomo Ralph"

echo -e "${GREEN}${BOLD}"
cat << 'LAUNCH'
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀  TUTTO PRONTO! Lancio Ralph in 5 secondi...         ║
║                                                           ║
║   Ralph leggerà TASK.md e implementerà il progetto        ║
║   in modo autonomo, fase per fase.                        ║
║                                                           ║
║   📊 Monitor:  tmux (pannello destro)                     ║
║   📝 Log:      .ralph/logs/ralph.log                      ║
║   🔴 Stop:     Ctrl+C                                     ║
║   🔌 Detach:   Ctrl+B poi D (Ralph continua in background)║
║   🔗 Reattach: tmux attach -t ralph-loop                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
LAUNCH
echo -e "${NC}"

# Countdown
for i in 5 4 3 2 1; do
    echo -ne "\r  Lancio in ${BOLD}${i}${NC}... (Ctrl+C per annullare)"
    sleep 1
done
echo -e "\r  ${GREEN}${BOLD}🔄 GO!${NC}                                    "
echo ""

# Lancia Ralph con tutte le opzioni
${RALPH_CMD:-ralph} \
    --monitor \
    --calls "$MAX_CALLS" \
    --timeout "$TIMEOUT_MINUTES" \
    --verbose \
    --live
