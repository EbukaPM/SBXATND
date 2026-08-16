import { describe, it, expect, beforeAll } from "vitest";
import {
  generateAttendanceId,
  normalizeAttendanceId,
  hashAttendanceId,
  createAttendanceIdCandidate,
} from "@/lib/security/attendanceId";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-do-not-use-in-production";
});

describe("generateAttendanceId", () => {
  it("produces a PREFIX-XXXXXX shaped ID", () => {
    const id = generateAttendanceId("ZUM");
    expect(id).toMatch(/^ZUM-[A-Z0-9]{6}$/);
  });

  it("excludes visually ambiguous characters (0, O, 1, I, L)", () => {
    for (let i = 0; i < 200; i++) {
      const id = generateAttendanceId();
      const suffix = id.split("-")[1]!;
      expect(suffix).not.toMatch(/[01OIL]/);
    }
  });

  it("is not derived from any predictable sequence — repeated calls differ", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateAttendanceId()));
    expect(ids.size).toBe(50);
  });
});

describe("normalizeAttendanceId", () => {
  it("is case-insensitive and trims whitespace", () => {
    expect(normalizeAttendanceId("  atd-8f4k92 ")).toBe("ATD-8F4K92");
    expect(normalizeAttendanceId("ATD-8F4K92")).toBe("ATD-8F4K92");
  });

  it("strips internal whitespace a user might type", () => {
    expect(normalizeAttendanceId("atd 8f4k92")).toBe("ATD8F4K92");
  });
});

describe("hashAttendanceId", () => {
  it("is deterministic for the same normalized input", () => {
    const a = hashAttendanceId("ATD-8F4K92");
    const b = hashAttendanceId("ATD-8F4K92");
    expect(a).toBe(b);
  });

  it("differs for different inputs", () => {
    expect(hashAttendanceId("ATD-8F4K92")).not.toBe(hashAttendanceId("ATD-8F4K93"));
  });

  it("does not embed the plaintext ID in the hash", () => {
    const hash = hashAttendanceId("ATD-8F4K92");
    expect(hash).not.toContain("8F4K92");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("createAttendanceIdCandidate", () => {
  it("returns a plaintext ID whose hash matches lookup via the normal path", () => {
    const { plaintext, lookup } = createAttendanceIdCandidate();
    expect(hashAttendanceId(normalizeAttendanceId(plaintext))).toBe(lookup);
  });

  it("looking up with different casing still matches (case-insensitive)", () => {
    const { plaintext, lookup } = createAttendanceIdCandidate();
    expect(hashAttendanceId(normalizeAttendanceId(plaintext.toLowerCase()))).toBe(lookup);
  });
});
