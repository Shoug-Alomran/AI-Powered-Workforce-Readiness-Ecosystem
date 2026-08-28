/**
 * How complete and realistic a role's requirements are.
 *
 * Lives on its own, and free of `server-only`, because two surfaces need the
 * answer: the employer drafting a role and the employer reading it after it is
 * published. Those used to be two different calculations. The draft-time panel
 * ran its own heuristic in the browser and called the result an "AI Quality
 * Score"; this function produced "Requirement quality" on the published role.
 * They disagreed by 13 to 50 points on every role in the demo data, so an
 * employer polished a draft to 75 and then saw 100, or to 45 and then saw 95.
 *
 * One function now answers the question wherever it is asked. It is pure and
 * deterministic: same inputs, same score, on the server or in the browser.
 */
import { clamp, weightedAverage } from "./scoring";
import type { JobQualityResult } from "./types";

export type JobQualityInput = {
    id: string;
    title: string;
    careerTrack: string;
    description: string | null;
    minExperience: number;
    requiredSkills: Array<{ weight: number; requirementType: string }>;
    requiredCerts: Array<{ certificationId: string }>;
};

export function evaluateJobQuality(job: JobQualityInput): JobQualityResult {
    const issues: string[] = [];
    const strengths: string[] = [];

    let completeness = 0;

    if (job.title.trim()) completeness += 20;
    if (job.careerTrack.trim()) completeness += 20;

    if (job.description && job.description.trim().length >= 80) {
        completeness += 30;
        strengths.push("The job includes a substantive description.");
    } else {
        issues.push("Add a more detailed job description.");
    }

    if (job.requiredSkills.length > 0) {
        completeness += 30;
        strengths.push("The job has structured skill requirements.");
    } else {
        issues.push("No structured skill requirements are attached.");
    }

    const hasEssential = job.requiredSkills.some((skill) => skill.requirementType === "ESSENTIAL");
    const hasPreferred = job.requiredSkills.some((skill) => skill.requirementType === "PREFERRED");

    let requirementQuality = 50;

    if (hasEssential) {
        requirementQuality += 25;
    } else if (job.requiredSkills.length > 0) {
        issues.push("Consider distinguishing essential requirements.");
    }

    if (hasPreferred) requirementQuality += 15;

    if (job.requiredSkills.length <= 12) {
        requirementQuality += 10;
    } else {
        issues.push(
            "The job contains a large number of skill requirements; review whether every requirement is necessary."
        );
    }

    requirementQuality = clamp(requirementQuality);

    let marketRealism = 100;

    if (job.minExperience > 60) {
        marketRealism -= 20;
        issues.push(
            "The minimum experience requirement is relatively high and may reduce the available candidate pool."
        );
    }

    if (job.requiredSkills.filter((skill) => skill.requirementType === "ESSENTIAL").length > 8) {
        marketRealism -= 20;
        issues.push("A high number of essential skills may make this role difficult to fill.");
    }

    marketRealism = clamp(marketRealism);

    const score = Math.round(
        weightedAverage([
            { value: completeness, weight: 0.4 },
            { value: requirementQuality, weight: 0.35 },
            { value: marketRealism, weight: 0.25 },
        ])
    );

    return {
        jobId: job.id,
        score,
        completenessScore: completeness,
        requirementQualityScore: requirementQuality,
        marketRealismScore: marketRealism,
        issues,
        strengths,
    };
}

