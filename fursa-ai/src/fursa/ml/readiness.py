"""Career Readiness Score — the metric the catalog identifies as missing.

KB-007 (Human Capability Development Program) sets national workforce-readiness
goals, but the catalog's policy-gap table records that no standardised national
Skills Passport or readiness metric exists to track an individual against them.
This function is Fursa's answer to that gap.
"""

from __future__ import annotations

from typing import Any

from ..llm import LLMError, complete_json_object
from ..normalize import coerce_int, str_list
from ..schemas import StudentProfile
from ._common import GUARDRAILS, block, compose, dump, policy_context


def _band_for(score: int) -> str:
    """The prompt defines bands purely by score range, so derive the band in
    code rather than trusting the model to keep the two consistent."""
    if score < 25:
        return "early_stage"
    if score < 50:
        return "developing"
    if score < 75:
        return "job_ready"
    return "highly_competitive"

SYSTEM = (
    GUARDRAILS
    + """

TASK: convert a full Skills Passport into a single 0-100 Career Readiness Score
that a student, a university, and an employer can all act on.

Dimensions and weights (report each in `breakdown` with score, max, and note):
  technical skills        30   depth and relevance to the target role
  practical experience    20   internships, part-time work, Tamheer placements
  certifications          15   verified credentials that employers recognise
  portfolio / projects    15   evidence the learner can actually build
  soft skills             10   communication, teamwork, problem solving
  market alignment        10   how well the profile matches real Saudi demand

Bands: 0-24 early_stage, 25-49 developing, 50-74 job_ready, 75-100 highly_competitive.

Rules:
- Unverified self-reported skills count for roughly half of a verified one. Say
  so where it materially moves the score.
- `highest_impact_next_step` is the single action with the best points-per-hour
  return. One action, specific, achievable in weeks not years.
- If `target_role` is absent, infer the most plausible one from the profile and
  say which you assumed.
- Explain like you are talking to the student. Direct, honest, not discouraging.

Return JSON:
{
  "readiness_score": 0-100,
  "band": "early_stage|developing|job_ready|highly_competitive",
  "breakdown": {"technical_skills": {"score": 0, "max": 30, "note": "..."},
                "experience": {"score": 0, "max": 20, "note": "..."},
                "certifications": {"score": 0, "max": 15, "note": "..."},
                "portfolio": {"score": 0, "max": 15, "note": "..."},
                "soft_skills": {"score": 0, "max": 10, "note": "..."},
                "market_alignment": {"score": 0, "max": 10, "note": "..."}},
  "strengths": ["..."],
  "weaknesses": ["..."],
  "highest_impact_next_step": "<one concrete action>",
  "explanation": "<3-5 sentences addressed to the student>",
  "assumed_target_role": "<only if you inferred it>"
}"""
)


def score_readiness(
    student: StudentProfile,
    target_role: str | None = None,
    job_market_context: str | None = None,
    use_policy_context: bool = True,
) -> dict[str, Any]:
    role = target_role or student.target_role
    grounding = ""
    if use_policy_context:
        grounding = policy_context(
            f"Saudi workforce readiness skills demand for {role or 'graduates'}", k=3
        )

    user = compose(
        block("SKILLS PASSPORT", dump(student)),
        block("TARGET ROLE", role),
        block("JOB MARKET CONTEXT", job_market_context),
        grounding,
    )
    result = complete_json_object(SYSTEM, user, max_tokens=2500)

    score = coerce_int(result.get("readiness_score"), 0, 100)
    if score is None:
        raise LLMError("The model returned no usable readiness_score.")
    result["readiness_score"] = score
    result["band"] = _band_for(score)
    result["explanation"] = str(result.get("explanation") or "")
    result["strengths"] = str_list(result.get("strengths"))
    result["weaknesses"] = str_list(result.get("weaknesses"))
    if not isinstance(result.get("breakdown"), dict):
        result["breakdown"] = {}
    return result
