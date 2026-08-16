import { describe, it, expect } from "vitest";
import { ipMatches, isIpAuthorized } from "@/lib/network/matchIp";

describe("ipMatches", () => {
  it("matches an identical single IP", () => {
    expect(ipMatches("102.89.23.4", "102.89.23.4")).toBe(true);
  });

  it("rejects a different IP", () => {
    expect(ipMatches("102.89.23.4", "102.89.23.5")).toBe(false);
  });

  it("matches an IP inside a CIDR range", () => {
    expect(ipMatches("102.89.0.42", "102.89.0.0/16")).toBe(true);
    expect(ipMatches("102.90.0.42", "102.89.0.0/16")).toBe(false);
  });

  it("handles a /32 CIDR as an exact match", () => {
    expect(ipMatches("102.89.0.1", "102.89.0.1/32")).toBe(true);
    expect(ipMatches("102.89.0.2", "102.89.0.1/32")).toBe(false);
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(ipMatches(" 102.89.23.4 ", "102.89.23.4")).toBe(true);
  });
});

describe("isIpAuthorized", () => {
  it("denies when the network has no configured IP or CIDR (nothing to compare against)", () => {
    expect(isIpAuthorized("102.89.23.4", { currentPublicIp: null, cidr: null })).toBe(false);
  });

  it("allows a source IP matching the current public IP", () => {
    expect(isIpAuthorized("102.89.23.4", { currentPublicIp: "102.89.23.4", cidr: null })).toBe(true);
  });

  it("denies an unrelated source IP even with a configured network", () => {
    expect(isIpAuthorized("41.58.0.1", { currentPublicIp: "102.89.23.4", cidr: null })).toBe(false);
  });

  it("allows a source IP matching the CIDR even if currentPublicIp differs", () => {
    expect(isIpAuthorized("102.89.5.9", { currentPublicIp: "102.89.23.4", cidr: "102.89.0.0/16" })).toBe(true);
  });
});
