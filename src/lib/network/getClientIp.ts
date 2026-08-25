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
 * Self-hosted behind your own reverse proxy (nginx/Traefik/HAProxy) instead of
 * Netlify: set TRUSTED_IP_HEADER to whatever header YOUR proxy sets from the
 * real TCP connection (e.g. "x-real-ip"). This is only safe if the proxy is
 * configured to overwrite that header on every request rather than pass through
 * whatever the client sent — see deploy/nginx.conf, which does this correctly
 * (`proxy_set_header X-Real-IP $remote_addr;` always replaces, never appends).
 * If a client could set this header themselves, they could spoof being on the
 * office network from anywhere. Defaults to Netlify's header, so this is a
 * zero-code-change env var flip when migrating off Netlify.
 *
 * Locally (no reverse proxy in front of the request), that header is absent,
 * so we fall back to `x-forwarded-for` for developer convenience. That
 * fallback path is NEVER reached in production traffic and must not be relied
 * on for security there.
 */
export function getClientIp(request: NextRequest | Request): string | null {
  return getClientIpFromHeaders(request.headers);
}

/**
 * Same logic as getClientIp, but for contexts that only have a Headers object —
 * Server Actions read the incoming request's headers via next/headers' `headers()`
 * rather than getting a Request object directly. Both paths see the identical
 * edge/proxy-set header, since a Server Action's POST still passes through the
 * same edge as any other request.
 */
export function getClientIpFromHeaders(headers: Headers): string | null {
  const trustedHeader = process.env.TRUSTED_IP_HEADER || "x-nf-client-connection-ip";
  const fromEdge = headers.get(trustedHeader);
  if (fromEdge) return normalizeIp(fromEdge);

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
