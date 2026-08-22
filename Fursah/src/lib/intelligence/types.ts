export type SkillCategory = "technical" | "soft";

export type RequirementType = "ESSENTIAL" | "PREFERRED";

export type SkillReference = {
    id: string;
    name: string;
    category: string;
};

export type WeightedSkill = SkillReference & {
    weight: number;
};

export type SkillDemand = SkillReference & {
    openRoleCount: number;
    essentialRoleCount: number;
    preferredRoleCount: number;
    demandPoints: number;
    demandShare: number;
};

export type SkillGap = {
    skillId: string;
    skillName: string;
    category: string;
    requiredWeight: number;
    currentLevel: number;
    gap: number;
    demandPoints: number;
    openRoleCount: number;
    priorityScore: number;
};

export type ReadinessComponent = {
    name: string;
    earned: number;
    possible: number;
    percentage: number;
    weight: number;
    detail: string;
    applicable: boolean;
};

export type StudentReadinessResult = {
    studentId: string;
    careerTrackId: string;
    careerTrackLabel: string;
    score: number;
    skillScore: number;
    certificationScore: number;
    experienceScore: number;
    portfolioScore: number;
    components: ReadinessComponent[];
    matchedSkills: WeightedSkill[];
    missingSkills: SkillGap[];
    matchedCertifications: string[];
    missingCertifications: string[];
    /** Submitted but not yet human-verified; reported, never scored. */
    unverifiedCertifications: string[];
    /** Recorded experience and portfolio evidence no human has approved. */
    unverifiedExperienceMonths: number;
    unverifiedProjectCount: number;
    /** The share of the above awaiting a decision rather than unsubmitted. */
    pendingExperienceMonths: number;
    pendingProjectCount: number;
    experienceMonths: number;
    recommendedExperienceMonths: number;
    projectCount: number;
    modelVersion: string;
    explanation: string[];
};

export type InterestSignalType =
    | "TARGET_CAREER"
    | "FAVORITE_TRACK"
    | "FAVORITE_COMPANY"
    | "BOOKMARKED_JOB"
    | "JOB_APPLICATION"
    | "ROADMAP_COMPLETED"
    | "ROADMAP_IN_PROGRESS"
    | "ROADMAP_STRUGGLING"
    | "ROADMAP_SKIPPED"
    | "ROADMAP_DISMISSED"
    | "VERIFIED_CERTIFICATION"
    | "SKILL_ALIGNMENT";

export type InterestSignal = {
    type: InterestSignalType;
    careerTrackId: string;
    value: number;
    reason: string;
};

export type CareerInterestResult = {
    careerTrackId: string;
    careerTrackLabel: string;
    score: number;
    positiveScore: number;
    negativeScore: number;
    /** Total number of signals observed, positive and negative. */
    evidenceStrength: number;
    /** Distinct kinds of positive signal; guards against one loud behaviour. */
    signalTypeCount: number;
    signals: InterestSignal[];
};

export type CareerRecommendation = {
    careerTrackId: string;
    careerTrackLabel: string;
    readinessScore: number;
    interestScore: number;
    marketDemandScore: number;
    recommendationScore: number;
    reasons: string[];
};

export type CareerDirectionSuggestion = {
    shouldSuggestChange: boolean;
    currentCareer: CareerRecommendation | null;
    suggestedCareer: CareerRecommendation | null;
    reason: string | null;
    /** Why the alternative is being surfaced. */
    supportingSignals: InterestSignal[];
    /** Observed disengagement from the current direction, if any. */
    disengagementSignals: InterestSignal[];
};

export type RoadmapRecommendationSource =
    | "SKILL_GAP"
    | "CERTIFICATION_GAP"
    | "EXPERIENCE_GAP"
    | "PORTFOLIO_GAP"
    | "UNIVERSITY_OFFERING";

export type RoadmapRecommendation = {
    title: string;
    category: string;
    careerTrackId: string;
    careerTrackLabel: string;
    skillId: string | null;
    skillName: string | null;
    offeringId: string | null;
    offeringProvider: string | null;
    /** Where the student can actually go to take it, when the catalogue records one. */
    offeringUrl: string | null;
    certificationId: string | null;
    source: RoadmapRecommendationSource;
    expectedImpact: number;
    recommendationScore: number;
    generatedAt: Date;
    reason: string;
};

export type StudentIntelligenceResult = {
    studentId: string;
    targetCareer: string;
    modelVersion: string;
    generatedAt: Date;
    readiness: StudentReadinessResult | null;
    /** Readiness against every configured career track, for career matching. */
    readinessByTrack: StudentReadinessResult[];
    careerMatches: CareerRecommendation[];
    interestProfiles: CareerInterestResult[];
    directionSuggestion: CareerDirectionSuggestion;
    skillGaps: SkillGap[];
    roadmapRecommendations: RoadmapRecommendation[];
    /** Recommendations not already present on the persisted roadmap. */
    newRoadmapRecommendations: RoadmapRecommendation[];
    /**
     * Points the score would gain if every current recommendation were
     * completed, computed jointly by the readiness engine rather than by
     * summing the individual figures, which double-counts changes sharing a
     * component.
     */
    combinedRecommendationGain: number;
    /** Points still available in the score: 100 minus the current score. */
    remainingHeadroom: number;
};

export type JobQualityResult = {
    jobId: string;
    score: number;
    completenessScore: number;
    requirementQualityScore: number;
    marketRealismScore: number;
    issues: string[];
    strengths: string[];
};

export type CandidateFit = {
    studentId: string;
    studentName: string;
    /** Same value the student saw before applying: one match score platform-wide. */
    score: number;
    essentialSkillScore: number;
    preferredSkillScore: number;
    certificationScore: number;
    experienceScore: number;
    matchedSkills: string[];
    missingEssentialSkills: string[];
    matchedCertifications: string[];
    missingCertifications: string[];
    experienceMonths: number;
    /** Months of experience whose evidence a human reviewer approved. */
    verifiedExperienceMonths: number;
    experienceGapMonths: number;
    verifiedCertificationCount: number;
    evidenceItems: number;
    verifiedEvidenceItems: number;
    explanation: string;
};

export type RecurringSkillGap = {
    skillName: string;
    applicantCount: number;
    sharePct: number;
};

export type EmployerJobIntelligence = {
    jobId: string;
    jobTitle: string;
    quality: JobQualityResult;
    candidatePoolSize: number;
    strongCandidateCount: number;
    applicantCount: number;
    hiringDifficulty: "LOW" | "MODERATE" | "HIGH";
    /** Every student profile scored against this role, best first. */
    candidateFits: CandidateFit[];
    /** Restricted to students who actually applied. */
    applicantFits: CandidateFit[];
    recurringGaps: RecurringSkillGap[];
    scarceSkills: SkillDemand[];
    insights: string[];
};

export type EmployerIntelligenceResult = {
    employerId: string;
    modelVersion: string;
    generatedAt: Date;
    openJobCount: number;
    totalCandidatePool: number;
    studentPoolSize: number;
    jobs: EmployerJobIntelligence[];
    topDemandedSkills: SkillDemand[];
    recurringGaps: RecurringSkillGap[];
};

export type UniversitySkillCoverage = {
    skillId: string;
    skillName: string;
    demandPoints: number;
    openRoleCount: number;
    covered: boolean;
    offeringIds: string[];
    offeringTitles: string[];
    /** Platform-wide students evidencing the skill at level 3 or above. */
    studentsWithSkill: number;
    /** Null when the institution's cohort is too small to report. */
    cohortMissingCount: number | null;
    cohortMissingSharePct: number | null;
};

export type UniversityGap = UniversitySkillCoverage & {
    priorityScore: number;
};

export type UniversityRecommendation = {
    type:
    | "ADD_OFFERING"
    | "EXPAND_OFFERING"
    | "REVIEW_CURRICULUM"
    | "MAINTAIN";
    skillId: string;
    skillName: string;
    priorityScore: number;
    reason: string;
    relatedOpenRoles: number;
    cohortMissingSharePct: number | null;
    /** True when an existing curriculum initiative already names this subject. */
    alreadyPlanned: boolean;
};

export type UniversityIntelligenceResult = {
    universityId: string;
    institution: string;
    modelVersion: string;
    generatedAt: Date;
    openRoleCount: number;
    requestedSkillCount: number;
    offeringCount: number;
    weightedDemandCoverage: number;
    coveredSkills: UniversitySkillCoverage[];
    gaps: UniversityGap[];
    /** Demanded, untaught, and missing across the cohort. */
    compoundedGaps: UniversityGap[];
    recommendations: UniversityRecommendation[];
    largestGap: UniversityGap | null;
    cohort: import("@/lib/cohort").CohortReadiness;
    curriculumActionCount: number;
    completedCurriculumActionCount: number;
    executiveSummary: string[];
};

export type MarketIntelligenceResult = {
    openRoleCount: number;
    totalDemandPoints: number;
    skills: SkillDemand[];
};
// ---------------------------------------------------------------------------
// Shared ecosystem intelligence
// ---------------------------------------------------------------------------

export type EcosystemSkillSignal = SkillDemand & {
    /** Students evidencing this skill at level 3 or above. */
    studentsWithSkill: number;
    /** Null when no open role requests the skill, so the ratio is undefined. */
    supplyPerOpenRole: number | null;
    taughtByUniversity: boolean;
    teachingInstitutions: string[];
};

export type EcosystemCareerTrackSignal = {
    careerTrackId: string;
    careerTrackLabel: string;
    openRoleCount: number;
    demandPoints: number;
    studentsTargeting: number;
    /** Withheld (null) for groups too small to describe without identifying. */
    averageReadiness: number | null;
};

export type EcosystemCertificationSignal = {
    certificationId: string;
    name: string;
    openRoleCount: number;
    verifiedHolders: number;
    offeredByUniversity: boolean;
};

export type EcosystemHardToFillRole = {
    jobId: string;
    jobTitle: string;
    careerTrack: string;
    essentialSkillCount: number;
    qualifiedStudents: number;
    applicationCount: number;
};

export type EcosystemIntelligenceResult = {
    modelVersion: string;
    generatedAt: Date;
    openRoleCount: number;
    employerCount: number;
    studentCount: number;
    scoredStudentCount: number;
    readinessReportable: boolean;
    averageReadiness: number | null;
    totalDemandPoints: number;
    universityCoveragePct: number | null;
    offeringCount: number;
    feedbackCount: number;
    applicationCount: number;
    placementCount: number;
    skills: EcosystemSkillSignal[];
    coverageGaps: EcosystemSkillSignal[];
    supplyGaps: EcosystemSkillSignal[];
    careerTracks: EcosystemCareerTrackSignal[];
    certifications: EcosystemCertificationSignal[];
    hardToFillRoles: EcosystemHardToFillRole[];
    summary: string[];
};
