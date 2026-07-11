import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Throwaway key, generated solely for this test file — must decode to 32
// bytes to pass validation, but has no relationship to any real environment.
const TEST_KEY = "s6yYae7jUzh8XWE0SeHt5sSnGUKvym3zsVfNrd3wZG0=";
const originalKey = process.env.ENCRYPTION_KEY;

describe("encryptSecret / decryptSecret", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("round-trips a plaintext string", () => {
    const ciphertext = encryptSecret("s3cret-smtp-password");
    expect(ciphertext).not.toBe("s3cret-smtp-password");
    expect(decryptSecret(ciphertext)).toBe("s3cret-smtp-password");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same-input")).not.toBe(encryptSecret("same-input"));
  });

  it("throws when the ciphertext is tampered with (auth tag check)", () => {
    const ciphertext = encryptSecret("s3cret");
    const bytes = Buffer.from(ciphertext, "base64");
    bytes[bytes.length - 1] ^= 0xff; // flip a byte in the ciphertext
    const tampered = bytes.toString("base64");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow("ENCRYPTION_KEY is not set");
  });

  it("throws when ENCRYPTION_KEY is the wrong length", () => {
    process.env.ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptSecret("x")).toThrow("32 bytes");
  });
});
