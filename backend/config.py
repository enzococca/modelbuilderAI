"""Application configuration using Pydantic Settings."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/db/gennaro.db"

    # Storage paths
    chroma_path: str = "./data/vectors"
    upload_path: str = "./data/uploads"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:5173"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"

    # LM Studio (OpenAI-compatible API)
    lmstudio_base_url: str = "http://localhost:1234"

    # --- File Search: Dropbox ---
    dropbox_app_key: str = ""
    dropbox_app_secret: str = ""
    dropbox_refresh_token: str = ""

    # --- File Search: Google Drive ---
    google_drive_credentials_json: str = ""  # path to service account JSON
    google_drive_delegated_user: str = ""

    # --- File Search / Email: Microsoft (OneDrive + Outlook) ---
    microsoft_tenant_id: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_user_id: str = ""

    # --- File Search: Local ---
    file_search_local_roots: str = ""  # comma-separated root dirs

    # --- Email Search: Gmail ---
    gmail_credentials_json: str = ""  # path to OAuth client credentials
    gmail_token_json: str = ""  # path to cached token.json

    # --- Email Search: IMAP ---
    imap_server: str = ""
    imap_port: int = 993
    imap_username: str = ""
    imap_password: str = ""
    imap_use_ssl: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


# Ensure data directories exist
def ensure_dirs(settings: Settings) -> None:
    Path("data/db").mkdir(parents=True, exist_ok=True)
    Path(settings.upload_path).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)


settings = Settings()
