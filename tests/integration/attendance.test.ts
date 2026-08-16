import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { recordAttendance } from "@/lib/attendance/engine";
import { updateAttendanceSettings } from "@/lib/attendance/settings";
import { updateCompanySettings } from "@/lib/company/settings";
import { createAttendanceIdCandidate } from "@/lib/security/attendanceId";

const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

const TZ = "Africa/Lagos";

describeIfDb("recordAttendance — integration", () => {
  let officeId: string;
  let userId: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET ??= "test-secret";
    process.env.QR_SECRET ??= "test-qr-secret";
    await updateCompanySettings({ companyName: "Test Co" });
    await updateAttendanceSettings({
      timezone: TZ,
      workStart: "09:00",
      gracePeriodMinutes: 15,
      workEnd: "17:00",
      attendanceMode: "NETWORK_ONLY",
    });

    const office = await prisma.office.create({ data: { name: "Test Office", timezone: TZ } });
    officeId = office.id;

    const admin = await prisma.user.create({
      data: { email: "test-admin@example.com", passwordHash: "x", fullName: "Test Admin", role: "SUPER_ADMIN" },
    });
    userId = admin.id;
  });

  afterAll(async () => {
    await prisma.attendanceRecord.deleteMany({ where: { officeId } });
    await prisma.employee.deleteMany({ where: { officeId } });
    await prisma.officeNetwork.deleteMany({ where: { officeId } });
    await prisma.office.delete({ where: { id: officeId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  beforeEach(async () => {
    await prisma.attendanceRecord.deleteMany({ where: { officeId } });
    await prisma.rateLimitBucket.deleteMany();
  });

  async function makeEmployee() {
    const { plaintext, lookup } = createAttendanceIdCandidate();
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: `EMP-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        attendanceIdLookup: lookup,
        firstName: "Test",
        lastName: "Employee",
        officeId,
      },
    });
    return { employee, attendanceId: plaintext };
  }

  it("denies attendance when no office network is configured", async () => {
    const { attendanceId } = await makeEmployee();
    const result = await recordAttendance({
      attendanceIdRaw: attendanceId,
      sourceIp: "102.89.0.1",
      userAgent: "vitest",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("NETWORK_DENIED");
  });

  it("rejects an invalid Attendance ID without revealing whether an employee exists", async () => {
    const result = await recordAttendance({
      attendanceIdRaw: "NOTAREALID",
      sourceIp: "102.89.0.1",
      userAgent: "vitest",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("INVALID_EMPLOYEE");
  });

  describeIfDb("with a verified office network", () => {
    beforeEach(async () => {
      await prisma.officeNetwork.deleteMany({ where: { officeId } });
      await prisma.officeNetwork.create({
        data: {
          officeId,
          name: "Test Network",
          currentPublicIp: "102.89.0.1",
          status: "VERIFIED",
          lastVerifiedAt: new Date(),
          failMode: "FAIL_CLOSED",
        },
      });
    });

    it("allows clock-in from the authorized IP and denies from an unauthorized one", async () => {
      const { attendanceId } = await makeEmployee();

      const denied = await recordAttendance({
        attendanceIdRaw: attendanceId,
        sourceIp: "41.58.0.99", // employee "at home" on mobile data
        userAgent: "vitest",
      });
      expect(denied.ok).toBe(false);
      if (!denied.ok) expect(denied.reason).toBe("NETWORK_DENIED");

      const allowed = await recordAttendance({
        attendanceIdRaw: attendanceId,
        sourceIp: "102.89.0.1", // employee on office Wi-Fi
        userAgent: "vitest",
      });
      expect(allowed.ok).toBe(true);
      if (allowed.ok) expect(allowed.action).toBe("CLOCK_IN");
    });

    it("prevents duplicate clock-ins and then allows clock-out, completing the state machine", async () => {
      const { attendanceId } = await makeEmployee();
      const input = { attendanceIdRaw: attendanceId, sourceIp: "102.89.0.1", userAgent: "vitest" };

      const first = await recordAttendance(input);
      expect(first.ok).toBe(true);
      if (first.ok) expect(first.action).toBe("CLOCK_IN");

      const second = await recordAttendance(input);
      expect(second.ok).toBe(true);
      if (second.ok) expect(second.action).toBe("CLOCK_OUT");

      const third = await recordAttendance(input);
      expect(third.ok).toBe(false);
      if (!third.ok) expect(third.reason).toBe("ALREADY_COMPLETE");
    });

    it("does not create two records for concurrent simultaneous clock-in requests", async () => {
      const { attendanceId } = await makeEmployee();
      const input = { attendanceIdRaw: attendanceId, sourceIp: "102.89.0.1", userAgent: "vitest" };

      const [a, b] = await Promise.all([recordAttendance(input), recordAttendance(input)]);
      const outcomes = [a, b].map((r) => (r.ok ? r.action : r.reason));

      // Exactly one of the two concurrent requests should win as CLOCK_IN; the
      // other resolves as CLOCK_OUT or ALREADY_COMPLETE depending on timing —
      // either way, never two CLOCK_INs.
      expect(outcomes.filter((o) => o === "CLOCK_IN").length).toBe(1);

      const records = await prisma.attendanceRecord.count({
        where: { employeeId: (await prisma.employee.findFirst({ where: { officeId }, orderBy: { createdAt: "desc" } }))!.id },
      });
      expect(records).toBe(1);
    });
  });
});
