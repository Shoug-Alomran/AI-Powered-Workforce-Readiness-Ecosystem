// ---------------------------------------------------------------------------
// Curriculum intelligence: turns live employer demand, the institution's own
// offerings, and the career-track catalogue into the alignment figures the
// university workspace reports.
//
// Everything here is deterministic and traceable to a database row. No figure
// is invented: when the data cannot support a number, the caller is given a
// null and the UI omits the stat rather than guessing.
// ---------------------------------------------------------------------------

/** A PREFERRED requirement counts, but not as heavily as an ESSENTIAL one. */
const PREFERRED_MULTIPLIER = 0.6;

export type JobForCurriculum = {
  requiredSkills: { weight: number; requirementType: string | null; skill: { name: string; category: string } }[];
  requiredCerts: { certification: { name: string } }[];
};

export type OfferingForCurriculum = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  url: string | null;
  createdAt: Date;
  certification: { name: string } | null;
  skills: { skill: { name: string; category: string } }[];
};

export type TrackForCurriculum = {
  id: string;
  label: string;
  trackSkills: { weight: number; skill: { name: string } }[];
};

export type StudentForCurriculum = { targetCareer: string; university: string | null };

export type CertificationForCurriculum = { id: string; name: string; org: string | null };

export type DemandSkill = {
  name: string;
  category: string;
  /** Weighted demand across open roles: essential weights count fully, preferred at 60%. */
  weight: number;
  /** How many distinct open roles ask for this skill. */
  jobCount: number;
  covered: boolean;
};

export type TrackImpact = { id: string; label: string; coveragePct: number };

export type OfferingInsight = {
  offering: OfferingForCurriculum;
  /** The offering's skills that at least one open role currently asks for. */
  inDemandSkills: string[];
  /** Skills it teaches that no open role currently asks for. */
  unrequestedSkills: string[];
  /** Share of this offering's own skills that employers currently request. */
  alignmentPct: number | null;
  /** Share of total market demand weight this single offering addresses. */
  demandSharePct: number;
  /** The tracks it moves the needle on, best first. */
  trackImpact: TrackImpact[];
  /** Students at this institution aiming at a track this offering serves. */
  studentsTargeting: number;
  /** Certifications demanded by roles that also want this offering's skills. */
  relatedCertifications: string[];
  /** Generated from the figures above, never prewritten copy. */
  analysis: string;
  /** The highest-value skill this offering could add, if there is one. */
  suggestedAddition: DemandSkill | null;
};

export type CertificationInsight = {
  name: string;
  org: string | null;
  /** Open roles that require this certification. */
  demandCount: number;
  /** Whether one of the institution's offerings grants it. */
  offered: boolean;
  offeringTitle: string | null;
};

export type CurriculumIntelligence = {
  totalDemandWeight: number;
  coveragePct: number | null;
  demandSkills: DemandSkill[];
  /** Demanded skills nothing in the catalogue teaches, most valuable first. */
  gaps: DemandSkill[];
  offerings: OfferingInsight[];
  certifications: CertificationInsight[];
  byCategory: { category: string; covered: number; total: number }[];
  counts: { courses: number; certifications: number; skillsTaught: number; tracks: number; openRoles: number };
  studentsAtInstitution: number;
  /** One computed sentence for the executive banner. */
  summary: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function computeCurriculumIntelligence(input: {
  offerings: OfferingForCurriculum[];
  jobs: JobForCurriculum[];
  tracks: TrackForCurriculum[];
  students: StudentForCurriculum[];
  certifications: CertificationForCurriculum[];
  institution: string;
}): CurriculumIntelligence {
  const { offerings, jobs, tracks, students, certifications, institution } = input;

  // ---- Demand ------------------------------------------------------------
  const demandMap = new Map<string, DemandSkill>();
  for (const job of jobs) {
    for (const requirement of job.requiredSkills) {
      const key = normalize(requirement.skill.name);
      const multiplier = requirement.requirementType === "PREFERRED" ? PREFERRED_MULTIPLIER : 1;
      const entry = demandMap.get(key) ?? {
        name: requirement.skill.name,
        category: requirement.skill.category,
        weight: 0,
        jobCount: 0,
        covered: false,
      };
      entry.weight += requirement.weight * multiplier;
      entry.jobCount += 1;
      demandMap.set(key, entry);
    }
  }

  // ---- Coverage ----------------------------------------------------------
  const taught = new Map<string, string[]>();
  for (const offering of offerings) {
    for (const { skill } of offering.skills) {
      const key = normalize(skill.name);
      taught.set(key, [...(taught.get(key) ?? []), offering.title]);
    }
  }
  for (const [key, entry] of demandMap) entry.covered = taught.has(key);

  const demandSkills = [...demandMap.values()].sort((a, b) => b.weight - a.weight);
  const totalDemandWeight = demandSkills.reduce((sum, skill) => sum + skill.weight, 0);
  const coveredWeight = demandSkills.filter((s) => s.covered).reduce((sum, skill) => sum + skill.weight, 0);
  const coveragePct = totalDemandWeight > 0 ? Math.round((coveredWeight / totalDemandWeight) * 100) : null;
  const gaps = demandSkills.filter((skill) => !skill.covered);

  // ---- Certifications demanded by open roles -----------------------------
  const certDemand = new Map<string, number>();
  for (const job of jobs) {
    for (const { certification } of job.requiredCerts) {
      const key = normalize(certification.name);
      certDemand.set(key, (certDemand.get(key) ?? 0) + 1);
    }
  }
  const offeredCerts = new Map<string, string>();
  for (const offering of offerings) {
    if (offering.certification) offeredCerts.set(normalize(offering.certification.name), offering.title);
  }
  const certificationInsights: CertificationInsight[] = certifications
    .map((certification) => {
      const key = normalize(certification.name);
      return {
        name: certification.name,
        org: certification.org,
        demandCount: certDemand.get(key) ?? 0,
        offered: offeredCerts.has(key),
        offeringTitle: offeredCerts.get(key) ?? null,
      };
    })
    .filter((entry) => entry.demandCount > 0 || entry.offered)
    .sort((a, b) => b.demandCount - a.demandCount);

  // ---- Students at this institution --------------------------------------
  const institutionKey = normalize(institution);
  const localStudents = students.filter((student) => student.university && normalize(student.university) === institutionKey);

  // ---- Per-offering insight ----------------------------------------------
  const trackSkillIndex = tracks.map((track) => ({
    track,
    total: track.trackSkills.reduce((sum, entry) => sum + entry.weight, 0),
    skills: new Map(track.trackSkills.map((entry) => [normalize(entry.skill.name), entry.weight])),
  }));

  const offeringInsights: OfferingInsight[] = offerings.map((offering) => {
    const skillNames = offering.skills.map((entry) => entry.skill.name);
    const inDemandSkills = skillNames.filter((name) => demandMap.has(normalize(name)));
    const unrequestedSkills = skillNames.filter((name) => !demandMap.has(normalize(name)));
    const alignmentPct = skillNames.length ? Math.round((inDemandSkills.length / skillNames.length) * 100) : null;
    const addressedWeight = inDemandSkills.reduce((sum, name) => sum + (demandMap.get(normalize(name))?.weight ?? 0), 0);
    const demandSharePct = totalDemandWeight > 0 ? Math.round((addressedWeight / totalDemandWeight) * 100) : 0;

    const trackImpact: TrackImpact[] = trackSkillIndex
      .map(({ track, total, skills }) => {
        const covered = skillNames.reduce((sum, name) => sum + (skills.get(normalize(name)) ?? 0), 0);
        return { id: track.id, label: track.label, coveragePct: total > 0 ? Math.round((covered / total) * 100) : 0 };
      })
      .filter((entry) => entry.coveragePct > 0)
      .sort((a, b) => b.coveragePct - a.coveragePct)
      .slice(0, 2);

    const servedTrackIds = new Set(trackImpact.map((entry) => entry.id));
    const studentsTargeting = localStudents.filter((student) => servedTrackIds.has(student.targetCareer)).length;

    const offeringSkillKeys = new Set(skillNames.map(normalize));
    const relatedCertifications = certificationInsights
      .filter((entry) => entry.demandCount > 0)
      .filter((entry) =>
        jobs.some(
          (job) =>
            job.requiredCerts.some((c) => normalize(c.certification.name) === normalize(entry.name)) &&
            job.requiredSkills.some((s) => offeringSkillKeys.has(normalize(s.skill.name))),
        ),
      )
      .map((entry) => entry.name);

    // The most valuable skill this offering could add: highest-demand gap that
    // the tracks this offering already serves actually require.
    const servedTrackSkillKeys = new Set(
      trackSkillIndex
        .filter(({ track }) => servedTrackIds.has(track.id))
        .flatMap(({ skills }) => [...skills.keys()]),
    );
    const suggestedAddition =
      gaps.find((gap) => servedTrackSkillKeys.has(normalize(gap.name))) ?? gaps[0] ?? null;

    const sentences: string[] = [];
    if (inDemandSkills.length) {
      sentences.push(
        `Teaches ${inDemandSkills.length} of the ${skillNames.length} skill(s) on this syllabus that open roles currently request (${inDemandSkills.join(", ")}).`,
      );
    } else if (skillNames.length) {
      sentences.push(`None of the ${skillNames.length} skill(s) on this syllabus appear in any currently open role.`);
    } else {
      sentences.push("No skills are mapped to this offering yet, so it cannot be aligned against employer demand.");
    }
    if (trackImpact.length) {
      const best = trackImpact[0];
      sentences.push(`Covers ${best.coveragePct}% of the ${best.label} track requirements.`);
    }
    if (suggestedAddition) {
      sentences.push(
        `Highest-value addition: ${suggestedAddition.name}, requested by ${suggestedAddition.jobCount} open role(s) and not taught by any current offering.`,
      );
    }

    return {
      offering,
      inDemandSkills,
      unrequestedSkills,
      alignmentPct,
      demandSharePct,
      trackImpact,
      studentsTargeting,
      relatedCertifications,
      analysis: sentences.join(" "),
      suggestedAddition,
    };
  });

  offeringInsights.sort((a, b) => (b.alignmentPct ?? -1) - (a.alignmentPct ?? -1));

  // ---- Category rollup ---------------------------------------------------
  const categoryMap = new Map<string, { covered: number; total: number }>();
  for (const skill of demandSkills) {
    const entry = categoryMap.get(skill.category) ?? { covered: 0, total: 0 };
    entry.total += 1;
    if (skill.covered) entry.covered += 1;
    categoryMap.set(skill.category, entry);
  }
  const byCategory = [...categoryMap.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.total - a.total);

  // ---- Executive summary -------------------------------------------------
  let summary: string;
  if (!jobs.length) {
    summary = "No open roles are published yet, so curriculum alignment cannot be measured against live employer demand.";
  } else if (!offerings.length) {
    summary = `Employers are currently requesting ${demandSkills.length} distinct skill(s) across ${jobs.length} open role(s). Add your first course or certification to begin measuring alignment.`;
  } else {
    const leadGap = gaps[0];
    summary =
      `Your catalogue covers ${coveragePct}% of weighted employer demand across ${jobs.length} open role(s) and ${demandSkills.length} distinct requested skill(s).` +
      (leadGap
        ? ` The largest single gap is ${leadGap.name}, requested by ${leadGap.jobCount} role(s) with no offering covering it.`
        : " Every requested skill is covered by at least one offering.");
  }

  return {
    totalDemandWeight,
    coveragePct,
    demandSkills,
    gaps,
    offerings: offeringInsights,
    certifications: certificationInsights,
    byCategory,
    counts: {
      courses: offerings.filter((o) => o.type === "course").length,
      certifications: offerings.filter((o) => o.type === "certification").length,
      skillsTaught: taught.size,
      tracks: tracks.length,
      openRoles: jobs.length,
    },
    studentsAtInstitution: localStudents.length,
    summary,
  };
}
