"""Settings API — read/update application configuration."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

router = APIRouter(tags=["settings"])

SETTINGS_FILE = Path("data/settings.json")


def _mask_key(key: str) -> str:
    """Mask an API key, showing only first 6 and last 4 characters."""
    if not key or len(key) < 12:
        return "***" if key else ""
    return f"{key[:6]}...{key[-4:]}"


def _load_overrides() -> dict[str, Any]:
    """Load user-saved settings overrides."""
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _save_overrides(data: dict[str, Any]) -> None:
    """Persist settings overrides."""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))


class SettingsUpdate(BaseModel):
    ollama_base_url: str | None = None
    lmstudio_base_url: str | None = None
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    google_api_key: str | None = None
    default_model: str | None = None


@router.get("/settings")
async def get_settings():
    """Return current settings with masked API keys."""
    overrides = _load_overrides()
    return {
        "ollama_base_url": overrides.get("ollama_base_url", settings.ollama_base_url),
        "lmstudio_base_url": overrides.get("lmstudio_base_url", settings.lmstudio_base_url),
        "anthropic_api_key_mask": _mask_key(settings.anthropic_api_key),
        "openai_api_key_mask": _mask_key(settings.openai_api_key),
        "google_api_key_mask": _mask_key(settings.google_api_key),
        "default_model": overrides.get("default_model", "claude-sonnet-4-5-20250929"),
    }


@router.put("/settings")
async def update_settings(body: SettingsUpdate):
    """Update settings. API keys are only updated if a new non-masked value is provided."""
    overrides = _load_overrides()

    if body.ollama_base_url is not None:
        overrides["ollama_base_url"] = body.ollama_base_url
        settings.ollama_base_url = body.ollama_base_url

    if body.lmstudio_base_url is not None:
        overrides["lmstudio_base_url"] = body.lmstudio_base_url
        settings.lmstudio_base_url = body.lmstudio_base_url

    if body.default_model is not None:
        overrides["default_model"] = body.default_model

    # Only update API keys if the value isn't masked
    if body.anthropic_api_key and "..." not in body.anthropic_api_key:
        settings.anthropic_api_key = body.anthropic_api_key
    if body.openai_api_key and "..." not in body.openai_api_key:
        settings.openai_api_key = body.openai_api_key
    if body.google_api_key and "..." not in body.google_api_key:
        settings.google_api_key = body.google_api_key

    _save_overrides(overrides)

    return {"status": "ok"}
