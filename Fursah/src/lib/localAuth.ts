import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { firebaseAdminConfigured } from "./firebase-admin";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/**
 * Local email + password accounts.
 *
 * Firebase owns authentication wherever it is configured. Without the Admin
 * credential the sign-up form had nothing behind it, so a fresh checkout could
 * not create an account at all and the only way in was the prepared demo
 * switcher. This is the fallback for that case: real credentials, stored as a
 * salted scrypt hash on the existing User row, verified by this server.
 *
 * It deliberately does not run when Firebase is configured, so a deployment
 * cannot end up with two parallel credential stores for the same address.
 */
export function localAuthEnabled(): boolean {
  return !firebaseAdminConfigured;
}

/** `scrypt$<N>$<salt base64url>$<hash base64url>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${KEY_LENGTH}$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

/** Constant-time comparison. False for any malformed or absent hash. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, keyLength, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !keyLength || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const derived = await scrypt(password, Buffer.from(salt, "base64url"), Number(keyLength));
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export const PASSWORD_MIN_LENGTH = 8;

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Your password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}
