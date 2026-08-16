import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { hashQrToken } from "./token";
import { getAttendanceSettings } from "@/lib/attendance/settings";
import { getAttendanceDateKey } from "@/lib/attendance/rules";
import type { AttendanceQrCode } from "@prisma/client";

export type QrValidationFailure =
  | "NOT_FOUND"
  | "DEACTIVATED"
  | "EXPIRED"
  | "NOT_YET_ACTIVE"
  | "WRONG_DATE";

export type QrValidationResult =
  | { ok: true; qrCode: AttendanceQrCode }
  | { ok: false; reason: QrValidationFailure };

/** Looks up and validates a raw QR token from a scanned URL. */
export async function validateQrToken(rawToken: string, timezone: string): Promise<QrValidationResult> {
  const tokenHash = hashQrToken(rawToken);
  const qrCode = await prisma.attendanceQrCode.findUnique({ where: { tokenHash } });
  if (!qrCode) return { ok: false, reason: "NOT_FOUND" };
  if (qrCode.status === "DEACTIVATED") return { ok: false, reason: "DEACTIVATED" };

  const now = new Date();
  const todayKey = getAttendanceDateKey(now, timezone).getTime();
  const qrDateKey = getAttendanceDateKey(qrCode.attendanceDate, timezone).getTime();

  if (qrDateKey !== todayKey) return { ok: false, reason: "WRONG_DATE" };
  if (now < qrCode.validFrom) return { ok: false, reason: "NOT_YET_ACTIVE" };
  if (now > qrCode.validUntil || qrCode.status === "EXPIRED") return { ok: false, reason: "EXPIRED" };

  return { ok: true, qrCode };
}

export interface StartQrSessionParams {
  qrCode: AttendanceQrCode;
  sourceIp: string;
  userAgent: string | null;
}

export interface QrSessionHandle {
  sessionToken: string;
  expiresAt: Date;
}

/** Creates a short-lived session right after a successful QR scan, before the Attendance ID is entered. */
export async function startQrSession(params: StartQrSessionParams): Promise<QrSessionHandle> {
  const settings = await getAttendanceSettings();
  const sessionToken = randomBytes(24).toString("base64url");
  const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const expiresAt = new Date(Date.now() + settings.qrSessionMinutes * 60_000);

  await prisma.qrAttendanceSession.create({
    data: {
      qrCodeId: params.qrCode.id,
      officeId: params.qrCode.officeId,
      sessionTokenHash,
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      expiresAt,
    },
  });

  return { sessionToken, expiresAt };
}

export type QrSessionValidationFailure = "NOT_FOUND" | "EXPIRED" | "ALREADY_USED";

export async function getActiveQrSession(sessionToken: string) {
  const sessionTokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const session = await prisma.qrAttendanceSession.findUnique({
    where: { sessionTokenHash },
    include: { qrCode: true },
  });
  if (!session) return { ok: false as const, reason: "NOT_FOUND" as QrSessionValidationFailure };
  if (session.status === "USED") return { ok: false as const, reason: "ALREADY_USED" as QrSessionValidationFailure };
  if (session.status === "EXPIRED" || session.expiresAt < new Date()) {
    return { ok: false as const, reason: "EXPIRED" as QrSessionValidationFailure };
  }
  return { ok: true as const, session };
}

export async function consumeQrSession(sessionId: string): Promise<void> {
  await prisma.qrAttendanceSession.update({
    where: { id: sessionId },
    data: { status: "USED", usedAt: new Date() },
  });
}
