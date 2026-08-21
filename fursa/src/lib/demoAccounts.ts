/**
 * Which accounts the password-free demo shortcut is allowed to open.
 *
 * `loginAsUser` used to accept any user id. It is a server action, so anyone
 * who could name an id — and ids appear in the demo page's own markup — could
 * open a session as that account, including an account created through the
 * real Firebase sign-up flow. The shortcut is meant to open *prepared demo
 * accounts only*, so that is now enforced rather than assumed.
 *
 * Membership is decided by email domain because the alternative, a column on
 * User, would need a schema migration applied to the production database, and
 * the demo set is already defined by the domains the seed scripts use. The
 * seed and the guard import this same list, so they cannot disagree: a seeded
 * account is always openable, and nothing else ever is.
 */

/** Domains the seed scripts issue demo accounts on. */
export const DEMO_EMAIL_DOMAINS = [
  "example.com",
  "fursah.demo",
  "riyadhfintech.sa",
  "nexariya.sa",
  "sanadsecure.sa",
  "newventure.sa",
  "ksu.edu.sa",
  "psu.edu.sa",
] as const;

/** True when this address belongs to the prepared demo set. */
export function isDemoAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return DEMO_EMAIL_DOMAINS.some(allowed => domain === allowed);
}

/**
 * Whether the shortcut is available at all. Defaults to on so the prototype
 * demonstrates without extra configuration; setting DEMO_LOGIN_ENABLED=false
 * turns it off everywhere without a code change, which is what a production
 * launch would do.
 */
export function demoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED !== "false";
}
