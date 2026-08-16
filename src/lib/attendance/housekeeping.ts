import { prisma } from "@/lib/db/prisma";
import { getAttendanceSettings } from "./settings";
import { getAttendanceDateKey } from "./rules";
import { recordAuditLog } from "@/lib/audit/log";

/** Flags yesterday-or-earlier records that were clocked in but never clocked out, so admins can see and correct them. */
export async function flagMissedClockOuts(): Promise<number> {
  const settings = await getAttendanceSettings();
  const today = getAttendanceDateKey(new Date(), settings.timezone);

  const dangling = await prisma.attendanceRecord.findMany({
    where: { clockIn: { not: null }, clockOut: null, attendanceDate: { lt: today }, clockInStatus: { not: "MISSED_CLOCK_OUT" } },
  });

  if (dangling.length === 0) return 0;

  await prisma.attendanceRecord.updateMany({
    where: { id: { in: dangling.map((r) => r.id) } },
    data: { clockInStatus: "MISSED_CLOCK_OUT" },
  });

  for (const record of dangling) {
    await recordAuditLog({
      action: "attendance.flagged_missed_clock_out",
      resource: "attendance_record",
      resourceId: record.id,
    });
  }

  return dangling.length;
}
