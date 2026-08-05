"""Retrieval-augmented question answering over the Saudi policy knowledge base."""

from __future__ import annotations

import re
from typing import Any

from .llm import complete_json_object
from .normalize import norm_choice, str_list
from .vectorstore import Retrieved, get_kb

# Clause boundaries that usually separate two distinct asks in one question.
_CLAUSE_SPLIT = re.compile(
    r"(?:[?;]|\band how\b|\band what\b|\band why\b|\band which\b|, and\b)", re.IGNORECASE
)
_MIN_CLAUSE = 25
_MAX_CLAUSES = 3

SYSTEM = """You are the policy-intelligence layer of Fursa, an AI-powered workforce
readiness platform for Saudi Arabia, aligned with ITU-T Y.3172 and Vision 2030.

You answer questions using ONLY the numbered CONTEXT passages supplied with the
question. Each passage comes from a specific Saudi policy document identified by
a KB id (KB-001 … KB-019).

Rules:
1. Ground every factual claim in the context. Never introduce outside facts,
   statistics, dates, or program names.
2. Cite the KB ids that support each claim, e.g. "(KB-007, KB-010)".
3. If the context does not answer the question, say so plainly and state what
   kind of document would be needed. Do not guess.
4. Where the context identifies a policy gap that Fursa addresses, say so — that
   is the platform's core value argument.
5. Be concise and factual. This output is read by product and policy teams.

Return this JSON shape:
{
  "answer": "<grounded prose answer with inline (KB-0XX) citations>",
  "citations": ["KB-007", "KB-010"],
  "confidence": "high" | "medium" | "low",
  "grounded": true | false,
  "follow_up_questions": ["<up to 3 useful next questions>"]
}
`grounded` is false when the context was insufficient and you said so."""


def split_question(question: str) -> list[str]:
    """Break a multi-part question into its separate asks.

    A single embedding averages a two-part question into one vector, and the
    louder half wins. Asking "what gap does Jadarat leave, and how does that
    relate to the HCDP's goals?" retrieved nothing about the HCDP at any top_k —
    its document ranked first the moment that clause was embedded on its own.

    Returns [] when the question is single-topic and plain top-k is fine.
    """
    parts = [p.strip(" ,.-") for p in _CLAUSE_SPLIT.split(question)]
    clauses = [p for p in parts if len(p) >= _MIN_CLAUSE]
    return clauses[:_MAX_CLAUSES] if len(clauses) > 1 else []


def multi_query_search(
    question: str,
    top_k: int,
    where: dict[str, Any] | None = None,
) -> list[Retrieved]:
    """Retrieve for the whole question and for each clause, then interleave.

    The merge is round-robin, NOT a global sort by distance. Sorting defeats the
    whole point: the HCDP document ranks first for its own clause but seventh
    against the full question's hits, so a distance-ordered merge drops it right
    back out of a six-slot window. Round-robin guarantees every clause puts its
    best passage in the context, which is exactly what a multi-part question
    needs.
    """
    kb = get_kb()
    clauses = split_question(question)
    if not clauses:
        return kb.search(question, top_k=top_k, where=where)

    per_clause = max(2, top_k // len(clauses))
    pools = [kb.search(question, top_k=top_k, where=where)]
    pools += [kb.search(c, top_k=per_clause, where=where) for c in clauses]

    selected: list[Retrieved] = []
    seen_text: set[str] = set()
    per_doc: dict[str, int] = {}
    deferred: list[Retrieved] = []

    for rank in range(max(len(p) for p in pools)):
        for pool in pools:
            if len(selected) >= top_k:
                break
            if rank >= len(pool):
                continue
            hit = pool[rank]
            if hit.text in seen_text:
                continue
            seen_text.add(hit.text)
            kb_id = str(hit.metadata.get("kb_id", "?"))
            if per_doc.get(kb_id, 0) >= 2:
                deferred.append(hit)
                continue
            per_doc[kb_id] = per_doc.get(kb_id, 0) + 1
            selected.append(hit)
        if len(selected) >= top_k:
            break

    # Backfill from capped-out passages if diversification left the window short.
    selected += deferred[: max(0, top_k - len(selected))]
    return sorted(selected, key=lambda h: h.distance)[:top_k]


def build_context(passages: list[Retrieved]) -> str:
    blocks = []
    for i, p in enumerate(passages, 1):
        header = f"[{i}] {p.citation}"
        url = p.metadata.get("url")
        if url:
            header += f"\nURL: {url}"
        blocks.append(f"{header}\n---\n{p.text}")
    return "\n\n====================\n\n".join(blocks)


def ask(
    question: str,
    top_k: int | None = None,
    kb_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Retrieve relevant chunks, then answer strictly from them."""
    where = None
    if kb_ids:
        where = {"kb_id": {"$in": kb_ids}} if len(kb_ids) > 1 else {"kb_id": kb_ids[0]}

    passages = multi_query_search(
        question, top_k or get_kb().settings.rag_top_k, where=where
    )

    if not passages:
        return {
            "answer": (
                "The knowledge base is empty or contains nothing relevant to this "
                "question. Run `python scripts/ingest.py` to populate it."
            ),
            "citations": [],
            "confidence": "low",
            "grounded": False,
            "follow_up_questions": [],
            "sources": [],
        }

    payload = complete_json_object(
        SYSTEM,
        f"CONTEXT:\n\n{build_context(passages)}\n\n====================\n\nQUESTION: {question}",
        max_tokens=2000,
    )

    payload["answer"] = str(payload.get("answer") or "")
    payload["citations"] = str_list(payload.get("citations"))
    payload["confidence"] = norm_choice(
        payload.get("confidence"), {"high", "medium", "low"}, "medium"
    )
    payload["grounded"] = bool(payload.get("grounded", True))
    payload["follow_up_questions"] = str_list(payload.get("follow_up_questions"))
    payload["sources"] = [
        {
            "kb_id": p.metadata.get("kb_id"),
            "title": p.metadata.get("title"),
            "source": p.metadata.get("source"),
            "url": p.metadata.get("url"),
            "origin": p.metadata.get("origin"),
            "relevance": round(1.0 - p.distance, 4),
            "excerpt": p.text[:320] + ("…" if len(p.text) > 320 else ""),
        }
        for p in passages
    ]
    return payload
