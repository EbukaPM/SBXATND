import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/guard";
import { fetchDailyReportRows } from "@/lib/reports/query";
import { rowsToCsv } from "@/lib/reports/csv";
import { rowsToExcelBuffer } from "@/lib/reports/excel";
import { generateReportPdf } from "@/lib/reports/pdf";
import { getCompanySettings } from "@/lib/company/settings";
import { getAttendanceSettings } from "@/lib/attendance/settings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requirePermission("reports", "view");
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: (err as { status?: number }).status ?? 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const settings = await getAttendanceSettings();

  const rows = await fetchDailyReportRows(
    {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      officeId: searchParams.get("officeId") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      attendanceType: searchParams.get("attendanceType") ?? undefined,
      verificationMethod: searchParams.get("verificationMethod") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
    },
    settings.timezone
  );

  if (format === "xlsx") {
    const buffer = await rowsToExcelBuffer(rows, "Daily Attendance");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=daily-attendance.xlsx",
      },
    });
  }

  if (format === "pdf") {
    const company = await getCompanySettings();
    const buffer = await generateReportPdf({
      companyName: company.companyName,
      logoUrl: company.logoUrl,
      title: "Daily Attendance Report",
      subtitle: `${searchParams.get("from") ?? "All dates"} to ${searchParams.get("to") ?? "present"}`,
      generatedBy: user.fullName,
      headers: rows.length ? Object.keys(rows[0]!) : [],
      rows: rows.map((r) => Object.values(r).map(String)),
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=daily-attendance.pdf" },
    });
  }

  const csv = rowsToCsv(rows);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=daily-attendance.csv" },
  });
}
