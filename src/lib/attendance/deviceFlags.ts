import { prisma } from "@/lib/db/prisma";

/**
 * Checks whether this device was most recently used to clock in as a
 * *different* employee, and if so records an AttendanceDeviceFlag for admin
 * review. Never blocks the clock-in — a shared device (e.g. a reception
 * tablet kept as a fallback) is legitimate and would otherwise false-positive
 * on every use, which is why this is a flag, not a denial. See
 * lib/security/deviceId.ts for why IP can't do this job (NAT shares one
 * public IP across every device on office Wi-Fi).
 */
export async function flagDeviceReuseIfNeeded(params: {
  deviceId: string | null;
  employeeId: string;
  attendanceRecordId: string;
}): Promise<void> {
  const { deviceId, employeeId, attendanceRecordId } = params;
  if (!deviceId) return;

  const lastSeenAs = await prisma.attendanceRecord.findFirst({
    where: { clockInDeviceId: deviceId, employeeId: { not: employeeId } },
    orderBy: { clockIn: "desc" },
    select: { employeeId: true },
  });

  if (!lastSeenAs) return;

  await prisma.attendanceDeviceFlag.create({
    data: {
      deviceId,
      attendanceRecordId,
      employeeId,
      previousEmployeeId: lastSeenAs.employeeId,
    },
  });
}
