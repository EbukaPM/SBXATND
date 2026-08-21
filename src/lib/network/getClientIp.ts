import type { NextRequest } from "next/server";

/**
 * The single, authoritative way to determine a request's source IP.
 *
 * On Netlify, requests reaching the app have already passed through Netlify's
 * edge, which sets `x-nf-client-connection-ip` to the actual TCP connection's
 * source IP — Netlify's own infrastructure sets this at the edge, so a client
 * cannot forge it by sending its own copy of the header. This is the
 * Netlify-documented mechanism for reading a trustworthy client IP inside a
 * Next.js Route Handler (there is no framework-level equivalent of Vercel's
 * `ipAddress()` helper, since IP resolution is platform-specific). Client-
 * controlled inputs — a raw `x-forwarded-for` parsed by hand, or any `ip`
 * field in a request body — must never be trusted for security decisions.
 *
 * Locally (no Netlify edge in front of the request), that header is absent,
 * so we fall back to `x-forwarded-for` for developer convenience. That
 * fallback path is NEVER reached in Netlify production traffic and must not
 * be relied on for security there.
 */
export function getClientIp(request: NextRequest | Request): string | null {
  return getClientIpFromHeaders(request.headers);
}

/**
 * Same logic as getClientIp, but for contexts that only have a Headers object —
 * Server Actions read the incoming request's headers via next/headers' `headers()`
 * rather than getting a Request object directly. Both paths see the identical
 * Netlify-set header, since a Server Action's POST still passes through the same
 * edge as any other request.
 */
export function getClientIpFromHeaders(headers: Headers): string | null {
  const fromNetlify = headers.get("x-nf-client-connection-ip");
  if (fromNetlify) return normalizeIp(fromNetlify);

  if (process.env.NODE_ENV !== "production") {
    const forwarded = headers.get("x-forwarded-for");
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
