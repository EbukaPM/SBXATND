import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/security/rateLimit";

const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("checkRateLimit — integration", () => {
  const key = "test-key-" + Math.random().toString(36).slice(2);
  const config = { scope: "unit-test", limit: 3, windowSeconds: 60, lockoutSeconds: 5 };

  beforeEach(async () => {
    await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: `${config.scope}:` } } });
  });

  it("allows requests up to the limit and then locks out", async () => {
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(key, config);
      expect(result.allowed).toBe(true);
    }
    const fourth = await checkRateLimit(key, config);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const a = await checkRateLimit(`${key}-a`, config);
    const b = await checkRateLimit(`${key}-b`, config);
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });
});
