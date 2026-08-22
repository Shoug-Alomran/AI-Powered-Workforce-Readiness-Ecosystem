/**
 * Removes accounts left behind by automated test runs.
 *
 * A throwaway account created by a test harness is indistinguishable from a
 * real one to every aggregate on the platform: four of them listing King Saud
 * University sat inside that institution's published cohort figures, moving the
 * average readiness a university would act on. Aggregates cannot defend
 * themselves against this, so the records have to be removed.
 *
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/cleanup-test-accounts.ts          # dry run
 *   npx tsx --require ./scripts/allow-server-only.cjs scripts/cleanup-test-accounts.ts --apply
 *
 * Deliberately conservative. Only addresses on a reserved test domain qualify:
 * `.local` and `.test` are reserved by RFC 6761/2606 and can never belong to a
 * real person, so this cannot delete a genuine account by mistake. Demo
 * accounts (example.com, fursah.demo, the institution domains) are explicitly
 * out of scope and are never touched. Everything selected is printed before
 * anything is deleted, and a dry run is the default.
 */
import { prisma } from "../src/lib/db";
import { isDemoAccountEmail } from "../src/lib/demoAccounts";

const APPLY = process.argv.includes("--apply");

/**
 * Domains that cannot resolve to a real mailbox. RFC 6761 reserves `.test`
 * and `.localhost`; RFC 2606 reserves `.example`, `.invalid` and `.test`;
 * `.local` is reserved for multicast DNS. An address on one of these is a
 * fixture by construction.
 */
const RESERVED_TEST_SUFFIXES = [".local", ".test", ".invalid", ".localhost", ".example"];

export function isReservedTestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  // A prepared demo account always wins, even in the impossible case that one
  // is ever issued on a reserved domain.
  if (isDemoAccountEmail(email)) return false;
  return RESERVED_TEST_SUFFIXES.some((suffix) => domain === suffix.slice(1) || domain.endsWith(suffix));
}

async function main() {
  const users = await prisma.user.findMany({
    include: {
      student: { select: { id: true, university: true, targetCareer: true } },
      employer: { select: { id: true, company: true, _count: { select: { jobs: true } } } },
      university: { select: { id: true, institution: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const doomed = users.filter((user) => isReservedTestEmail(user.email));

  if (!doomed.length) {
    console.log("No accounts on a reserved test domain. Nothing to remove.");
    return;
  }

  console.log(`${doomed.length} account(s) on a reserved test domain:\n`);
  for (const user of doomed) {
    const owns = [
      user.student ? `student listing ${user.student.university ?? "no institution"}` : null,
      user.employer ? `employer "${user.employer.company}" with ${user.employer._count.jobs} role(s)` : null,
      user.university ? `university "${user.university.institution}"` : null,
    ].filter(Boolean);
    console.log(`  ${user.createdAt.toISOString()}  ${user.role.padEnd(10)} ${user.email}`);
    console.log(`      ${owns.length ? owns.join(" · ") : "no role profile"}`);
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to delete these accounts and everything cascading from them.");
    return;
  }

  // Every role profile, application, skill and document cascades from User.
  const result = await prisma.user.deleteMany({ where: { id: { in: doomed.map((user) => user.id) } } });
  console.log(`\nRemoved ${result.count} test account(s) and all records cascading from them.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
