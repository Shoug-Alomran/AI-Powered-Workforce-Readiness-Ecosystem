"""Pluggable embedding providers.

Three interchangeable backends behind one interface:

  local  — ChromaDB's bundled ONNX MiniLM (384-d). No key, no network, no cost.
           Default, so the KB works out of the box.
  openai — text-embedding-3-small (1536-d). Strong general-purpose quality.
  cohere — embed-multilingual-v3.0 (1024-d). Best choice once Arabic-language
           policy documents enter the corpus.

Vectors from different providers are NOT comparable. Switching provider means
re-running the ingest script; the collection records which one built it and the
vector store refuses to mix them.
"""

from __future__ import annotations

from typing import Any, Iterable, Protocol

from .config import Settings

_BATCH = 96


def to_floats(vectors: Iterable[Any]) -> list[list[float]]:
    """Coerce vectors to plain Python floats.

    ONNX and Cohere hand back numpy float32 arrays; ChromaDB's validator rejects
    numpy scalars, so every provider normalises through here.
    """
    return [[float(x) for x in vector] for vector in vectors]


class EmbeddingProvider(Protocol):
    name: str

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


class LocalEmbeddings:
    """ChromaDB's default ONNX all-MiniLM-L6-v2. Downloads ~80 MB once."""

    name = "local:all-MiniLM-L6-v2"

    def __init__(self) -> None:
        from chromadb.utils import embedding_functions

        self._fn = embedding_functions.DefaultEmbeddingFunction()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), _BATCH):
            out.extend(to_floats(self._fn(texts[i : i + _BATCH])))
        return out

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


class OpenAIEmbeddings:
    def __init__(self, api_key: str, model: str) -> None:
        from openai import OpenAI

        if not api_key:
            raise RuntimeError(
                "EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is empty. "
                "Set it in .env, or switch to EMBEDDING_PROVIDER=local."
            )
        self._client = OpenAI(api_key=api_key)
        self._model = model
        self.name = f"openai:{model}"

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), _BATCH):
            batch = [t.replace("\n", " ") for t in texts[i : i + _BATCH]]
            resp = self._client.embeddings.create(model=self._model, input=batch)
            out.extend(to_floats(d.embedding for d in resp.data))
        return out

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


class CohereEmbeddings:
    def __init__(self, api_key: str, model: str) -> None:
        import cohere

        if not api_key:
            raise RuntimeError(
                "EMBEDDING_PROVIDER=cohere but COHERE_API_KEY is empty. "
                "Set it in .env, or switch to EMBEDDING_PROVIDER=local."
            )
        self._client = cohere.ClientV2(api_key=api_key)
        self._model = model
        self.name = f"cohere:{model}"

    def _embed(self, texts: list[str], input_type: str) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), _BATCH):
            resp = self._client.embed(
                texts=texts[i : i + _BATCH],
                model=self._model,
                input_type=input_type,
                embedding_types=["float"],
            )
            out.extend(to_floats(resp.embeddings.float_))
        return out

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts, "search_document")

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text], "search_query")[0]


def build_embedder(settings: Settings) -> EmbeddingProvider:
    provider = (settings.embedding_provider or "local").strip().lower()
    if provider == "openai":
        return OpenAIEmbeddings(settings.openai_api_key, settings.openai_embedding_model)
    if provider == "cohere":
        return CohereEmbeddings(settings.cohere_api_key, settings.cohere_embedding_model)
    if provider == "local":
        return LocalEmbeddings()
    raise ValueError(
        f"Unknown EMBEDDING_PROVIDER={provider!r}. Use one of: local, openai, cohere."
    )
