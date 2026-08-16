import { randomBytes, createHash, createHmac, timingSafeEqual } from "crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/** One-time registration token shown to the admin, hashed with bcrypt before storage — same treatment as a password. */
export async function generateRegistrationToken(): Promise<{ token: string; hash: string }> {
  const token = randomBytes(24).toString("base64url");
  const hash = await hashPassword(token);
  return { token, hash };
}

export function verifyRegistrationToken(token: string, hash: string): Promise<boolean> {
  return verifyPassword(token, hash);
}

/**
 * Verifies an HMAC request signature from the network agent, with a timestamp
 * window to prevent replay of a captured heartbeat request.
 */
export function verifyAgentSignature(params: {
  payload: string;
  timestamp: string;
  signature: string;
  secret: string;
  maxSkewSeconds?: number;
}): boolean {
  const { payload, timestamp, signature, secret, maxSkewSeconds = 300 } = params;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const skew = Math.abs(Date.now() / 1000 - ts);
  if (skew > maxSkewSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== gotBuf.length) return false;
  return timingSafeEqual(expectedBuf, gotBuf);
}

export function generateAgentSigningSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
