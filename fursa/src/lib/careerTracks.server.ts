import "server-only";

// ---------------------------------------------------------------------------
// DB-backed career taxonomy (admin-editable)
// ---------------------------------------------------------------------------
// CAREER_TRACKS in "@/lib/careerTracks" remains the seed source and a
// defensive fallback (e.g. a fresh install that hasn't run
// `prisma/seed.ts` yet). Once CareerTrack rows exist in the database, they
// become the source of truth, so an admin can add a track or adjust skill
// weights from /admin/career-tracks without a code deploy.
//
// This module is intentionally separate from "@/lib/careerTracks": it pulls
// in Prisma (and therefore Node built-ins), so it must never be imported
// from a client component. The `server-only` import above turns any such
// mistake into a build-time error instead of a broken client bundle.

import { prisma } from "@/lib/db";
import { CAREER_TRACKS, getCareerTrack, type CareerTrack } from "@/lib/careerTracks";

type DbCareerTrackRow = {
  id: string;
  label: string;
  recommendedExperienceMonths: number;
  trackSkills: { weight: number; category: string; skill: { name: string } }[];
  trackCerts: { certification: { name: string } }[];
};

function mapDbTrack(row: DbCareerTrackRow): CareerTrack {
  return {
    id: row.id,
    label: row.label,
    recommendedExperienceMonths: row.recommendedExperienceMonths,
    technicalSkills: row.trackSkills
      .filter((s) => s.category === "technical")
      .map((s) => ({ name: s.skill.name, weight: Math.min(3, Math.max(1, s.weight)) as 1 | 2 | 3 })),
    softSkills: row.trackSkills
      .filter((s) => s.category === "soft")
      .map((s) => ({ name: s.skill.name, weight: Math.min(3, Math.max(1, s.weight)) as 1 | 2 | 3 })),
    certifications: row.trackCerts.map((c) => c.certification.name),
  };
}

const trackInclude = {
  trackSkills: { include: { skill: true } },
  trackCerts: { include: { certification: true } },
} as const;

export async function getAllCareerTracksAsync(): Promise<CareerTrack[]> {
  const rows = await prisma.careerTrack.findMany({
    include: trackInclude,
    orderBy: { label: "asc" },
  });
  if (rows.length === 0) return CAREER_TRACKS;
  return rows.map(mapDbTrack);
}

export async function getCareerTrackAsync(id: string): Promise<CareerTrack> {
  const row = await prisma.careerTrack.findUnique({
    where: { id },
    include: trackInclude,
  });
  if (row) return mapDbTrack(row);
  const rows = await prisma.careerTrack.findMany({ include: trackInclude });
  if (rows.length === 0) return getCareerTrack(id);
  return mapDbTrack(rows[0]);
}
