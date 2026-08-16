import { ipAddress } from "@vercel/functions";
import type { NextRequest } from "next/server";

/**
 * The single, authoritative way to determine a request's source IP.
 *
 * On Vercel, `@vercel/functions`'s `ipAddress()` reads the IP that Vercel's own
 * edge network recorded for the connection — not an arbitrary client-supplied
 * header. Client-controlled headers (a raw `x-forwarded-for` parsed by hand,
 * or any `ip` field in a request body) must never be trusted for security
 * decisions; a spoofed request can set both to anything.
 *
 * Locally (no Vercel edge in front of the request), ipAddress() returns
 * undefined, so we fall back to `x-forwarded-for` for developer convenience.
 * That fallback path is NEVER reached in Vercel production traffic and must
 * not be relied on for security there.
 */
export function getClientIp(request: NextRequest | Request): string | null {
  const fromVercel = ipAddress(request);
  if (fromVercel) return normalizeIp(fromVercel);

  if (process.env.NODE_ENV !== "production") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return normalizeIp(forwarded.split(",")[0]!.trim());
    return "127.0.0.1";
  }

  return null;
}

/** Strips IPv6 zone IDs and the `::ffff:` v4-mapped prefix so comparisons are consistent. */
export function normalizeIp(ip: string): string {
  let out = ip.trim();
  const zoneIdx = out.indexOf("%");
  if (zoneIdx !== -1) out = out.slice(0, zoneIdx);
  if (out.toLowerCase().startsWith("::ffff:")) out = out.slice(7);
  return out;
}
