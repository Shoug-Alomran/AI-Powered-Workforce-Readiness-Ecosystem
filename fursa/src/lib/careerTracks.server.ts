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

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CAREER_TRACKS, getCareerTrack, type CareerTrack } from "@/lib/careerTracks";

// The taxonomy is global, small, and changes only when an administrator edits
// it on /admin/career-tracks, but almost every student, employer and university
// page reads it. Reading it from the database on every request made it one of
// the most repeated queries in the app, so it is cached across requests and
// invalidated explicitly by the admin actions that write it.
export const CAREER_TRACKS_TAG = "career-tracks";

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

const loadAllCareerTracks = unstable_cache(
  async (): Promise<CareerTrack[]> => {
    const rows = await prisma.careerTrack.findMany({
      include: trackInclude,
      orderBy: { label: "asc" },
    });
    if (rows.length === 0) return CAREER_TRACKS;
    return rows.map(mapDbTrack);
  },
  ["all-career-tracks"],
  { tags: [CAREER_TRACKS_TAG], revalidate: 3600 },
);

// `cache` on top of `unstable_cache` so that repeated calls within a single
// render share one result without even touching the cache handler.
export const getAllCareerTracksAsync = cache(loadAllCareerTracks);

export async function getCareerTrackAsync(id: string): Promise<CareerTrack> {
  // Served from the same cached list rather than its own query: the taxonomy is
  // a handful of rows, so filtering in memory beats a second round trip.
  const tracks = await getAllCareerTracksAsync();
  const match = tracks.find((track) => track.id === id);
  if (match) return match;
  if (tracks.length === 0) return getCareerTrack(id);
  return tracks[0];
}
