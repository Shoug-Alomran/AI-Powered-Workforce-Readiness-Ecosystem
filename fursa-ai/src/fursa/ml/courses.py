"""Course recommendation: rank a catalog by impact on the learner's real gaps."""

from __future__ import annotations

from typing import Any

from ..llm import complete_json_object
from ..normalize import coerce_int, str_list
from ..schemas import Course, StudentProfile
from ._common import GUARDRAILS, block, compose, dump

SYSTEM = (
    GUARDRAILS
    + """

TASK: given a learner's skill gaps and an available course catalog, return the
courses ranked by impact — not by popularity, price, or catalog order.

Impact = (how critical the gaps it closes) x (how many gaps it closes)
         x (likelihood this learner finishes it), adjusted for prerequisites.

Rules:
- Recommend ONLY courses present in COURSE CATALOG. Never invent one. If the
  catalog is empty or covers nothing, return an empty `recommendations` list and
  put every gap in `uncovered_gaps`.
- Order matters: a course whose prerequisite is another gap must rank after the
  course that closes the prerequisite. Say so in `sequence_note`.
- Respect CONSTRAINTS (weekly hours, budget, language). A course that violates a
  hard constraint must not be recommended — explain the exclusion in
  `learning_path_summary`.
- `estimated_readiness_gain` is the approximate number of points this course
  would add to the learner's 0-100 career readiness score.
- List every gap no catalog course addresses in `uncovered_gaps`. That list is
  the demand signal Fursa feeds back to training providers (KB-008, KB-015).

Return JSON:
{
  "recommendations": [{"course_id": "...", "title": "...", "rank": 1,
                       "closes_gaps": ["..."], "impact_score": 0-100,
                       "rationale": "<1-2 sentences>",
                       "estimated_readiness_gain": 0,
                       "sequence_note": "<when to take this, or null>"}],
  "uncovered_gaps": ["..."],
  "learning_path_summary": "<2-3 sentences: the order, the time, the payoff>"
}"""
)


def recommend_courses(
    skill_gaps: list[str],
    course_catalog: list[Course],
    student: StudentProfile | None = None,
    target_role: str | None = None,
    max_recommendations: int = 5,
    constraints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    user = compose(
        block("SKILL GAPS TO CLOSE", skill_gaps),
        block("TARGET ROLE", target_role),
        block("COURSE CATALOG", [dump(c) for c in course_catalog]),
        block("LEARNER PROFILE", dump(student)),
        block("CONSTRAINTS", constraints or {}),
        f"Return at most {max_recommendations} recommendations.",
    )
    result = complete_json_object(SYSTEM, user, max_tokens=3000)

    recommendations = []
    for index, rec in enumerate(result.get("recommendations") or []):
        if isinstance(rec, str):
            rec = {"title": rec}
        if not isinstance(rec, dict) or not rec.get("title"):
            continue
        rec["title"] = str(rec["title"])
        rec["rank"] = coerce_int(rec.get("rank"), 1, 999, index + 1)
        rec["impact_score"] = coerce_int(rec.get("impact_score"), 0, 100, 50)
        rec["rationale"] = str(rec.get("rationale") or "")
        rec["closes_gaps"] = str_list(rec.get("closes_gaps"))
        rec["estimated_readiness_gain"] = coerce_int(
            rec.get("estimated_readiness_gain"), 0, 100
        )
        recommendations.append(rec)
    result["recommendations"] = recommendations[:max_recommendations]
    result["uncovered_gaps"] = str_list(result.get("uncovered_gaps"))
    return result
