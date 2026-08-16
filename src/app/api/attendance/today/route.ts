import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guard";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { getAttendanceDateKey } from "@/lib/attendance/rules";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePermission("attendance", "view");
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ ok: false }, { status });
  }

  const settings = await getAttendanceSettings();
  const today = getAttendanceDateKey(new Date(), settings.timezone);

  const [totalActiveEmployees, records] = await Promise.all([
    prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.attendanceRecord.findMany({
      where: { attendanceDate: today },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } }, office: true },
      orderBy: { clockIn: "asc" },
    }),
  ]);

  const summary = {
    totalEmployees: totalActiveEmployees,
    present: records.length,
    notClockedIn: totalActiveEmployees - records.length,
    early: records.filter((r) => r.clockInStatus === "EARLY").length,
    onTime: records.filter((r) => r.clockInStatus === "ON_TIME").length,
    late: records.filter((r) => r.clockInStatus === "LATE").length,
    currentlyInOffice: records.filter((r) => r.clockIn && !r.clockOut).length,
    clockedOut: records.filter((r) => !!r.clockOut).length,
    overtime: records.filter((r) => r.attendanceType !== "REGULAR").length,
  };

  return NextResponse.json({ ok: true, summary, records });
}
