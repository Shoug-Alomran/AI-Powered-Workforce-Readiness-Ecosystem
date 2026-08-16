// Idempotent sync of the career taxonomy in src/lib/careerTracks.ts into the
// database. Unlike prisma/seed.ts — which wipes and rebuilds every table — this
// only upserts career tracks and the skills/certifications they reference, so
// it is safe to run against a database that already holds real student data.
//
//   npx tsx scripts/sync-career-tracks.ts
//
// Existing tracks are updated in place (label, weights, certifications) and new
// ones are inserted. Tracks in the database that are no longer in the source
// list are reported but left alone, since students may already target them.

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { CAREER_TRACKS } from "../src/lib/careerTracks";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const skillIds = new Map<string, string>();
  const certIds = new Map<string, string>();

  async function skillId(name: string, category: "technical" | "soft") {
    const cached = skillIds.get(name);
    if (cached) return cached;
    const row = await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name, category },
    });
    skillIds.set(name, row.id);
    return row.id;
  }

  async function certId(name: string) {
    const cached = certIds.get(name);
    if (cached) return cached;
    const row = await prisma.certification.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    certIds.set(name, row.id);
    return row.id;
  }

  let created = 0;
  let updated = 0;

  for (const track of CAREER_TRACKS) {
    const existing = await prisma.careerTrack.findUnique({ where: { id: track.id } });
    await prisma.careerTrack.upsert({
      where: { id: track.id },
      update: { label: track.label, recommendedExperienceMonths: track.recommendedExperienceMonths },
      create: {
        id: track.id,
        label: track.label,
        recommendedExperienceMonths: track.recommendedExperienceMonths,
      },
    });
    existing ? updated++ : created++;

    const pairs = [
      ...track.technicalSkills.map((s) => ({ ...s, category: "technical" as const })),
      ...track.softSkills.map((s) => ({ ...s, category: "soft" as const })),
    ];
    for (const entry of pairs) {
      const id = await skillId(entry.name, entry.category);
      await prisma.careerTrackSkill.upsert({
        where: { careerTrackId_skillId: { careerTrackId: track.id, skillId: id } },
        update: { weight: entry.weight, category: entry.category },
        create: { careerTrackId: track.id, skillId: id, weight: entry.weight, category: entry.category },
      });
    }

    for (const name of track.certifications) {
      const id = await certId(name);
      await prisma.careerTrackCertification.upsert({
        where: { careerTrackId_certificationId: { careerTrackId: track.id, certificationId: id } },
        update: {},
        create: { careerTrackId: track.id, certificationId: id },
      });
    }
  }

  const sourceIds = new Set(CAREER_TRACKS.map((t) => t.id));
  const orphans = (await prisma.careerTrack.findMany({ select: { id: true, label: true } }))
    .filter((row) => !sourceIds.has(row.id));

  console.log(`Career tracks: ${created} created, ${updated} updated.`);
  console.log(`Skills touched: ${skillIds.size}. Certifications touched: ${certIds.size}.`);
  if (orphans.length) {
    console.log(`\nIn the database but not in careerTracks.ts (left untouched):`);
    for (const row of orphans) console.log(`  - ${row.id} (${row.label})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
