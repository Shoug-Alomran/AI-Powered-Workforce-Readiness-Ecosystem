"""Persistent ChromaDB collection holding the Saudi policy knowledge base."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from .config import Settings, get_settings
from .embeddings import EmbeddingProvider, build_embedder

_UPSERT_BATCH = 128


@dataclass
class Retrieved:
    text: str
    metadata: dict[str, Any]
    distance: float

    @property
    def citation(self) -> str:
        kb_id = self.metadata.get("kb_id", "?")
        title = self.metadata.get("title", "Untitled")
        source = self.metadata.get("source", "")
        date = self.metadata.get("date", "")
        tail = " ".join(x for x in (source, date) if x)
        return f"{kb_id} — {title}" + (f" ({tail})" if tail else "")


def chunk_id(kb_id: str, origin: str, index: int, text: str) -> str:
    """Stable id so re-ingesting updates rows instead of duplicating them."""
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]
    return f"{kb_id}:{origin}:{index}:{digest}"


class KnowledgeBase:
    def __init__(self, settings: Settings | None = None, embedder: EmbeddingProvider | None = None):
        self.settings = settings or get_settings()
        self.embedder = embedder or build_embedder(self.settings)
        self._client = chromadb.PersistentClient(
            path=str(self.settings.chroma_dir),
            settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
        )
        self._collection = self._client.get_or_create_collection(
            name=self.settings.collection_name,
            metadata={"hnsw:space": "cosine", "embedder": self.embedder.name},
        )
        self._assert_embedder_matches()

    def _assert_embedder_matches(self) -> None:
        stored = (self._collection.metadata or {}).get("embedder")
        if stored and stored != self.embedder.name and self._collection.count() > 0:
            raise RuntimeError(
                f"Collection '{self.settings.collection_name}' was built with "
                f"'{stored}' but the current EMBEDDING_PROVIDER resolves to "
                f"'{self.embedder.name}'. Vectors from different models are not "
                f"comparable — re-run:  python scripts/ingest.py --reset"
            )

    # ---------------------------------------------------------------- write

    def reset(self) -> None:
        try:
            self._client.delete_collection(self.settings.collection_name)
        except Exception:  # collection may not exist yet
            pass
        self._collection = self._client.get_or_create_collection(
            name=self.settings.collection_name,
            metadata={"hnsw:space": "cosine", "embedder": self.embedder.name},
        )

    def delete_document(self, kb_id: str, origin: str | None = None) -> None:
        """Remove a document's chunks, optionally scoped to one origin.

        Chunk ids embed a content hash, so re-ingesting *changed* text creates
        new ids and would leave the old chunks behind as stale duplicates.
        Callers delete the origin they are about to rewrite first.
        """
        where: dict[str, Any] = {"kb_id": kb_id}
        if origin:
            where = {"$and": [{"kb_id": kb_id}, {"origin": origin}]}
        self._collection.delete(where=where)

    def upsert(
        self,
        ids: list[str],
        documents: list[str],
        metadatas: list[dict[str, Any]],
    ) -> int:
        if not documents:
            return 0
        total = 0
        for i in range(0, len(documents), _UPSERT_BATCH):
            docs = documents[i : i + _UPSERT_BATCH]
            vectors = self.embedder.embed_documents(docs)
            self._collection.upsert(
                ids=ids[i : i + _UPSERT_BATCH],
                documents=docs,
                metadatas=metadatas[i : i + _UPSERT_BATCH],
                embeddings=vectors,
            )
            total += len(docs)
        return total

    # ----------------------------------------------------------------- read

    def count(self) -> int:
        return self._collection.count()

    def search(
        self,
        query: str,
        top_k: int | None = None,
        where: dict[str, Any] | None = None,
        max_per_doc: int | None = 2,
    ) -> list[Retrieved]:
        """Semantic search with per-document diversification.

        Pure top-k lets one verbose document occupy most of the window. On a
        two-part policy question that is a correctness problem, not just a
        cosmetic one: three chunks of the labour-market report crowded out the
        HCDP document entirely, and the model — correctly — reported that it
        had no basis to answer half the question.

        So over-fetch, then keep at most `max_per_doc` chunks per KB id while
        preserving rank order. Pass max_per_doc=None for plain top-k.
        """
        if self.count() == 0:
            return []
        k = top_k or self.settings.rag_top_k
        fetch = min(self.count(), k * 4 if max_per_doc else k)

        result = self._collection.query(
            query_embeddings=[self.embedder.embed_query(query)],
            n_results=fetch,
            where=where or None,
            include=["documents", "metadatas", "distances"],
        )
        docs = (result.get("documents") or [[]])[0]
        metas = (result.get("metadatas") or [[]])[0]
        dists = (result.get("distances") or [[]])[0]
        hits = [
            Retrieved(text=d, metadata=m or {}, distance=float(dist))
            for d, m, dist in zip(docs, metas, dists)
        ]
        if max_per_doc is None:
            return hits[:k]

        kept: list[Retrieved] = []
        overflow: list[Retrieved] = []
        seen: dict[str, int] = {}
        for hit in hits:
            kb_id = str(hit.metadata.get("kb_id", "?"))
            if seen.get(kb_id, 0) < max_per_doc:
                seen[kb_id] = seen.get(kb_id, 0) + 1
                kept.append(hit)
            else:
                overflow.append(hit)

        # Backfill from the overflow if diversification left the window short.
        return (kept + overflow)[:k]

    def stats(self) -> dict[str, Any]:
        total = self.count()
        by_doc: dict[str, int] = {}
        by_origin: dict[str, int] = {}
        if total:
            rows = self._collection.get(include=["metadatas"], limit=total)
            for meta in rows.get("metadatas") or []:
                meta = meta or {}
                key = f"{meta.get('kb_id', '?')} — {meta.get('title', '')}"
                by_doc[key] = by_doc.get(key, 0) + 1
                origin = str(meta.get("origin", "unknown"))
                by_origin[origin] = by_origin.get(origin, 0) + 1
        return {
            "collection": self.settings.collection_name,
            "embedder": self.embedder.name,
            "chunks": total,
            "documents": len(by_doc),
            "chunks_by_origin": by_origin,
            "chunks_by_document": dict(sorted(by_doc.items())),
        }


_kb: KnowledgeBase | None = None


def get_kb() -> KnowledgeBase:
    global _kb
    if _kb is None:
        _kb = KnowledgeBase()
    return _kb
