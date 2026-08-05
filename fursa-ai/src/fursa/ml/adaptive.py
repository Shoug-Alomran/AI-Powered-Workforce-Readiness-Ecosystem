"""Adaptive learning: read a learner's progress history and re-route when stuck."""

from __future__ import annotations

from typing import Any

from ..llm import complete_json_object
from ..normalize import norm_choice, str_list
from ..schemas import StudentProfile
from ._common import GUARDRAILS, block, compose, dump

_STATUSES = {"on_track", "at_risk", "struggling", "ready_to_accelerate"}

SYSTEM = (
    GUARDRAILS
    + """

TASK: read a learner's progress history and decide whether their current path is
working. If it is not, propose concrete alternatives.

Signals to weigh (name the ones you actually used in `diagnosis`):
- repeated attempts at the same assessment without score improvement
- long gaps between activity, or a stalled in-progress course
- dropped or abandoned courses, especially several in one skill area
- time spent far above the course's expected duration
- scores trending down across a sequence
- consistently high scores finished fast -> the path is too easy, accelerate

Status: on_track | at_risk | struggling | ready_to_accelerate.

Rules:
- Distinguish "wrong difficulty" from "wrong modality" from "wrong prerequisite".
  A learner failing an advanced course may be missing a foundation, not ability.
- Each alternative path must be a genuinely different route to the SAME
  objective — a different modality (project-based, mentored, bootcamp,
  peer-learning), a different entry point, or a different sequence. Not the same
  path restated.
- `motivation_note` is written to the learner. Honest, warm, never patronising,
  never implying they are not capable.
- If the history is too thin to judge, say so in `diagnosis`, set status
  `on_track`, and ask for the specific data you would need.

Return JSON:
{
  "status": "on_track|at_risk|struggling|ready_to_accelerate",
  "diagnosis": "<2-4 sentences naming the evidence>",
  "alternative_paths": [{"name": "...", "approach": "...",
                         "why_this_fits": "...",
                         "first_step": "...",
                         "estimated_weeks": 0}],
  "recommended_adjustments": ["<specific changes to the current plan>"],
  "motivation_note": "<1-2 sentences to the learner>",
  "signals_detected": ["<the concrete patterns you found>"]
}"""
)


def suggest_adaptive_path(
    student: StudentProfile,
    progress_history: list[dict[str, Any]],
    current_path: list[str] | None = None,
    target_role: str | None = None,
) -> dict[str, Any]:
    user = compose(
        block("LEARNER PROFILE", dump(student)),
        block("TARGET ROLE", target_role or student.target_role),
        block("CURRENT LEARNING PATH", current_path or []),
        block("PROGRESS HISTORY (chronological)", progress_history),
    )
    result = complete_json_object(SYSTEM, user, max_tokens=2500)

    # "at_risk" as the fallback is deliberate: an unrecognised status should
    # prompt a human look, not read as all-clear.
    result["status"] = norm_choice(
        result.get("status"), _STATUSES, "at_risk",
        synonyms={"accel": "ready_to_accelerate", "strugg": "struggling", "track": "on_track"},
    )
    result["diagnosis"] = str(result.get("diagnosis") or "")
    result["alternative_paths"] = [
        p for p in (result.get("alternative_paths") or []) if isinstance(p, dict)
    ]
    result["recommended_adjustments"] = str_list(result.get("recommended_adjustments"))
    return result
