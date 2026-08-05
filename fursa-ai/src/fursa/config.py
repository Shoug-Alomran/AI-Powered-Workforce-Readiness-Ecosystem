"""Central configuration, loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# fursa-ai/src/fursa/config.py -> fursa-ai/
PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """App settings.

    App-specific knobs are namespaced FURSA_* deliberately: bare names like
    CLAUDE_MODEL and CLAUDE_EFFORT are already used by other tooling on a
    developer machine and would silently override the .env file.
    """

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    # --- Claude ---
    anthropic_api_key: str = ""
    claude_model: str = Field("claude-sonnet-4-6", alias="FURSA_CLAUDE_MODEL")
    claude_effort: str = Field("medium", alias="FURSA_CLAUDE_EFFORT")

    # --- Embeddings ---
    embedding_provider: str = Field("local", alias="FURSA_EMBEDDING_PROVIDER")
    openai_api_key: str = ""
    openai_embedding_model: str = Field(
        "text-embedding-3-small", alias="FURSA_OPENAI_EMBEDDING_MODEL"
    )
    cohere_api_key: str = ""
    cohere_embedding_model: str = Field(
        "embed-multilingual-v3.0", alias="FURSA_COHERE_EMBEDDING_MODEL"
    )

    # --- Storage ---
    chroma_dir: Path = Field(PROJECT_ROOT / "data" / "chroma", alias="FURSA_CHROMA_DIR")
    raw_dir: Path = Field(PROJECT_ROOT / "data" / "raw", alias="FURSA_RAW_DIR")
    manual_dir: Path = Field(PROJECT_ROOT / "data" / "manual", alias="FURSA_MANUAL_DIR")
    collection_name: str = Field("fursa_kb", alias="FURSA_COLLECTION_NAME")

    # --- Retrieval ---
    chunk_size: int = Field(1100, alias="FURSA_CHUNK_SIZE")
    chunk_overlap: int = Field(150, alias="FURSA_CHUNK_OVERLAP")
    rag_top_k: int = Field(6, alias="FURSA_RAG_TOP_K")

    # --- Server ---
    cors_origins: str = Field("*", alias="FURSA_CORS_ORIGINS")

    @property
    def catalog_path(self) -> Path:
        """The knowledge-base catalog markdown lives one level above the project."""
        return PROJECT_ROOT.parent / "knowledge-base-catalog.md"

    @property
    def seed_jobs_path(self) -> Path:
        return PROJECT_ROOT / "data" / "job_postings.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def resolve_paths(self) -> None:
        """Make relative paths absolute against the project root and create them."""
        for attr in ("chroma_dir", "raw_dir", "manual_dir"):
            value = Path(getattr(self, attr))
            if not value.is_absolute():
                value = (PROJECT_ROOT / value).resolve()
            setattr(self, attr, value)
            value.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.resolve_paths()
    return settings
