#!/bin/bash
# ============================================================
#  Gennaro — Quick Start (Backend + Frontend)
# ============================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$PROJECT_DIR/.venv"
ENV_FILE="$PROJECT_DIR/.env"

echo -e "${CYAN}${BOLD}"
echo "  ╔════════════════════════════════════════╗"
echo "  ║         Gennaro                        ║"
echo "  ║   AI Agent Orchestrator & Workflow      ║"
echo "  ╚════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check prerequisites ──────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${RED}Python venv not found at $VENV_DIR${NC}"
    echo -e "Run the full setup first:  ${CYAN}./start.sh${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${RED}node_modules not found.${NC}"
    echo -e "Run:  ${CYAN}cd frontend && npm install${NC}"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Create one with your API keys.${NC}"
fi

# ── Data directories ─────────────────────────────────────
mkdir -p "$PROJECT_DIR/data"/{db,uploads,vectors,exports}

# ── Cleanup on exit ──────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" 2>/dev/null
    wait "$FRONTEND_PID" 2>/dev/null
    echo -e "${GREEN}Gennaro stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── Start Backend ────────────────────────────────────────
echo -e "${CYAN}Starting backend on port 8000...${NC}"
source "$VENV_DIR/bin/activate"
cd "$BACKEND_DIR"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-dir "$BACKEND_DIR" &
BACKEND_PID=$!
cd "$PROJECT_DIR"

sleep 2

# ── Start Frontend ───────────────────────────────────────
echo -e "${CYAN}Starting frontend on port 5173...${NC}"
cd "$FRONTEND_DIR"
npm run dev -- --port 5173 &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

sleep 2

# ── Ready ────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  Gennaro is running!${NC}"
echo ""
echo -e "  Frontend:  ${CYAN}http://localhost:5173${NC}"
echo -e "  Backend:   ${CYAN}http://localhost:8000${NC}"
echo -e "  API Docs:  ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop."
echo ""

wait $BACKEND_PID $FRONTEND_PID
