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
    # Dropbox
    dropbox_app_key: str | None = None
    dropbox_app_secret: str | None = None
    dropbox_refresh_token: str | None = None
    # Google Drive
    google_drive_credentials_json: str | None = None
    google_drive_delegated_user: str | None = None
    # Microsoft (OneDrive + Outlook)
    microsoft_tenant_id: str | None = None
    microsoft_client_id: str | None = None
    microsoft_client_secret: str | None = None
    microsoft_user_id: str | None = None
    # Local file search
    file_search_local_roots: str | None = None
    # Gmail
    gmail_credentials_json: str | None = None
    gmail_token_json: str | None = None
    # IMAP
    imap_server: str | None = None
    imap_port: int | None = None
    imap_username: str | None = None
    imap_password: str | None = None
    imap_use_ssl: bool | None = None


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
        # Dropbox
        "dropbox_app_key_mask": _mask_key(settings.dropbox_app_key),
        "dropbox_app_secret_mask": _mask_key(settings.dropbox_app_secret),
        "dropbox_refresh_token_mask": _mask_key(settings.dropbox_refresh_token),
        # Google Drive
        "google_drive_credentials_json": settings.google_drive_credentials_json,
        "google_drive_delegated_user": settings.google_drive_delegated_user,
        # Microsoft
        "microsoft_tenant_id": settings.microsoft_tenant_id,
        "microsoft_client_id": settings.microsoft_client_id,
        "microsoft_client_secret_mask": _mask_key(settings.microsoft_client_secret),
        "microsoft_user_id": settings.microsoft_user_id,
        # Local
        "file_search_local_roots": settings.file_search_local_roots,
        # Gmail
        "gmail_credentials_json": settings.gmail_credentials_json,
        "gmail_token_json": settings.gmail_token_json,
        # IMAP
        "imap_server": settings.imap_server,
        "imap_port": settings.imap_port,
        "imap_username": settings.imap_username,
        "imap_password_mask": _mask_key(settings.imap_password),
        "imap_use_ssl": settings.imap_use_ssl,
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

    # Only update API keys / secrets if the value isn't masked
    if body.anthropic_api_key and "..." not in body.anthropic_api_key:
        settings.anthropic_api_key = body.anthropic_api_key
    if body.openai_api_key and "..." not in body.openai_api_key:
        settings.openai_api_key = body.openai_api_key
    if body.google_api_key and "..." not in body.google_api_key:
        settings.google_api_key = body.google_api_key

    # Dropbox
    if body.dropbox_app_key and "..." not in body.dropbox_app_key:
        settings.dropbox_app_key = body.dropbox_app_key
    if body.dropbox_app_secret and "..." not in body.dropbox_app_secret:
        settings.dropbox_app_secret = body.dropbox_app_secret
    if body.dropbox_refresh_token and "..." not in body.dropbox_refresh_token:
        settings.dropbox_refresh_token = body.dropbox_refresh_token

    # Google Drive
    if body.google_drive_credentials_json is not None:
        settings.google_drive_credentials_json = body.google_drive_credentials_json
        overrides["google_drive_credentials_json"] = body.google_drive_credentials_json
    if body.google_drive_delegated_user is not None:
        settings.google_drive_delegated_user = body.google_drive_delegated_user
        overrides["google_drive_delegated_user"] = body.google_drive_delegated_user

    # Microsoft
    if body.microsoft_tenant_id is not None:
        settings.microsoft_tenant_id = body.microsoft_tenant_id
        overrides["microsoft_tenant_id"] = body.microsoft_tenant_id
    if body.microsoft_client_id is not None:
        settings.microsoft_client_id = body.microsoft_client_id
        overrides["microsoft_client_id"] = body.microsoft_client_id
    if body.microsoft_client_secret and "..." not in body.microsoft_client_secret:
        settings.microsoft_client_secret = body.microsoft_client_secret
    if body.microsoft_user_id is not None:
        settings.microsoft_user_id = body.microsoft_user_id
        overrides["microsoft_user_id"] = body.microsoft_user_id

    # Local
    if body.file_search_local_roots is not None:
        settings.file_search_local_roots = body.file_search_local_roots
        overrides["file_search_local_roots"] = body.file_search_local_roots

    # Gmail
    if body.gmail_credentials_json is not None:
        settings.gmail_credentials_json = body.gmail_credentials_json
        overrides["gmail_credentials_json"] = body.gmail_credentials_json
    if body.gmail_token_json is not None:
        settings.gmail_token_json = body.gmail_token_json
        overrides["gmail_token_json"] = body.gmail_token_json

    # IMAP
    if body.imap_server is not None:
        settings.imap_server = body.imap_server
        overrides["imap_server"] = body.imap_server
    if body.imap_port is not None:
        settings.imap_port = body.imap_port
        overrides["imap_port"] = body.imap_port
    if body.imap_username is not None:
        settings.imap_username = body.imap_username
        overrides["imap_username"] = body.imap_username
    if body.imap_password and "..." not in body.imap_password:
        settings.imap_password = body.imap_password
    if body.imap_use_ssl is not None:
        settings.imap_use_ssl = body.imap_use_ssl
        overrides["imap_use_ssl"] = body.imap_use_ssl

    _save_overrides(overrides)

    return {"status": "ok"}
