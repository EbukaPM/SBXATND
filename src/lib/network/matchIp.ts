import { normalizeIp } from "./getClientIp";

/** Parses a dotted-quad IPv4 address into a 32-bit unsigned integer, or null if invalid. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    n = (n << 8) | octet;
  }
  return n >>> 0;
}

/** True if `ip` equals `candidate`, or falls inside `candidate` when it's a CIDR range. */
export function ipMatches(ip: string, candidate: string): boolean {
  const normalizedIp = normalizeIp(ip);
  const normalizedCandidate = normalizeIp(candidate.trim());

  if (!normalizedCandidate.includes("/")) {
    return normalizedIp.toLowerCase() === normalizedCandidate.toLowerCase();
  }

  const [base, prefixStr] = normalizedCandidate.split("/");
  const prefix = Number(prefixStr);
  const ipInt = ipv4ToInt(normalizedIp);
  const baseInt = ipv4ToInt(base!);
  if (ipInt === null || baseInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/**
 * Checks a source IP against every authorized identity for an office network:
 * the agent-reported current public IP, plus an optional CIDR range.
 * Returns false (deny) if there is nothing to match against — an office with
 * no verified network can never authorize attendance.
 */
export function isIpAuthorized(
  sourceIp: string,
  network: { currentPublicIp: string | null; cidr: string | null }
): boolean {
  const candidates = [network.currentPublicIp, network.cidr].filter(
    (v): v is string => !!v
  );
  if (candidates.length === 0) return false;
  return candidates.some((candidate) => ipMatches(sourceIp, candidate));
}
