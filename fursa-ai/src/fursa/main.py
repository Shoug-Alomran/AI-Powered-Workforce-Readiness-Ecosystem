"""FastAPI server exposing the Fursa AI pipeline to the frontend team.

    POST /api/match             explainable job <-> candidate matching
    POST /api/recommend-courses impact-ranked learning path
    POST /api/readiness-score   0-100 Career Readiness Score
    POST /api/adaptive-path     re-route a learner who is stuck
    POST /api/ask-kb            RAG over 19 Saudi policy documents
    GET  /api/skill-trends      demand forecast from the seeded dataset
    POST /api/skill-trends      demand forecast from your own postings

Interactive docs: http://127.0.0.1:8000/docs
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import ml, rag
from .config import get_settings
from .llm import LLMError
from .ml.forecasting import load_seed_postings
from .schemas import (
    AdaptiveLearningRequest,
    AdaptiveLearningResponse,
    AskKBRequest,
    AskKBResponse,
    MatchRequest,
    MatchResponse,
    ReadinessScoreRequest,
    ReadinessScoreResponse,
    RecommendCoursesRequest,
    RecommendCoursesResponse,
    SkillTrendsRequest,
    SkillTrendsResponse,
)
from .vectorstore import get_kb

log = logging.getLogger("fursa")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        kb = get_kb()
        log.info("Knowledge base ready: %s chunks via %s", kb.count(), kb.embedder.name)
        if kb.count() == 0:
            log.warning("Knowledge base is empty — run: python scripts/ingest.py")
    except Exception as exc:  # never block startup on the vector store
        log.error("Knowledge base unavailable: %s", exc)
    yield


app = FastAPI(
    title="Fursa AI Pipeline",
    version="0.1.0",
    description=(
        "RAG + reasoning services for Fursa, an AI-Powered Workforce Readiness "
        "Ecosystem for Saudi Arabia (ITU-T Y.3172 aligned)."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _guard(fn, *args, **kwargs) -> Any:
    """Map internal failures onto clean HTTP errors for the frontend."""
    try:
        return fn(*args, **kwargs)
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        log.exception("Unhandled error in %s", getattr(fn, "__name__", fn))
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}") from exc


# ────────────────────────────── health ──────────────────────────────


@app.get("/api/health", tags=["system"])
def health() -> dict[str, Any]:
    try:
        kb = get_kb()
        kb_state = {"ready": kb.count() > 0, "chunks": kb.count(), "embedder": kb.embedder.name}
    except Exception as exc:
        kb_state = {"ready": False, "error": str(exc)}
    return {
        "status": "ok",
        "model": settings.claude_model,
        "effort": settings.claude_effort,
        "anthropic_key_configured": bool(settings.anthropic_api_key),
        "knowledge_base": kb_state,
    }


@app.get("/api/kb/stats", tags=["system"])
def kb_stats() -> dict[str, Any]:
    return _guard(lambda: get_kb().stats())


@app.get("/api/kb/search", tags=["system"])
def kb_search(
    q: str = Query(..., description="Semantic search with no LLM — useful for debugging."),
    top_k: int = Query(5, ge=1, le=25),
    raw: bool = Query(
        False,
        description=(
            "True = pure top-k by distance. False (default) = the production "
            "behaviour, capped at 2 chunks per document. Note /api/ask-kb "
            "additionally splits multi-part questions into per-clause queries."
        ),
    ),
) -> dict[str, Any]:
    def run() -> dict[str, Any]:
        hits = get_kb().search(q, top_k=top_k, max_per_doc=None if raw else 2)
        return {
            "query": q,
            "results": [
                {
                    "citation": h.citation,
                    "relevance": round(1.0 - h.distance, 4),
                    "origin": h.metadata.get("origin"),
                    "url": h.metadata.get("url"),
                    "text": h.text,
                }
                for h in hits
            ],
        }

    return _guard(run)


# ───────────────────────────── endpoints ────────────────────────────


@app.post("/api/match", response_model=MatchResponse, tags=["ml"])
def api_match(req: MatchRequest) -> Any:
    return _guard(ml.match_candidate, req.job, req.student, req.explain)


@app.post("/api/recommend-courses", response_model=RecommendCoursesResponse, tags=["ml"])
def api_recommend_courses(req: RecommendCoursesRequest) -> Any:
    return _guard(
        ml.recommend_courses,
        req.skill_gaps,
        req.course_catalog,
        req.student,
        req.target_role,
        req.max_recommendations,
        req.constraints,
    )


@app.post("/api/readiness-score", response_model=ReadinessScoreResponse, tags=["ml"])
def api_readiness_score(req: ReadinessScoreRequest) -> Any:
    return _guard(ml.score_readiness, req.student, req.target_role, req.job_market_context)


@app.post("/api/adaptive-path", response_model=AdaptiveLearningResponse, tags=["ml"])
def api_adaptive_path(req: AdaptiveLearningRequest) -> Any:
    return _guard(
        ml.suggest_adaptive_path,
        req.student,
        req.progress_history,
        req.current_path,
        req.target_role,
    )


# The seeded forecast reads a static file and takes ~60s of model time, so it
# caches per (file mtime, params). POST /api/skill-trends is never cached —
# callers send their own data there.
_trends_cache: dict[tuple[Any, ...], Any] = {}


@app.get("/api/skill-trends", response_model=SkillTrendsResponse, tags=["ml"])
def api_skill_trends_get(
    horizon_months: int = Query(12, ge=1, le=60),
    sector: str | None = Query(None),
    region: str | None = Query(None),
) -> Any:
    postings = load_seed_postings(settings.seed_jobs_path)
    if not postings:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No seeded job postings at {settings.seed_jobs_path}. "
                "POST to /api/skill-trends with your own data instead."
            ),
        )
    key = (
        settings.seed_jobs_path.stat().st_mtime_ns,
        horizon_months,
        sector,
        region,
    )
    if key not in _trends_cache:
        if len(_trends_cache) > 64:
            _trends_cache.clear()
        _trends_cache[key] = _guard(
            ml.forecast_skill_trends, postings, horizon_months, sector, region
        )
    return _trends_cache[key]


@app.post("/api/skill-trends", response_model=SkillTrendsResponse, tags=["ml"])
def api_skill_trends_post(req: SkillTrendsRequest) -> Any:
    return _guard(
        ml.forecast_skill_trends,
        req.job_postings,
        req.horizon_months,
        req.sector,
        req.region,
    )


@app.post("/api/ask-kb", response_model=AskKBResponse, tags=["rag"])
def api_ask_kb(req: AskKBRequest = Body(...)) -> Any:
    return _guard(rag.ask, req.question, req.top_k, req.kb_ids)
