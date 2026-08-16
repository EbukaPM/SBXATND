import { prisma } from "@/lib/db/prisma";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { recordAuditLog } from "@/lib/audit/log";

/** Flips VERIFIED networks to STALE once they've missed their heartbeat window. Actual attendance-time
 * authorization always recomputes staleness live (lib/network/verifyOfficeNetwork.ts) — this sweep only
 * keeps the admin dashboard's displayed status in sync so operators see the warning promptly. */
export async function sweepStaleNetworks(): Promise<number> {
  const settings = await getAttendanceSettings();
  const cutoff = new Date(Date.now() - settings.networkStaleThresholdMinutes * 60_000);

  const stale = await prisma.officeNetwork.findMany({
    where: {
      status: "VERIFIED",
      OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: cutoff } }],
    },
  });

  if (stale.length === 0) return 0;

  await prisma.officeNetwork.updateMany({
    where: { id: { in: stale.map((n) => n.id) } },
    data: { status: "STALE" },
  });

  for (const network of stale) {
    await recordAuditLog({
      action: "network.marked_stale",
      resource: "office_network",
      resourceId: network.id,
    });
  }

  return stale.length;
}
