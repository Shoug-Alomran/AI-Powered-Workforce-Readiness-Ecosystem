"""Explainable opportunity matching: job requirements x skills passport."""

from __future__ import annotations

from typing import Any

from ..llm import LLMError, complete_json_object
from ..normalize import coerce_int, norm_choice, str_list
from ..schemas import JobRequirements, StudentProfile
from ._common import GUARDRAILS, block, compose, dump

_VERDICTS = {"strong_match", "promising", "developing", "not_yet_ready"}
_IMPORTANCE = {"critical", "important", "nice_to_have"}


def _verdict_for(score: int) -> str:
    if score >= 80:
        return "strong_match"
    if score >= 60:
        return "promising"
    if score >= 40:
        return "developing"
    return "not_yet_ready"

SYSTEM = (
    GUARDRAILS
    + """

TASK: score how well one candidate fits one job, and explain the score so both
sides can act on it. This is the layer Jadarat (KB-010) lacks: it matches on
existing skills but does not surface *why*, or what would close the distance.

Scoring weights (state the derivation in `breakdown`):
  required skills coverage   40
  relevant experience        20
  certifications             15
  projects / portfolio       15
  soft skills + languages    10

Rules:
- A missing REQUIRED skill is `critical`. A missing PREFERRED skill is at most
  `important`.
- `closable_in_weeks` is your realistic estimate of how long a motivated learner
  needs to reach the required level from where they actually are.
- Entry-level roles must not be penalised for absent senior experience; if
  `is_entry_level` is true, weight demonstrated learning and projects higher.
- `explanation` addresses the employer: why this candidate, what to probe in an
  interview, and what the ramp-up looks like.

Return JSON:
{
  "match_score": 0-100,
  "verdict": "strong_match" | "promising" | "developing" | "not_yet_ready",
  "explanation": "<2-4 sentences>",
  "matched_skills": ["..."],
  "gaps": [{"skill": "...", "importance": "critical|important|nice_to_have",
            "student_level": "...", "required_level": "...",
            "closable_in_weeks": 0}],
  "breakdown": {"required_skills": {"score": 0, "max": 40, "note": "..."},
                "experience": {"score": 0, "max": 20, "note": "..."},
                "certifications": {"score": 0, "max": 15, "note": "..."},
                "projects": {"score": 0, "max": 15, "note": "..."},
                "soft_skills": {"score": 0, "max": 10, "note": "..."}},
  "recommended_next_actions": ["<3-5 concrete steps for the candidate>"],
  "fairness_note": "<which attributes you used, and confirmation that no "
                   "protected trait influenced the score>"
}"""
)


def match_candidate(
    job: JobRequirements,
    student: StudentProfile,
    explain: bool = True,
) -> dict[str, Any]:
    user = compose(
        block("JOB REQUIREMENTS", dump(job)),
        block("CANDIDATE SKILLS PASSPORT", dump(student)),
        ""
        if explain
        else "Keep `explanation` to one sentence and omit `recommended_next_actions`.",
    )
    result = complete_json_object(SYSTEM, user, max_tokens=2500)

    # Normalise onto the response contract: the schema's enums and ranges are
    # strict, and one off-vocabulary token would surface as an HTTP 500.
    score = coerce_int(result.get("match_score"), 0, 100)
    if score is None:
        raise LLMError("The model returned no usable match_score.")
    result["match_score"] = score
    result["verdict"] = norm_choice(
        result.get("verdict"), _VERDICTS, default=_verdict_for(score),
        synonyms={"strong": "strong_match", "not": "not_yet_ready"},
    )
    result["explanation"] = str(result.get("explanation") or "")
    result["matched_skills"] = str_list(result.get("matched_skills"))
    result["recommended_next_actions"] = str_list(result.get("recommended_next_actions"))
    if not isinstance(result.get("breakdown"), dict):
        result["breakdown"] = {}

    gaps = []
    for gap in result.get("gaps") or []:
        if isinstance(gap, str):
            gap = {"skill": gap}
        if not isinstance(gap, dict) or not gap.get("skill"):
            continue
        gap["skill"] = str(gap["skill"])
        gap["importance"] = norm_choice(
            gap.get("importance"), _IMPORTANCE, "important", synonyms={"nice": "nice_to_have"}
        )
        gap["closable_in_weeks"] = coerce_int(gap.get("closable_in_weeks"), 0, 520)
        gaps.append(gap)
    result["gaps"] = gaps
    return result
