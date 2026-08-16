import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/network/getClientIp";
import { recordAttendance } from "./engine";
import { DENIAL_MESSAGES } from "./messages";
import { formatInTimeZone } from "date-fns-tz";
import { getAttendanceSettings } from "./settings";

const bodySchema = z.object({
  attendanceId: z.string().min(3).max(40),
  qrSessionToken: z.string().min(10).max(200).optional(),
});

const MAX_BODY_BYTES = 4096;
export const QR_SESSION_COOKIE = "attendance_qr_session";

export async function handleClockRequest(request: NextRequest): Promise<NextResponse> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: "Request too large." }, { status: 413 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const sourceIp = getClientIp(request);
  if (!sourceIp) {
    return NextResponse.json({ ok: false, message: "Could not determine request origin." }, { status: 400 });
  }

  // The QR session token normally arrives as an httpOnly cookie set when the
  // employee's phone opened the /attendance/qr/[token] link — it never has to
  // pass through client-side JS. A body field is also accepted for API clients.
  const cookieToken = request.cookies.get(QR_SESSION_COOKIE)?.value ?? null;

  const result = await recordAttendance({
    attendanceIdRaw: parsed.attendanceId,
    sourceIp,
    userAgent: request.headers.get("user-agent"),
    qrSessionToken: cookieToken ?? parsed.qrSessionToken ?? null,
  });

  if (!result.ok) {
    const status = result.reason === "RATE_LIMITED" ? 429 : 403;
    return NextResponse.json(
      { ok: false, reason: result.reason, message: DENIAL_MESSAGES[result.reason] },
      { status, headers: result.retryAfterSeconds ? { "Retry-After": String(result.retryAfterSeconds) } : {} }
    );
  }

  const settings = await getAttendanceSettings();
  const tz = settings.timezone;

  if (result.action === "CLOCK_IN") {
    return NextResponse.json({
      ok: true,
      action: "CLOCK_IN",
      firstName: result.firstName,
      time: formatInTimeZone(result.record.clockIn!, tz, "h:mm a"),
      status: result.record.clockInStatus,
      attendanceType: result.record.attendanceType,
      minutesLate: result.record.minutesLate,
    });
  }

  return NextResponse.json({
    ok: true,
    action: "CLOCK_OUT",
    firstName: result.firstName,
    time: formatInTimeZone(result.record.clockOut!, tz, "h:mm a"),
    clockInTime: formatInTimeZone(result.record.clockIn!, tz, "h:mm a"),
    totalMinutesWorked: result.record.totalMinutesWorked,
  });
}
