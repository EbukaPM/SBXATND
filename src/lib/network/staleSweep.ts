import { prisma } from "@/lib/db/prisma";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { recordAuditLog } from "@/lib/audit/log";
import { notifyRole } from "@/lib/notifications/create";

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
    include: { office: { select: { name: true } } },
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
    await notifyRole({
      type: "NETWORK_IP_CHANGED",
      targetRole: "SUPER_ADMIN",
      officeId: network.officeId,
      title: `${network.office.name}: network "${network.name}" went stale`,
      message: `"${network.name}" at ${network.office.name} hasn't re-verified its IP within the ${settings.networkStaleThresholdMinutes}-minute window and is now marked STALE — employees there may be unable to clock in. Re-authorize it from Offices & Network.`,
    });
  }

  return stale.length;
}
