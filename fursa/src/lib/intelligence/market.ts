import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/db";
import type {
    MarketIntelligenceResult,
    SkillDemand,
} from "./types";
import {
    normalizeWeight,
    round,
} from "./scoring";

// Scans every open role and its skill requirements. The student, employer,
// university and ecosystem views all sit on top of it, and several of them are
// rendered together, so the scan is memoized for the length of a request.
export const getMarketIntelligence = cache(async (): Promise<MarketIntelligenceResult> => {
    const jobs = await prisma.job.findMany({
        where: {
            status: "open",
        },
        select: {
            id: true,
            requiredSkills: {
                select: {
                    weight: true,
                    requirementType: true,
                    skill: {
                        select: {
                            id: true,
                            name: true,
                            category: true,
                        },
                    },
                },
            },
        },
    });

    const demandMap = new Map<
        string,
        Omit<SkillDemand, "demandShare">
    >();

    for (const job of jobs) {
        for (const requirement of job.requiredSkills) {
            const skill = requirement.skill;

            const existing =
                demandMap.get(skill.id) ?? {
                    id: skill.id,
                    name: skill.name,
                    category: skill.category,
                    openRoleCount: 0,
                    essentialRoleCount: 0,
                    preferredRoleCount: 0,
                    demandPoints: 0,
                };

            existing.openRoleCount += 1;

            if (
                requirement.requirementType ===
                "PREFERRED"
            ) {
                existing.preferredRoleCount += 1;
            } else {
                existing.essentialRoleCount += 1;
            }

            const requirementMultiplier =
                requirement.requirementType ===
                    "PREFERRED"
                    ? 0.6
                    : 1;

            existing.demandPoints +=
                normalizeWeight(requirement.weight) *
                requirementMultiplier;

            demandMap.set(
                skill.id,
                existing
            );
        }
    }

    const totalDemandPoints = Array.from(
        demandMap.values()
    ).reduce(
        (sum, skill) =>
            sum + skill.demandPoints,
        0
    );

    const skills: SkillDemand[] =
        Array.from(demandMap.values())
            .map((skill) => ({
                ...skill,
                demandPoints: round(
                    skill.demandPoints,
                    2
                ),
                demandShare:
                    totalDemandPoints > 0
                        ? round(
                            (skill.demandPoints /
                                totalDemandPoints) *
                            100,
                            1
                        )
                        : 0,
            }))
            .sort(
                (a, b) =>
                    b.demandPoints -
                    a.demandPoints
            );

    return {
        openRoleCount: jobs.length,
        totalDemandPoints: round(
            totalDemandPoints,
            2
        ),
        skills,
    };
});

export async function getTopDemandedSkills(
    limit = 10
) {
    const market =
        await getMarketIntelligence();

    return market.skills.slice(
        0,
        Math.max(0, limit)
    );
}

export async function getDemandForSkill(
    skillId: string
) {
    const market =
        await getMarketIntelligence();

    return (
        market.skills.find(
            (skill) => skill.id === skillId
        ) ?? null
    );
}