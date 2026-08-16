import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/network/getClientIp";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { validateQrToken, startQrSession } from "@/lib/qr/session";
import { QR_SESSION_COOKIE } from "@/lib/attendance/clockHandler";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

/**
 * Landing point for a scanned QR code. Validates the token, opens a short-lived
 * QR session bound to this device (httpOnly cookie), and redirects into the
 * normal kiosk UI. The employee still must be on the office network (checked
 * again at clock-in time) and still has to enter their Attendance ID — the
 * scan alone never records attendance.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sourceIp = getClientIp(request);

  const rate = await checkRateLimit(sourceIp ?? "unknown", RATE_LIMITS.qrLookup);
  if (!rate.allowed) {
    return NextResponse.redirect(new URL("/attendance?error=rate_limited", request.url));
  }

  const settings = await getAttendanceSettings();
  const validation = await validateQrToken(token, settings.timezone);

  if (!validation.ok) {
    return NextResponse.redirect(new URL(`/attendance?error=qr_${validation.reason.toLowerCase()}`, request.url));
  }

  const session = await startQrSession({
    qrCode: validation.qrCode,
    sourceIp: sourceIp ?? "unknown",
    userAgent: request.headers.get("user-agent"),
  });

  const response = NextResponse.redirect(new URL("/attendance?qr=1", request.url));
  response.cookies.set(QR_SESSION_COOKIE, session.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
