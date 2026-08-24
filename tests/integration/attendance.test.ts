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
    await prisma.attendanceDeviceFlag.deleteMany({ where: { attendanceRecord: { officeId } } });
    await prisma.attendanceRecord.deleteMany({ where: { officeId } });
    await prisma.employee.deleteMany({ where: { officeId } });
    await prisma.officeNetwork.deleteMany({ where: { officeId } });
    await prisma.office.delete({ where: { id: officeId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  beforeEach(async () => {
    await prisma.attendanceDeviceFlag.deleteMany({ where: { attendanceRecord: { officeId } } });
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

      // The test clocks out seconds after clocking in, i.e. before workEnd (17:00) —
      // a reason is required, same as the real early-clock-out flow.
      const second = await recordAttendance({ ...input, earlyClockOutReason: "Leaving early for a doctor's appointment" });
      expect(second.ok).toBe(true);
      if (second.ok) expect(second.action).toBe("CLOCK_OUT");

      const third = await recordAttendance(input);
      expect(third.ok).toBe(false);
      if (!third.ok) expect(third.reason).toBe("ALREADY_COMPLETE");
    });

    it("requires a reason to clock out before the scheduled end of day, then accepts it", async () => {
      const { attendanceId } = await makeEmployee();
      const input = { attendanceIdRaw: attendanceId, sourceIp: "102.89.0.1", userAgent: "vitest" };

      const clockIn = await recordAttendance(input);
      expect(clockIn.ok).toBe(true);

      const withoutReason = await recordAttendance(input);
      expect(withoutReason.ok).toBe(false);
      if (!withoutReason.ok) expect(withoutReason.reason).toBe("EARLY_CLOCKOUT_REASON_REQUIRED");

      const withReason = await recordAttendance({ ...input, earlyClockOutReason: "Feeling unwell" });
      expect(withReason.ok).toBe(true);
      if (withReason.ok && withReason.action === "CLOCK_OUT") {
        expect(withReason.record.clockOutStatus).toBe("EARLY");
        expect(withReason.record.earlyClockOutReason).toBe("Feeling unwell");
      }
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

    it("flags a device clocking in as a different employee than it was last seen with", async () => {
      const a = await makeEmployee();
      const b = await makeEmployee();
      const sharedDeviceId = "device-shared-1";

      const firstResult = await recordAttendance({
        attendanceIdRaw: a.attendanceId,
        sourceIp: "102.89.0.1",
        userAgent: "vitest",
        deviceId: sharedDeviceId,
      });
      expect(firstResult.ok).toBe(true);

      const secondResult = await recordAttendance({
        attendanceIdRaw: b.attendanceId,
        sourceIp: "102.89.0.1",
        userAgent: "vitest",
        deviceId: sharedDeviceId,
      });
      expect(secondResult.ok).toBe(true); // never blocked, only flagged

      const flags = await prisma.attendanceDeviceFlag.findMany({ where: { deviceId: sharedDeviceId } });
      expect(flags).toHaveLength(1);
      expect(flags[0]!.employeeId).toBe(b.employee.id);
      expect(flags[0]!.previousEmployeeId).toBe(a.employee.id);
      expect(flags[0]!.reviewed).toBe(false);
    });

    it("does not flag the same employee reusing their own device", async () => {
      const a = await makeEmployee();
      const deviceId = "device-own-1";

      const clockIn = await recordAttendance({
        attendanceIdRaw: a.attendanceId,
        sourceIp: "102.89.0.1",
        userAgent: "vitest",
        deviceId,
      });
      expect(clockIn.ok).toBe(true);

      const clockOut = await recordAttendance({
        attendanceIdRaw: a.attendanceId,
        sourceIp: "102.89.0.1",
        userAgent: "vitest",
        deviceId,
        earlyClockOutReason: "Personal errand",
      });
      expect(clockOut.ok).toBe(true);

      const flags = await prisma.attendanceDeviceFlag.findMany({ where: { deviceId } });
      expect(flags).toHaveLength(0);
    });

    it("does not flag when no deviceId is supplied", async () => {
      const a = await makeEmployee();
      const b = await makeEmployee();

      await recordAttendance({ attendanceIdRaw: a.attendanceId, sourceIp: "102.89.0.1", userAgent: "vitest" });
      await recordAttendance({ attendanceIdRaw: b.attendanceId, sourceIp: "102.89.0.1", userAgent: "vitest" });

      const flags = await prisma.attendanceDeviceFlag.count({
        where: { OR: [{ employeeId: a.employee.id }, { employeeId: b.employee.id }] },
      });
      expect(flags).toBe(0);
    });
  });
});
