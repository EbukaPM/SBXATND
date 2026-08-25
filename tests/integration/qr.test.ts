import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { generateDailyQr, deactivateQr } from "@/lib/qr/manage";
import { validateQrToken } from "@/lib/qr/session";
import { getAttendanceDateKey } from "@/lib/attendance/rules";

const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;
const TZ = "Africa/Lagos";

describeIfDb("QR lifecycle — integration", () => {
  let officeId: string;
  let userId: string;

  beforeAll(async () => {
    process.env.QR_SECRET ??= "test-qr-secret";
    const office = await prisma.office.create({ data: { name: "QR Test Office", timezone: TZ } });
    officeId = office.id;
    const admin = await prisma.user.create({
      data: { email: "qr-test-admin@example.com", passwordHash: "x", fullName: "QR Admin", role: "SUPER_ADMIN" },
    });
    userId = admin.id;
  });

  afterAll(async () => {
    await prisma.qrAttendanceSession.deleteMany({ where: { officeId } });
    await prisma.attendanceQrCode.deleteMany({ where: { officeId } });
    await prisma.office.delete({ where: { id: officeId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  beforeEach(async () => {
    await prisma.qrAttendanceSession.deleteMany({ where: { officeId } });
    await prisma.attendanceQrCode.deleteMany({ where: { officeId } });
  });

  it("validates today's freshly generated QR as ACTIVE", async () => {
    const today = getAttendanceDateKey(new Date(), TZ);
    const { rawToken } = await generateDailyQr({ officeId, attendanceDate: today, timezone: TZ, generatedById: userId });

    const result = await validateQrToken(rawToken);
    expect(result.ok).toBe(true);
  });

  it("rejects yesterday's QR even though it was valid when generated", async () => {
    const yesterday = getAttendanceDateKey(new Date(Date.now() - 86_400_000), TZ);
    const { rawToken } = await generateDailyQr({
      officeId,
      attendanceDate: yesterday,
      timezone: TZ,
      generatedById: userId,
    });

    const result = await validateQrToken(rawToken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("EXPIRED");
  });

  it("stays valid across every day of a week-long QR", async () => {
    const today = getAttendanceDateKey(new Date(), TZ);
    const weekFromNow = getAttendanceDateKey(new Date(Date.now() + 6 * 86_400_000), TZ);
    const { rawToken } = await generateDailyQr({
      officeId,
      attendanceDate: today,
      validUntilDate: weekFromNow,
      timezone: TZ,
      generatedById: userId,
    });

    const result = await validateQrToken(rawToken);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.qrCode.attendanceDate.getTime()).toBe(today.getTime());
      expect(result.qrCode.validUntil.getTime()).toBeGreaterThan(today.getTime());
    }
  });

  it("a new QR deactivates a prior QR whose window it overlaps, even with a different start date", async () => {
    const yesterday = getAttendanceDateKey(new Date(Date.now() - 86_400_000), TZ);
    const today = getAttendanceDateKey(new Date(), TZ);
    const weekFromYesterday = getAttendanceDateKey(new Date(Date.now() - 86_400_000 + 6 * 86_400_000), TZ);

    // Started yesterday, runs a week — still covers "now".
    const first = await generateDailyQr({
      officeId,
      attendanceDate: yesterday,
      validUntilDate: weekFromYesterday,
      timezone: TZ,
      generatedById: userId,
    });
    // Starts today (a different day than `first` started), but its window still
    // overlaps `first`'s multi-day range.
    const second = await generateDailyQr({
      officeId,
      attendanceDate: today,
      timezone: TZ,
      generatedById: userId,
    });

    const firstResult = await validateQrToken(first.rawToken);
    expect(firstResult.ok).toBe(false);
    if (!firstResult.ok) expect(firstResult.reason).toBe("DEACTIVATED");

    const secondResult = await validateQrToken(second.rawToken);
    expect(secondResult.ok).toBe(true);
  });

  it("rejects a deactivated QR", async () => {
    const today = getAttendanceDateKey(new Date(), TZ);
    const { qrCode, rawToken } = await generateDailyQr({
      officeId,
      attendanceDate: today,
      timezone: TZ,
      generatedById: userId,
    });
    await deactivateQr(qrCode.id, userId);

    const result = await validateQrToken(rawToken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("DEACTIVATED");
  });

  it("regenerating a QR invalidates the previous one for the same office/day", async () => {
    const today = getAttendanceDateKey(new Date(), TZ);
    const first = await generateDailyQr({ officeId, attendanceDate: today, timezone: TZ, generatedById: userId });
    const second = await generateDailyQr({ officeId, attendanceDate: today, timezone: TZ, generatedById: userId });

    const firstResult = await validateQrToken(first.rawToken);
    expect(firstResult.ok).toBe(false);
    if (!firstResult.ok) expect(firstResult.reason).toBe("DEACTIVATED");

    const secondResult = await validateQrToken(second.rawToken);
    expect(secondResult.ok).toBe(true);
  });

  it("rejects a token that never existed", async () => {
    const result = await validateQrToken("not-a-real-token");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NOT_FOUND");
  });
});
