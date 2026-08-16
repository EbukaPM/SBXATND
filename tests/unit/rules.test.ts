import { describe, it, expect } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { classifyClockIn, calculateMinutesWorked, isWeekend, getAttendanceDateKey } from "@/lib/attendance/rules";

const TZ = "Africa/Lagos";
const SETTINGS = { timezone: TZ, workStart: "09:00", gracePeriodMinutes: 15 };

function lagosTime(dateStr: string, time: string): Date {
  return fromZonedTime(`${dateStr}T${time}:00`, TZ);
}

describe("classifyClockIn — acceptance tests", () => {
  // A Wednesday so weekend logic doesn't interfere.
  const DAY = "2026-08-19";

  it("8:45 AM -> EARLY", () => {
    const result = classifyClockIn(lagosTime(DAY, "08:45"), SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(result.status).toBe("EARLY");
    expect(result.minutesLate).toBe(0);
  });

  it("9:00 AM -> ON_TIME", () => {
    const result = classifyClockIn(lagosTime(DAY, "09:00"), SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(result.status).toBe("ON_TIME");
  });

  it("9:15 AM (grace boundary, inclusive) -> ON_TIME", () => {
    const result = classifyClockIn(lagosTime(DAY, "09:15"), SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(result.status).toBe("ON_TIME");
  });

  it("9:16 AM -> LATE with 16 minutes late", () => {
    const result = classifyClockIn(lagosTime(DAY, "09:16"), SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(result.status).toBe("LATE");
    expect(result.minutesLate).toBe(16);
  });

  it("9:27 AM -> LATE with 27 minutes late (spec example)", () => {
    const result = classifyClockIn(lagosTime(DAY, "09:27"), SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(result.status).toBe("LATE");
    expect(result.minutesLate).toBe(27);
  });

  it("10:00 AM -> LATE", () => {
    const result = classifyClockIn(lagosTime(DAY, "10:00"), SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(result.status).toBe("LATE");
  });

  it("does not mutate the actual clock-in timestamp", () => {
    const clockIn = lagosTime(DAY, "09:27");
    classifyClockIn(clockIn, SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(clockIn.toISOString()).toBe(lagosTime(DAY, "09:27").toISOString());
  });

  it("weekend attendance is WEEKEND_OVERTIME", () => {
    // 2026-08-22 is a Saturday.
    const result = classifyClockIn(lagosTime("2026-08-22", "09:00"), SETTINGS, {
      isWeekendDay: true,
      isHoliday: false,
    });
    expect(result.attendanceType).toBe("WEEKEND_OVERTIME");
  });

  it("Sunday attendance is WEEKEND_OVERTIME", () => {
    const result = classifyClockIn(lagosTime("2026-08-23", "09:00"), SETTINGS, {
      isWeekendDay: true,
      isHoliday: false,
    });
    expect(result.attendanceType).toBe("WEEKEND_OVERTIME");
  });

  it("holiday attendance is HOLIDAY_OVERTIME (takes precedence over weekend)", () => {
    const result = classifyClockIn(lagosTime(DAY, "09:00"), SETTINGS, { isWeekendDay: false, isHoliday: true });
    expect(result.attendanceType).toBe("HOLIDAY_OVERTIME");
  });

  it("regular weekday attendance is REGULAR", () => {
    const result = classifyClockIn(lagosTime(DAY, "09:00"), SETTINGS, { isWeekendDay: false, isHoliday: false });
    expect(result.attendanceType).toBe("REGULAR");
  });
});

describe("isWeekend", () => {
  it("flags Saturday and Sunday in the office timezone", () => {
    expect(isWeekend(lagosTime("2026-08-22", "12:00"), TZ)).toBe(true);
    expect(isWeekend(lagosTime("2026-08-23", "12:00"), TZ)).toBe(true);
    expect(isWeekend(lagosTime("2026-08-19", "12:00"), TZ)).toBe(false);
  });
});

describe("calculateMinutesWorked", () => {
  it("computes whole minutes between clock-in and clock-out", () => {
    const clockIn = lagosTime("2026-08-19", "09:00");
    const clockOut = lagosTime("2026-08-19", "17:30");
    expect(calculateMinutesWorked(clockIn, clockOut)).toBe(510);
  });

  it("never returns a negative duration", () => {
    const clockIn = lagosTime("2026-08-19", "17:00");
    const clockOut = lagosTime("2026-08-19", "09:00");
    expect(calculateMinutesWorked(clockIn, clockOut)).toBe(0);
  });
});

describe("getAttendanceDateKey", () => {
  it("uses the office-local calendar date, not the UTC date", () => {
    // 11:30 PM Lagos on Aug 19 is still Aug 19 UTC+1, well before midnight UTC.
    const late = lagosTime("2026-08-19", "23:30");
    expect(getAttendanceDateKey(late, TZ).toISOString().slice(0, 10)).toBe("2026-08-19");
  });
});
