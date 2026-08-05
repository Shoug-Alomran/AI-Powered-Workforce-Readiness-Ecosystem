"""Skill demand forecasting from historical job-posting data.

Deterministic counting happens in Python; Claude interprets the aggregates.
Keeping the arithmetic out of the model makes the trend numbers reproducible and
auditable — a requirement for anything a university would plan curriculum on.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

from ..llm import complete_json_object
from ._common import GUARDRAILS, block, compose, policy_context

SYSTEM = (
    GUARDRAILS
    + """

TASK: interpret pre-computed skill-demand aggregates from Saudi job postings and
produce a forecast that a university, TVTC college, or training provider can
plan curriculum against.

You are given AGGREGATES computed deterministically in code: per-skill counts by
period, totals, and a growth rate. Do not recompute them and do not contradict
them — interpret them.

Rules:
- `trending_up` / `trending_down` must be justified by the supplied growth
  numbers. Carry the actual figures into each entry.
- `emerging` = low absolute volume but sharp recent growth, or skills that only
  appear in the most recent period. These are the early signals worth flagging.
- Be explicit about weak evidence. A skill with 3 postings is noise; say so in
  `confidence` rather than presenting it as a trend.
- `curriculum_implications` are directives to education providers, tied to the
  data: what to add, what to deepen, what to retire.
- Note the data window and its limits in `data_window`. Small or short datasets
  must be flagged — an over-confident forecast is worse than an honest one.

Return JSON:
{
  "trending_up":   [{"skill": "...", "growth_rate": 0.0, "recent_count": 0,
                     "earlier_count": 0, "confidence": "high|medium|low",
                     "interpretation": "..."}],
  "trending_down": [{"skill": "...", "growth_rate": 0.0, "recent_count": 0,
                     "earlier_count": 0, "confidence": "high|medium|low",
                     "interpretation": "..."}],
  "stable":        [{"skill": "...", "total_count": 0, "interpretation": "..."}],
  "emerging":      [{"skill": "...", "signal": "...", "why_it_matters": "..."}],
  "horizon_months": 12,
  "curriculum_implications": ["<directives to education providers>"],
  "summary": "<3-4 sentences for a workforce-planning audience>",
  "data_window": {"from": "...", "to": "...", "postings": 0,
                  "caveats": ["..."]}
}"""
)

_DATE_KEYS = ("posted_at", "date", "posted_date", "created_at")
_SKILL_KEYS = ("required_skills", "skills", "preferred_skills")


def _parse_date(row: dict[str, Any]) -> datetime | None:
    for key in _DATE_KEYS:
        raw = row.get(key)
        if not raw:
            continue
        text = str(raw).strip().replace("Z", "+00:00")
        for fmt in (None, "%Y-%m-%d", "%Y-%m", "%Y/%m/%d", "%d/%m/%Y", "%Y"):
            try:
                dt = datetime.fromisoformat(text) if fmt is None else datetime.strptime(text, fmt)
                return dt.replace(tzinfo=None)
            except (ValueError, TypeError):
                continue
    return None


def _skills_of(row: dict[str, Any]) -> list[str]:
    found: list[str] = []
    for key in _SKILL_KEYS:
        value = row.get(key)
        if isinstance(value, str):
            found.extend(part.strip() for part in value.split(","))
        elif isinstance(value, list):
            found.extend(str(v).strip() for v in value)
    seen, out = set(), []
    for skill in found:
        norm = skill.strip()
        if norm and norm.lower() not in seen:
            seen.add(norm.lower())
            out.append(norm)
    return out


def aggregate_postings(
    postings: list[dict[str, Any]],
    sector: str | None = None,
    region: str | None = None,
) -> dict[str, Any]:
    """Count skill mentions per period and compute growth. Pure Python, no LLM."""
    rows = [
        r
        for r in postings
        if (not sector or str(r.get("sector", "")).lower() == sector.lower())
        and (not region or str(r.get("region", "")).lower() == region.lower())
    ]

    dated: list[tuple[datetime | None, dict[str, Any]]] = [(_parse_date(r), r) for r in rows]
    known = sorted(d for d, _ in dated if d)
    midpoint = known[len(known) // 2] if known else None

    per_period: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    totals: dict[str, int] = defaultdict(int)
    recent: dict[str, int] = defaultdict(int)
    earlier: dict[str, int] = defaultdict(int)

    for date, row in dated:
        weight = int(row.get("count", 1) or 1)
        period = date.strftime("%Y-%m") if date else "undated"
        for skill in _skills_of(row):
            per_period[skill][period] += weight
            totals[skill] += weight
            if midpoint and date:
                (recent if date >= midpoint else earlier)[skill] += weight

    skills = []
    for skill, total in sorted(totals.items(), key=lambda kv: -kv[1]):
        r, e = recent.get(skill, 0), earlier.get(skill, 0)
        if e:
            growth = round((r - e) / e, 3)
        elif r:
            growth = None  # only ever seen in the recent half -> emerging
        else:
            growth = 0.0
        skills.append(
            {
                "skill": skill,
                "total_count": total,
                "recent_count": r,
                "earlier_count": e,
                "growth_rate": growth,
                "by_period": dict(sorted(per_period[skill].items())),
            }
        )

    return {
        "postings_analysed": len(rows),
        "date_range": {
            "from": known[0].strftime("%Y-%m-%d") if known else None,
            "to": known[-1].strftime("%Y-%m-%d") if known else None,
            "split_at": midpoint.strftime("%Y-%m-%d") if midpoint else None,
            "undated_rows": sum(1 for d, _ in dated if not d),
        },
        "distinct_skills": len(skills),
        "skills": skills[:60],
    }


def compact_aggregates(aggregates: dict[str, Any], top_n: int = 35) -> dict[str, Any]:
    """Shrink the aggregates for the prompt.

    The full structure carries a per-month breakdown for every skill, which is
    most of its size and adds nothing the model uses — it reasons from the
    totals and the growth rate. Trimming it keeps the response inside the output
    budget; the caller still returns the full aggregates to the client.
    """
    return {
        "postings_analysed": aggregates["postings_analysed"],
        "date_range": aggregates["date_range"],
        "distinct_skills": aggregates["distinct_skills"],
        "skills_shown": min(top_n, len(aggregates["skills"])),
        "skills": [
            {k: v for k, v in s.items() if k != "by_period"}
            for s in aggregates["skills"][:top_n]
        ],
    }


def load_seed_postings(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("postings", data) if isinstance(data, dict) else data


def forecast_skill_trends(
    postings: list[dict[str, Any]],
    horizon_months: int = 12,
    sector: str | None = None,
    region: str | None = None,
    use_policy_context: bool = True,
) -> dict[str, Any]:
    aggregates = aggregate_postings(postings, sector=sector, region=region)

    if not aggregates["skills"]:
        return {
            "trending_up": [],
            "trending_down": [],
            "stable": [],
            "emerging": [],
            "horizon_months": horizon_months,
            "curriculum_implications": [],
            "summary": "No skills could be extracted from the supplied postings.",
            "data_window": {
                **aggregates["date_range"],
                "postings": aggregates["postings_analysed"],
                "caveats": ["No postings contained a recognised skills field."],
            },
            "aggregates": aggregates,
        }

    grounding = (
        policy_context("Saudi labour market skills demand and training priorities", k=3)
        if use_policy_context
        else ""
    )

    user = compose(
        block(
            "AGGREGATES (computed in code — treat as ground truth)",
            compact_aggregates(aggregates),
        ),
        block("FORECAST HORIZON (months)", horizon_months),
        block("FILTERS", {"sector": sector, "region": region}),
        grounding,
        "Cover the most decision-relevant skills rather than every row: at most 8 "
        "entries in `trending_up`, 6 in `trending_down`, 6 in `stable`, and 6 in "
        "`emerging`. Keep each `interpretation` to one sentence.",
    )
    result = complete_json_object(SYSTEM, user, max_tokens=8000)
    result["horizon_months"] = horizon_months
    result["aggregates"] = aggregates
    for key in ("trending_up", "trending_down", "stable", "emerging", "curriculum_implications"):
        result.setdefault(key, [])
    return result
