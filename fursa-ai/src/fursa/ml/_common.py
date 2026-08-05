"""Shared helpers for the reasoning functions."""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel

# Prepended to every ML system prompt. Encodes the non-negotiable behaviour:
# explainable, evidence-based, and blind to protected traits (SDAIA AI Ethics
# Principles, KB-003; PDPL data minimisation, KB-005).
GUARDRAILS = """You are the reasoning engine of Fursa, an AI-powered workforce readiness
platform for Saudi Arabia, aligned with Vision 2030, the Human Capability
Development Program, and ITU-T Y.3172.

Non-negotiable rules:
- Judge only on evidence present in the input: skills, certifications,
  experience, projects, and stated preferences.
- Never infer or use gender, nationality, tribe, age, family name, marital
  status, disability, or any other protected trait — even if present in the
  input. Never let them influence a score.
- Every score must be decomposable. State what drove it and what would move it.
- Be specific and actionable. "Improve communication" is useless;
  "present your capstone project at a student tech meetup" is useful.
- Do not invent courses, employers, programs, or statistics that are not in the
  input.
- Return only the requested JSON. No markdown fences, no commentary."""


def dump(model: BaseModel | None) -> Any:
    """Serialise a pydantic model, dropping nulls to keep the prompt tight."""
    if model is None:
        return None
    return model.model_dump(exclude_none=True)


def block(label: str, payload: Any) -> str:
    """Render a labelled JSON block for the user turn."""
    if payload is None:
        return ""
    body = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
    return f"{label}:\n{body}"


def compose(*blocks: str) -> str:
    return "\n\n".join(b for b in blocks if b)


def policy_context(query: str, k: int = 3) -> str:
    """Pull a little grounding from the Saudi policy KB.

    Best-effort: an unbuilt or unavailable knowledge base must never break a
    reasoning call, so failures degrade to no context.
    """
    try:
        from ..vectorstore import get_kb

        passages = get_kb().search(query, top_k=k)
    except Exception:
        return ""
    if not passages:
        return ""
    body = "\n\n".join(f"[{p.citation}]\n{p.text[:900]}" for p in passages)
    return (
        "SAUDI POLICY CONTEXT (background only — cite KB ids if you rely on it, "
        "and do not treat it as facts about this individual):\n" + body
    )
