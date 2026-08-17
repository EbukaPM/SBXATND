import { createHmac, randomBytes } from "crypto";
import { nanoid } from "nanoid";

function getSecret(): string {
  const secret = process.env.QR_SECRET;
  if (!secret) throw new Error("QR_SECRET is not configured");
  return secret;
}

/** Keyed hash of the raw QR token — this is what's stored in the DB, never the token itself. */
export function hashQrToken(rawToken: string): string {
  return createHmac("sha256", getSecret()).update(rawToken).digest("hex");
}

export interface GeneratedQrToken {
  /** The secret value embedded in the QR/URL. Never persisted in plaintext. */
  rawToken: string;
  tokenHash: string;
  /** Short, non-secret reference shown in the admin UI (does not grant access on its own). */
  tokenIdentifier: string;
}

export function generateQrToken(): GeneratedQrToken {
  const rawToken = randomBytes(32).toString("base64url");
  return {
    rawToken,
    tokenHash: hashQrToken(rawToken),
    tokenIdentifier: nanoid(10),
  };
}

export function buildQrUrl(appUrl: string, rawToken: string): string {
  return `${appUrl.replace(/\/$/, "")}/register/qr/${rawToken}`;
}
