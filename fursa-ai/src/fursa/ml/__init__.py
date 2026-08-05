"""The five Claude-powered reasoning functions behind Fursa.

matching     — job requirements + skills passport -> explainable match score
courses      — skill gaps + course catalog        -> impact-ranked learning path
readiness    — full skills passport               -> 0-100 career readiness score
adaptive     — learner progress history           -> alternative paths when stuck
forecasting  — historical job postings            -> trending / declining skills

Every function returns an explanation alongside its numbers. That is a product
requirement, not a nicety: SDAIA's AI Ethics Principles (KB-003) require
transparency and contestability for AI that affects a person's opportunities.
"""

from .adaptive import suggest_adaptive_path
from .courses import recommend_courses
from .forecasting import forecast_skill_trends
from .matching import match_candidate
from .readiness import score_readiness

__all__ = [
    "match_candidate",
    "recommend_courses",
    "score_readiness",
    "suggest_adaptive_path",
    "forecast_skill_trends",
]
