import { prisma } from "@/lib/db/prisma";
import { isIpAuthorized } from "./matchIp";
import { getAttendanceSettings } from "@/lib/attendance/settings";

export type NetworkVerificationResult =
  | { allowed: true; officeNetworkId: string }
  | { allowed: false; reason: "NO_NETWORK_CONFIGURED" | "NETWORK_DISABLED" | "STALE_FAIL_CLOSED" | "IP_NOT_AUTHORIZED" };

/**
 * Authoritative office-network check. Only ever call this with a `sourceIp`
 * obtained from `getClientIp()` on the current request — never a client-supplied value.
 */
export async function verifyOfficeNetwork(
  officeId: string,
  sourceIp: string
): Promise<NetworkVerificationResult> {
  const [networks, settings] = await Promise.all([
    prisma.officeNetwork.findMany({ where: { officeId } }),
    getAttendanceSettings(),
  ]);

  const active = networks.filter((n) => n.status !== "DISABLED");
  if (active.length === 0) {
    return { allowed: false, reason: "NO_NETWORK_CONFIGURED" };
  }

  const staleThresholdMs = settings.networkStaleThresholdMinutes * 60_000;
  const now = Date.now();

  for (const network of active) {
    const lastVerifiedMs = network.lastVerifiedAt?.getTime() ?? 0;
    const isStale = now - lastVerifiedMs > staleThresholdMs;

    if (isStale && network.failMode === "FAIL_CLOSED") {
      continue; // never authorize on stale data when configured fail-closed
    }
    if (isStale && network.failMode !== "FAIL_CLOSED") {
      // FAIL_OPEN: still require an IP match against the last-known network, just
      // don't hard-block purely for staleness. This never authorizes an
      // unrelated random IP — it still must match currentPublicIp/cidr.
    }

    if (isIpAuthorized(sourceIp, network)) {
      return { allowed: true, officeNetworkId: network.id };
    }
  }

  const anyStaleFailClosed = active.some((n) => {
    const lastVerifiedMs = n.lastVerifiedAt?.getTime() ?? 0;
    return now - lastVerifiedMs > staleThresholdMs && n.failMode === "FAIL_CLOSED";
  });
  if (anyStaleFailClosed && active.every((n) => {
    const lastVerifiedMs = n.lastVerifiedAt?.getTime() ?? 0;
    return now - lastVerifiedMs > staleThresholdMs && n.failMode === "FAIL_CLOSED";
  })) {
    return { allowed: false, reason: "STALE_FAIL_CLOSED" };
  }

  return { allowed: false, reason: "IP_NOT_AUTHORIZED" };
}
