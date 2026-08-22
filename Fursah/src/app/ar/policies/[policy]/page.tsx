import { permanentRedirect } from "next/navigation";
import { POLICY_SLUGS } from "@/lib/policies";

/**
 * This route used to hold a hand-written Arabic summary of each policy: three
 * short sections against the 54 clauses in the real documents. That gap is a
 * compliance problem rather than a content one — an Arabic reader was shown a
 * drastically abbreviated privacy notice while the English reader got the full
 * text, and the two drifted further apart with every edit.
 *
 * The runtime Arabic layer now covers every policy string (verified by
 * scripts/check-policy-translations.ts), so the canonical page renders the
 * complete policy in Arabic. `?lang=ar` selects the language before first
 * paint and is then remembered, which is what PreferencesControls already
 * supports for shareable Arabic links.
 */
export function generateStaticParams() {
  return POLICY_SLUGS.map(policy => ({ policy }));
}

export default async function ArabicPolicyRedirect({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const slug = POLICY_SLUGS.includes(policy) ? policy : "privacy";
  permanentRedirect(`/policies/${slug}?lang=ar`);
}
