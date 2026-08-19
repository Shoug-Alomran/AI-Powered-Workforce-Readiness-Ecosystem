export function clamp(
    value: number,
    min = 0,
    max = 100
) {
    return Math.min(max, Math.max(min, value));
}

export function round(
    value: number,
    decimals = 0
) {
    const factor = 10 ** decimals;

    return Math.round(value * factor) / factor;
}

export function percentage(
    earned: number,
    possible: number
) {
    if (possible <= 0) {
        return 0;
    }

    return clamp(
        Math.round((earned / possible) * 100)
    );
}

export function weightedAverage(
    values: Array<{
        value: number;
        weight: number;
    }>
) {
    const usable = values.filter(
        (item) =>
            Number.isFinite(item.value) &&
            Number.isFinite(item.weight) &&
            item.weight > 0
    );

    const totalWeight = usable.reduce(
        (sum, item) => sum + item.weight,
        0
    );

    if (totalWeight === 0) {
        return 0;
    }

    return (
        usable.reduce(
            (sum, item) =>
                sum + item.value * item.weight,
            0
        ) / totalWeight
    );
}

export function normalizeSkillName(
    value: string
) {
    return value
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/[._/\\-]+/g, " ")
        .replace(/\s+/g, " ");
}

export function normalizeCareerTrackId(
    value: string
) {
    return value
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function normalizeWeight(
    weight: number
) {
    if (!Number.isFinite(weight)) {
        return 1;
    }

    return Math.max(
        1,
        Math.min(3, Math.round(weight))
    );
}

export function normalizeStudentLevel(
    level: number
) {
    if (!Number.isFinite(level)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(5, Math.round(level))
    );
}

export function skillProficiencyScore(
    studentLevel: number,
    requirementWeight: number
) {
    const level =
        normalizeStudentLevel(studentLevel);

    const weight =
        normalizeWeight(requirementWeight);

    const expectedLevel =
        weight === 3 ? 4 : weight === 2 ? 3 : 2;

    return clamp(
        Math.round(
            (level / expectedLevel) * 100
        )
    );
}

export function scoreLabel(
    score: number
) {
    if (score >= 80) return "STRONG";
    if (score >= 60) return "MODERATE";
    return "DEVELOPING";
}

export function hiringDifficultyFromPool(
    strongCandidates: number
): "LOW" | "MODERATE" | "HIGH" {
    if (strongCandidates >= 10) {
        return "LOW";
    }

    if (strongCandidates >= 4) {
        return "MODERATE";
    }

    return "HIGH";
}