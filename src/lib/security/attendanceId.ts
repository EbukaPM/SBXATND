import { createHmac, randomInt } from "crypto";

// Excludes visually-ambiguous characters (0/O, 1/I/L) so printed IDs are easy to type correctly.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

/** Normalizes user input so the ID is effectively case-insensitive and whitespace-tolerant. */
export function normalizeAttendanceId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Deterministic keyed hash used both as the stored value and as the lookup key. */
export function hashAttendanceId(normalizedId: string): string {
  return createHmac("sha256", getSecret()).update(normalizedId).digest("hex");
}

/**
 * Generates a new random Attendance ID such as "ZUM-8F4K92": a short brand
 * prefix plus 6 characters from a 32-symbol alphabet (~2^30 combinations),
 * cryptographically random and not derived from any employee/database field.
 */
export function generateAttendanceId(prefix = "ATD"): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}

export interface GeneratedAttendanceId {
  plaintext: string;
  lookup: string;
}

/** Generates a new ID and its lookup hash, retrying on the (astronomically rare) chance of collision is the caller's job via a unique-constraint retry loop. */
export function createAttendanceIdCandidate(prefix?: string): GeneratedAttendanceId {
  const plaintext = generateAttendanceId(prefix);
  return { plaintext, lookup: hashAttendanceId(normalizeAttendanceId(plaintext)) };
}
