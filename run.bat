@echo off
REM ============================================================
REM  Gennaro — Quick Start (Backend + Frontend) — Windows
REM ============================================================

title Gennaro - AI Agent Orchestrator

echo.
echo   ========================================
echo         Gennaro
echo     AI Agent Orchestrator ^& Workflow
echo   ========================================
echo.

set "PROJECT_DIR=%~dp0"
set "BACKEND_DIR=%PROJECT_DIR%backend"
set "FRONTEND_DIR=%PROJECT_DIR%frontend"
set "VENV_DIR=%PROJECT_DIR%.venv"
set "ENV_FILE=%PROJECT_DIR%.env"

REM ── Check prerequisites ──────────────────────────────────
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo [ERROR] Python venv not found at %VENV_DIR%
    echo         Create it first:  python -m venv .venv
    echo         Then install deps: .venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [ERROR] node_modules not found.
    echo         Run:  cd frontend ^&^& npm install
    pause
    exit /b 1
)

if not exist "%ENV_FILE%" (
    echo [WARN] .env file not found. Create one with your API keys.
)

REM ── Data directories ─────────────────────────────────────
if not exist "%PROJECT_DIR%data\db" mkdir "%PROJECT_DIR%data\db"
if not exist "%PROJECT_DIR%data\uploads" mkdir "%PROJECT_DIR%data\uploads"
if not exist "%PROJECT_DIR%data\vectors" mkdir "%PROJECT_DIR%data\vectors"
if not exist "%PROJECT_DIR%data\exports" mkdir "%PROJECT_DIR%data\exports"

REM ── Start Backend ────────────────────────────────────────
echo [INFO] Starting backend on port 8000...
start "Gennaro Backend" cmd /c "cd /d "%BACKEND_DIR%" && "%VENV_DIR%\Scripts\activate.bat" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

REM ── Start Frontend ───────────────────────────────────────
echo [INFO] Starting frontend on port 5173...
start "Gennaro Frontend" cmd /c "cd /d "%FRONTEND_DIR%" && npm run dev -- --port 5173"

timeout /t 3 /nobreak > nul

REM ── Ready ────────────────────────────────────────────────
echo.
echo   Gennaro is running!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo   Close this window or press Ctrl+C to stop.
echo.

REM Open browser
start http://localhost:5173

pause
