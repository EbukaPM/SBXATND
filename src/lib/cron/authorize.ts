import type { NextRequest } from "next/server";

/** Vercel Cron sends this header automatically when CRON_SECRET is set as a project env var. */
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // allow local testing without a secret configured
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
