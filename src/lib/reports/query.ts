import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

export interface DailyReportFilters {
  from?: string;
  to?: string;
  officeId?: string;
  departmentId?: string;
  status?: string;
  attendanceType?: string;
  verificationMethod?: string;
  employeeId?: string;
}

export interface DailyReportRow {
  employee: string;
  department: string;
  office: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  minutesLate: number;
  hoursWorked: string;
  attendanceType: string;
  verificationMethod: string;
}

export async function fetchDailyReportRows(filters: DailyReportFilters, timezone = "Africa/Lagos"): Promise<DailyReportRow[]> {
  const where: Prisma.AttendanceRecordWhereInput = {};
  if (filters.from || filters.to) {
    where.attendanceDate = {};
    if (filters.from) where.attendanceDate.gte = new Date(`${filters.from}T00:00:00Z`);
    if (filters.to) where.attendanceDate.lte = new Date(`${filters.to}T00:00:00Z`);
  }
  if (filters.officeId) where.officeId = filters.officeId;
  if (filters.status) where.clockInStatus = filters.status as never;
  if (filters.attendanceType) where.attendanceType = filters.attendanceType as never;
  if (filters.verificationMethod) where.verificationMethod = filters.verificationMethod as never;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.departmentId) where.employee = { departmentId: filters.departmentId };

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { employee: { include: { department: true } }, office: true },
    orderBy: [{ attendanceDate: "desc" }, { clockIn: "asc" }],
    take: 5000,
  });

  return records.map((r) => ({
    employee: `${r.employee.firstName} ${r.employee.lastName}`,
    department: r.employee.department?.name ?? "",
    office: r.office.name,
    date: r.attendanceDate.toISOString().slice(0, 10),
    clockIn: r.clockIn ? formatInTimeZone(r.clockIn, timezone, "HH:mm") : "",
    clockOut: r.clockOut ? formatInTimeZone(r.clockOut, timezone, "HH:mm") : "",
    status: r.clockInStatus ?? "",
    minutesLate: r.minutesLate,
    hoursWorked: r.totalMinutesWorked ? (r.totalMinutesWorked / 60).toFixed(2) : "",
    attendanceType: r.attendanceType,
    verificationMethod: r.verificationMethod ?? "",
  }));
}

export interface MonthlyReportRow {
  employee: string;
  department: string;
  daysPresent: number;
  daysLate: number;
  earlyArrivals: number;
  onTimeArrivals: number;
  overtimeDays: number;
  totalHours: string;
  totalLateMinutes: number;
  averageClockIn: string;
  averageClockOut: string;
}

export async function fetchMonthlyReportRows(month: string, officeId?: string): Promise<MonthlyReportRow[]> {
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const where: Prisma.AttendanceRecordWhereInput = { attendanceDate: { gte: start, lt: end } };
  if (officeId) where.officeId = officeId;

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { employee: { include: { department: true } } },
  });

  const byEmployee = new Map<string, typeof records>();
  for (const r of records) {
    const list = byEmployee.get(r.employeeId) ?? [];
    list.push(r);
    byEmployee.set(r.employeeId, list);
  }

  const rows: MonthlyReportRow[] = [];
  for (const [, recs] of byEmployee) {
    const employee = recs[0]!.employee;
    const clockInMinutes = recs.filter((r) => r.clockIn).map((r) => r.clockIn!.getUTCHours() * 60 + r.clockIn!.getUTCMinutes());
    const clockOutMinutes = recs.filter((r) => r.clockOut).map((r) => r.clockOut!.getUTCHours() * 60 + r.clockOut!.getUTCMinutes());
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
    const fmt = (mins: number | null) =>
      mins === null ? "" : `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

    rows.push({
      employee: `${employee.firstName} ${employee.lastName}`,
      department: employee.department?.name ?? "",
      daysPresent: recs.length,
      daysLate: recs.filter((r) => r.clockInStatus === "LATE").length,
      earlyArrivals: recs.filter((r) => r.clockInStatus === "EARLY").length,
      onTimeArrivals: recs.filter((r) => r.clockInStatus === "ON_TIME").length,
      overtimeDays: recs.filter((r) => r.attendanceType !== "REGULAR").length,
      totalHours: (recs.reduce((sum, r) => sum + (r.totalMinutesWorked ?? 0), 0) / 60).toFixed(1),
      totalLateMinutes: recs.reduce((sum, r) => sum + r.minutesLate, 0),
      averageClockIn: fmt(avg(clockInMinutes)),
      averageClockOut: fmt(avg(clockOutMinutes)),
    });
  }

  return rows.sort((a, b) => a.employee.localeCompare(b.employee));
}
