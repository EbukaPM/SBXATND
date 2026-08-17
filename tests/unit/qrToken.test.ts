import { describe, it, expect, beforeAll } from "vitest";
import { generateQrToken, hashQrToken, buildQrUrl } from "@/lib/qr/token";

beforeAll(() => {
  process.env.QR_SECRET = "test-qr-secret-do-not-use-in-production";
});

describe("generateQrToken", () => {
  it("produces a high-entropy raw token distinct from its hash and identifier", () => {
    const { rawToken, tokenHash, tokenIdentifier } = generateQrToken();
    expect(rawToken.length).toBeGreaterThanOrEqual(32);
    expect(tokenHash).not.toBe(rawToken);
    expect(tokenIdentifier).not.toBe(rawToken);
    expect(tokenIdentifier.length).toBeLessThan(rawToken.length);
  });

  it("is not derived from predictable inputs — two calls never collide", () => {
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe("hashQrToken", () => {
  it("is deterministic", () => {
    const { rawToken } = generateQrToken();
    expect(hashQrToken(rawToken)).toBe(hashQrToken(rawToken));
  });
});

describe("buildQrUrl", () => {
  it("embeds the raw token in the URL path", () => {
    const url = buildQrUrl("https://attendance.example.com", "abc123");
    expect(url).toBe("https://attendance.example.com/register/qr/abc123");
  });

  it("handles a trailing slash on the app URL", () => {
    const url = buildQrUrl("https://attendance.example.com/", "abc123");
    expect(url).toBe("https://attendance.example.com/register/qr/abc123");
  });
});
