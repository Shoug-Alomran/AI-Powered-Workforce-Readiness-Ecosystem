"""Request/response contracts for the frontend team.

Response models are intentionally permissive (`extra="allow"`) so the reasoning
layer can enrich a payload without a backend release; the documented fields are
guaranteed, anything extra is a bonus.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# ────────────────────────────── shared ──────────────────────────────


class Skill(BaseModel):
    name: str
    level: Literal["beginner", "intermediate", "advanced", "expert"] | None = None
    years: float | None = None
    verified: bool = False


class Certification(BaseModel):
    name: str
    issuer: str | None = None
    year: int | None = None
    verified: bool = False


class Experience(BaseModel):
    title: str
    organization: str | None = None
    months: int = 0
    description: str | None = None


class Project(BaseModel):
    name: str
    description: str | None = None
    skills_used: list[str] = Field(default_factory=list)
    url: str | None = None


class StudentProfile(BaseModel):
    """The Skills Passport."""

    student_id: str | None = None
    name: str | None = None
    target_role: str | None = Field(None, description="e.g. 'Data Analyst'")
    education_level: str | None = None
    major: str | None = None
    university: str | None = None
    graduation_year: int | None = None
    skills: list[Skill] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    preferred_locations: list[str] = Field(default_factory=list)


class JobRequirements(BaseModel):
    job_id: str | None = None
    title: str
    employer: str | None = None
    sector: str | None = None
    location: str | None = None
    description: str | None = None
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    required_certifications: list[str] = Field(default_factory=list)
    min_experience_months: int = 0
    education_requirement: str | None = None
    is_entry_level: bool = True


class Course(BaseModel):
    course_id: str | None = None
    title: str
    provider: str | None = Field(None, description="e.g. Doroob, TVTC, Coursera")
    skills_taught: list[str] = Field(default_factory=list)
    duration_hours: float | None = None
    level: str | None = None
    cost_sar: float | None = None
    is_free: bool = False
    certification_awarded: str | None = None
    url: str | None = None


# ───────────────────────────── requests ─────────────────────────────


class MatchRequest(BaseModel):
    job: JobRequirements
    student: StudentProfile
    explain: bool = Field(True, description="Include the natural-language rationale.")


class RecommendCoursesRequest(BaseModel):
    skill_gaps: list[str] = Field(..., description="Gap skill names, e.g. from /api/match")
    course_catalog: list[Course] = Field(default_factory=list)
    student: StudentProfile | None = None
    target_role: str | None = None
    max_recommendations: int = 5
    constraints: dict[str, Any] = Field(
        default_factory=dict,
        description="Free-form, e.g. {'max_hours_per_week': 6, 'budget_sar': 0}",
    )


class ReadinessScoreRequest(BaseModel):
    student: StudentProfile
    target_role: str | None = None
    job_market_context: str | None = Field(
        None, description="Optional demand signals to weight the score against."
    )


class AdaptiveLearningRequest(BaseModel):
    student: StudentProfile
    progress_history: list[dict[str, Any]] = Field(
        ...,
        description=(
            "Chronological learning events. Any shape; useful keys: course_id, "
            "title, skill, status, score, attempts, started_at, completed_at, "
            "time_spent_hours, dropped."
        ),
    )
    current_path: list[str] = Field(default_factory=list)
    target_role: str | None = None


class SkillTrendsRequest(BaseModel):
    job_postings: list[dict[str, Any]] = Field(
        ...,
        description=(
            "Historical postings. Useful keys: title, sector, posted_at (ISO date), "
            "region, required_skills[], count."
        ),
    )
    horizon_months: int = 12
    sector: str | None = None
    region: str | None = None


class AskKBRequest(BaseModel):
    question: str
    top_k: int | None = None
    kb_ids: list[str] | None = Field(
        None, description="Restrict retrieval to specific documents, e.g. ['KB-010']."
    )


# ───────────────────────────── responses ────────────────────────────


class _Open(BaseModel):
    model_config = ConfigDict(extra="allow")


class SkillGap(_Open):
    skill: str
    importance: Literal["critical", "important", "nice_to_have"] = "important"
    student_level: str | None = None
    required_level: str | None = None
    closable_in_weeks: int | None = None


class MatchResponse(_Open):
    match_score: int = Field(..., ge=0, le=100)
    verdict: Literal["strong_match", "promising", "developing", "not_yet_ready"]
    explanation: str
    matched_skills: list[str] = Field(default_factory=list)
    gaps: list[SkillGap] = Field(default_factory=list)
    breakdown: dict[str, Any] = Field(default_factory=dict)
    recommended_next_actions: list[str] = Field(default_factory=list)
    fairness_note: str | None = None


class CourseRecommendation(_Open):
    course_id: str | None = None
    title: str
    rank: int
    closes_gaps: list[str] = Field(default_factory=list)
    impact_score: int = Field(..., ge=0, le=100)
    rationale: str
    estimated_readiness_gain: int | None = None
    sequence_note: str | None = None


class RecommendCoursesResponse(_Open):
    recommendations: list[CourseRecommendation] = Field(default_factory=list)
    uncovered_gaps: list[str] = Field(default_factory=list)
    learning_path_summary: str | None = None


class ReadinessScoreResponse(_Open):
    readiness_score: int = Field(..., ge=0, le=100)
    band: Literal["early_stage", "developing", "job_ready", "highly_competitive"]
    breakdown: dict[str, Any] = Field(default_factory=dict)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    highest_impact_next_step: str | None = None
    explanation: str


class AdaptiveLearningResponse(_Open):
    status: Literal["on_track", "at_risk", "struggling", "ready_to_accelerate"]
    diagnosis: str
    alternative_paths: list[dict[str, Any]] = Field(default_factory=list)
    recommended_adjustments: list[str] = Field(default_factory=list)
    motivation_note: str | None = None


class SkillTrendsResponse(_Open):
    trending_up: list[dict[str, Any]] = Field(default_factory=list)
    trending_down: list[dict[str, Any]] = Field(default_factory=list)
    stable: list[dict[str, Any]] = Field(default_factory=list)
    emerging: list[dict[str, Any]] = Field(default_factory=list)
    horizon_months: int = 12
    curriculum_implications: list[str] = Field(default_factory=list)
    summary: str | None = None
    data_window: dict[str, Any] = Field(default_factory=dict)


class AskKBResponse(_Open):
    answer: str
    citations: list[str] = Field(default_factory=list)
    confidence: Literal["high", "medium", "low"] = "medium"
    grounded: bool = True
    follow_up_questions: list[str] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
