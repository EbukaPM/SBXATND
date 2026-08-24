import { prisma } from "@/lib/db/prisma";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { getAttendanceDateKey } from "@/lib/attendance/rules";
import { subDays } from "date-fns";

export async function getTodaySummary() {
  const settings = await getAttendanceSettings();
  const today = getAttendanceDateKey(new Date(), settings.timezone);

  const [totalActiveEmployees, records] = await Promise.all([
    prisma.employee.count({ where: { employmentStatus: "ACTIVE", isDeleted: false } }),
    prisma.attendanceRecord.findMany({
      where: { attendanceDate: today },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: { clockIn: "asc" },
    }),
  ]);

  return {
    settings,
    today,
    records,
    summary: {
      totalEmployees: totalActiveEmployees,
      present: records.length,
      notClockedIn: Math.max(0, totalActiveEmployees - records.length),
      early: records.filter((r) => r.clockInStatus === "EARLY").length,
      onTime: records.filter((r) => r.clockInStatus === "ON_TIME").length,
      late: records.filter((r) => r.clockInStatus === "LATE").length,
      currentlyInOffice: records.filter((r) => r.clockIn && !r.clockOut).length,
      clockedOut: records.filter((r) => !!r.clockOut).length,
      overtime: records.filter((r) => r.attendanceType !== "REGULAR").length,
    },
  };
}

export async function getWeeklyTrend() {
  const settings = await getAttendanceSettings();
  const today = getAttendanceDateKey(new Date(), settings.timezone);
  const start = subDays(today, 6);

  const records = await prisma.attendanceRecord.findMany({
    where: { attendanceDate: { gte: start, lte: today } },
    select: { attendanceDate: true, clockInStatus: true },
  });

  const byDay = new Map<string, { date: string; present: number; late: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, present: 0, late: 0 });
  }
  for (const r of records) {
    const key = r.attendanceDate.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.present += 1;
    if (r.clockInStatus === "LATE") bucket.late += 1;
  }
  return Array.from(byDay.values());
}
