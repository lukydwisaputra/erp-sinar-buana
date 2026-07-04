import { describe, it, expect } from "vitest";
import { generateOpaqueToken, hashToken } from "@/lib/auth/tokens";

describe("generateOpaqueToken", () => {
  it("generates unique, unguessable-length tokens", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe("hashToken", () => {
  it("is deterministic (so lookups by hash work)", () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("never equals the raw token (only the hash is persisted)", () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).not.toBe(token);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken(generateOpaqueToken())).not.toBe(hashToken(generateOpaqueToken()));
  });
});
