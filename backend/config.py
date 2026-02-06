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
