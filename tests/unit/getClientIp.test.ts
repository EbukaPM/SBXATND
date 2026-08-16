import { describe, it, expect, afterEach, vi } from "vitest";
import { getClientIp, normalizeIp } from "@/lib/network/getClientIp";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/attendance/clock-in", { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getClientIp", () => {
  it("trusts the Netlify-set connection IP header over anything else", () => {
    const req = requestWithHeaders({
      "x-nf-client-connection-ip": "102.89.23.4",
      "x-forwarded-for": "1.2.3.4", // client-controlled — must be ignored when the trusted header is present
    });
    expect(getClientIp(req)).toBe("102.89.23.4");
  });

  it("normalizes an IPv4-mapped IPv6 address from the trusted header", () => {
    const req = requestWithHeaders({ "x-nf-client-connection-ip": "::ffff:102.89.23.4" });
    expect(getClientIp(req)).toBe("102.89.23.4");
  });

  it("in production, returns null rather than trusting a client-supplied x-forwarded-for", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = requestWithHeaders({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(req)).toBeNull();
  });

  it("outside production, falls back to x-forwarded-for for developer convenience", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = requestWithHeaders({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("outside production with no headers at all, defaults to loopback", () => {
    vi.stubEnv("NODE_ENV", "development");
    const req = requestWithHeaders({});
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});

describe("normalizeIp", () => {
  it("strips IPv6 zone IDs", () => {
    expect(normalizeIp("fe80::1%eth0")).toBe("fe80::1");
  });

  it("strips the ::ffff: v4-mapped prefix", () => {
    expect(normalizeIp("::ffff:192.168.1.1")).toBe("192.168.1.1");
  });

  it("leaves a plain IPv4 address untouched", () => {
    expect(normalizeIp("102.89.23.4")).toBe("102.89.23.4");
  });
});
