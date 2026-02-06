#!/bin/bash
# ============================================================
#  🔄 RALPH-LOOP — Startup Script
#  AI Agent Orchestrator & Model Builder
# ============================================================

set -e

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DATA_DIR="$PROJECT_DIR/data"
VENV_DIR="$PROJECT_DIR/.venv"
ENV_FILE="$PROJECT_DIR/.env"

# ============================================================
#  Banner
# ============================================================
echo -e "${CYAN}${BOLD}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║          🔄 RALPH-LOOP                           ║"
echo "║     AI Agent Orchestrator & Model Builder         ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
#  Funzioni utility
# ============================================================
log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 non trovato. Installalo prima di procedere."
        return 1
    fi
    log_ok "$1 trovato: $(command -v $1)"
}

# ============================================================
#  1. Verifica prerequisiti
# ============================================================
echo -e "\n${BOLD}📋 Verifica prerequisiti...${NC}\n"

check_command python3 || exit 1
check_command node    || exit 1
check_command npm     || exit 1

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
NODE_VERSION=$(node -v | sed 's/v//')
log_info "Python $PYTHON_VERSION | Node $NODE_VERSION"

if [[ $(echo "$PYTHON_VERSION < 3.10" | bc -l 2>/dev/null || python3 -c "print(1 if $PYTHON_VERSION < 3.10 else 0)") == "1" ]]; then
    log_error "Python 3.10+ richiesto (trovato $PYTHON_VERSION)"
    exit 1
fi

# ============================================================
#  2. Crea struttura directory
# ============================================================
echo -e "\n${BOLD}📁 Creazione struttura progetto...${NC}\n"

# Directory dati
mkdir -p "$DATA_DIR"/{db,uploads,vectors,exports}

# Backend
mkdir -p "$BACKEND_DIR"/{agents,orchestrator,builder,tools,models,storage,api,websocket}

# Crea __init__.py per tutti i package
for dir in agents orchestrator builder tools models storage api websocket; do
    touch "$BACKEND_DIR/$dir/__init__.py"
done

log_ok "Struttura directory creata"

# ============================================================
#  3. Setup .env
# ============================================================
if [ ! -f "$ENV_FILE" ]; then
    echo -e "\n${BOLD}🔑 Creazione file .env...${NC}\n"
    cat > "$ENV_FILE" << 'ENVEOF'
# ============================================================
# RALPH-LOOP — Configurazione
# ============================================================

# === API Keys (OBBLIGATORIO: almeno uno) ===
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# === Opzionali ===
GOOGLE_API_KEY=

# === Database ===
DATABASE_URL=sqlite+aiosqlite:///./data/db/ralph.db

# === Storage ===
CHROMA_PATH=./data/vectors
UPLOAD_PATH=./data/uploads

# === Server ===
HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_PORT=5173
CORS_ORIGINS=http://localhost:5173

# === Opzionale: Ollama per modelli locali ===
OLLAMA_BASE_URL=http://localhost:11434
ENVEOF
    log_warn "File .env creato. Modifica con le tue API key!"
    echo -e "${YELLOW}"
    echo "  ⚠️  IMPORTANTE: Aggiungi almeno una API key in .env"
    echo "     - ANTHROPIC_API_KEY per Claude"
    echo "     - OPENAI_API_KEY per GPT"
    echo -e "${NC}"
fi

# ============================================================
#  4. Setup Python Virtual Environment + Dipendenze
# ============================================================
echo -e "\n${BOLD}🐍 Setup ambiente Python...${NC}\n"

if [ ! -d "$VENV_DIR" ]; then
    log_info "Creazione virtual environment..."
    python3 -m venv "$VENV_DIR"
    log_ok "Virtual environment creato"
fi

source "$VENV_DIR/bin/activate"
log_ok "Virtual environment attivato"

# Crea requirements.txt se non esiste
if [ ! -f "$BACKEND_DIR/requirements.txt" ]; then
    cat > "$BACKEND_DIR/requirements.txt" << 'REQEOF'
# Core
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
python-dotenv>=1.0.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# AI Providers
anthropic>=0.40.0
openai>=1.50.0

# Database
sqlalchemy>=2.0.0
aiosqlite>=0.19.0

# Vector Store (RAG)
chromadb>=0.4.0

# WebSocket & Streaming
websockets>=12.0
sse-starlette>=2.0.0

# File handling
python-multipart>=0.0.9
aiofiles>=23.0
pypdf2>=3.0.0
python-docx>=1.0.0

# HTTP client
httpx>=0.27.0

# Utilities
rich>=13.0.0
REQEOF
fi

log_info "Installazione dipendenze Python..."
pip install --quiet --upgrade pip
pip install --quiet -r "$BACKEND_DIR/requirements.txt"
log_ok "Dipendenze Python installate"

# ============================================================
#  5. Setup Frontend React
# ============================================================
echo -e "\n${BOLD}⚛️  Setup frontend React...${NC}\n"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    log_info "Inizializzazione progetto React con Vite..."
    
    # Crea con Vite
    cd "$PROJECT_DIR"
    npm create vite@latest frontend -- --template react-ts 2>/dev/null || true
    cd "$FRONTEND_DIR"
    
    log_info "Installazione dipendenze frontend..."
    npm install
    
    # Dipendenze aggiuntive
    npm install --save \
        @xyflow/react \
        zustand \
        axios \
        react-markdown \
        react-syntax-highlighter \
        @types/react-syntax-highlighter \
        lucide-react \
        framer-motion \
        react-router-dom \
        react-dropzone \
        2>/dev/null || true
    
    # Tailwind
    npm install --save-dev \
        tailwindcss \
        @tailwindcss/typography \
        postcss \
        autoprefixer \
        2>/dev/null || true
    
    npx tailwindcss init -p 2>/dev/null || true
    
    log_ok "Frontend React inizializzato"
else
    cd "$FRONTEND_DIR"
    log_info "Installazione dipendenze npm..."
    npm install --quiet
    log_ok "Dipendenze npm installate"
fi

cd "$PROJECT_DIR"

# ============================================================
#  6. Crea file backend di base se non esistono
# ============================================================
echo -e "\n${BOLD}🔧 Generazione file backend di base...${NC}\n"

# main.py
if [ ! -f "$BACKEND_DIR/main.py" ]; then
    cat > "$BACKEND_DIR/main.py" << 'PYEOF'
"""
Ralph-Loop — AI Agent Orchestrator
FastAPI Backend Entry Point
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔄 Ralph-Loop starting...")
    yield
    print("🔄 Ralph-Loop shutting down...")

app = FastAPI(
    title="Ralph-Loop",
    description="AI Agent Orchestrator & Model Builder",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"name": "Ralph-Loop", "status": "running", "version": "0.1.0"}

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "anthropic": bool(os.getenv("ANTHROPIC_API_KEY")),
        "openai": bool(os.getenv("OPENAI_API_KEY")),
    }

@app.get("/api/models")
async def list_models():
    models = []
    if os.getenv("ANTHROPIC_API_KEY"):
        models.extend([
            {"provider": "anthropic", "id": "claude-opus-4-5-20250929", "name": "Claude Opus 4.5", "tier": "premium"},
            {"provider": "anthropic", "id": "claude-sonnet-4-5-20250514", "name": "Claude Sonnet 4.5", "tier": "standard"},
            {"provider": "anthropic", "id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "tier": "fast"},
        ])
    if os.getenv("OPENAI_API_KEY"):
        models.extend([
            {"provider": "openai", "id": "gpt-4o", "name": "GPT-4o", "tier": "standard"},
            {"provider": "openai", "id": "gpt-4o-mini", "name": "GPT-4o Mini", "tier": "fast"},
            {"provider": "openai", "id": "o1", "name": "o1", "tier": "premium"},
            {"provider": "openai", "id": "o3-mini", "name": "o3-mini", "tier": "standard"},
        ])
    return {"models": models}

# Import routes when they exist
# from api.chat import router as chat_router
# from api.agents import router as agents_router
# from api.workflows import router as workflows_router
# app.include_router(chat_router, prefix="/api")
# app.include_router(agents_router, prefix="/api")
# app.include_router(workflows_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
PYEOF
    log_ok "backend/main.py creato"
fi

# config.py
if [ ! -f "$BACKEND_DIR/config.py" ]; then
    cat > "$BACKEND_DIR/config.py" << 'PYEOF'
"""Ralph-Loop Configuration"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./data/db/ralph.db"
    chroma_path: str = "./data/vectors"
    upload_path: str = "./data/uploads"
    host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173"
    ollama_base_url: str = "http://localhost:11434"

    class Config:
        env_file = ".env"

settings = Settings()
PYEOF
    log_ok "backend/config.py creato"
fi

# base_agent.py
if [ ! -f "$BACKEND_DIR/agents/base_agent.py" ]; then
    cat > "$BACKEND_DIR/agents/base_agent.py" << 'PYEOF'
"""Base Agent — Abstract class for all AI agents"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
from pydantic import BaseModel

class AgentConfig(BaseModel):
    name: str
    model: str
    provider: str
    system_prompt: str = "You are a helpful assistant."
    temperature: float = 0.7
    max_tokens: int = 4096
    tools: list = []

class AgentResponse(BaseModel):
    content: str
    model: str
    provider: str
    tokens_used: dict = {}
    tool_calls: list = []

class BaseAgent(ABC):
    def __init__(self, config: AgentConfig):
        self.config = config

    @abstractmethod
    async def chat(self, messages: list[dict], stream: bool = False) -> AgentResponse | AsyncGenerator:
        """Send messages and get response, optionally streaming."""
        pass

    @abstractmethod
    async def chat_with_tools(self, messages: list[dict], tools: list[dict]) -> AgentResponse:
        """Send messages with tool definitions."""
        pass

    def get_info(self) -> dict:
        return {
            "name": self.config.name,
            "model": self.config.model,
            "provider": self.config.provider,
        }
PYEOF
    log_ok "backend/agents/base_agent.py creato"
fi

log_ok "File backend di base generati"

# ============================================================
#  7. Verifica API Keys
# ============================================================
echo -e "\n${BOLD}🔑 Verifica configurazione...${NC}\n"

source "$ENV_FILE" 2>/dev/null || true

HAS_KEY=false
if [ -n "$ANTHROPIC_API_KEY" ] && [ "$ANTHROPIC_API_KEY" != "" ]; then
    log_ok "ANTHROPIC_API_KEY configurata"
    HAS_KEY=true
else
    log_warn "ANTHROPIC_API_KEY non configurata"
fi

if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "" ]; then
    log_ok "OPENAI_API_KEY configurata"
    HAS_KEY=true
else
    log_warn "OPENAI_API_KEY non configurata"
fi

if [ "$HAS_KEY" = false ]; then
    echo -e "\n${RED}${BOLD}⚠️  Nessuna API key configurata!${NC}"
    echo -e "${YELLOW}   Modifica il file .env e aggiungi almeno una key:${NC}"
    echo -e "   ${CYAN}$ENV_FILE${NC}\n"
fi

# ============================================================
#  8. Avvio servizi
# ============================================================
echo -e "\n${BOLD}🚀 Avvio Ralph-Loop...${NC}\n"

cleanup() {
    echo -e "\n${YELLOW}Arresto servizi...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Ralph-Loop arrestato.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Avvia Backend
log_info "Avvio backend FastAPI sulla porta ${BACKEND_PORT:-8000}..."
cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"
python -m uvicorn main:app \
    --host 0.0.0.0 \
    --port "${BACKEND_PORT:-8000}" \
    --reload \
    --reload-dir "$BACKEND_DIR" \
    &
BACKEND_PID=$!
cd "$PROJECT_DIR"

sleep 2

# Avvia Frontend
log_info "Avvio frontend React sulla porta ${FRONTEND_PORT:-5173}..."
cd "$FRONTEND_DIR"
npm run dev -- --port "${FRONTEND_PORT:-5173}" &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

sleep 3

# ============================================================
#  9. Info finale
# ============================================================
echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║          🔄 RALPH-LOOP AVVIATO!                  ║${NC}"
echo -e "${GREEN}${BOLD}╠═══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║                                                   ║${NC}"
echo -e "${GREEN}${BOLD}║  Frontend:  ${CYAN}http://localhost:${FRONTEND_PORT:-5173}${GREEN}              ║${NC}"
echo -e "${GREEN}${BOLD}║  Backend:   ${CYAN}http://localhost:${BACKEND_PORT:-8000}${GREEN}              ║${NC}"
echo -e "${GREEN}${BOLD}║  API Docs:  ${CYAN}http://localhost:${BACKEND_PORT:-8000}/docs${GREEN}         ║${NC}"
echo -e "${GREEN}${BOLD}║                                                   ║${NC}"
echo -e "${GREEN}${BOLD}║  Premi Ctrl+C per arrestare                       ║${NC}"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Mantieni attivo
wait $BACKEND_PID $FRONTEND_PID
