/**
 * AES-256-GCM encryption for secrets stored at rest (the Pengiriman SMTP
 * password). Zero `@/` imports — this file must also be importable from the
 * standalone worker script (scripts/worker.ts), which only resolves relative
 * specifiers, not the Next `@/` bundler alias.
 *
 * No key rotation path: the ciphertext format is `iv || authTag ||
 * ciphertext` with no key-version prefix, and there's exactly one static
 * key (ENCRYPTION_KEY). Rotating it makes every already-encrypted row
 * (currently just email_accounts.password_encrypted) permanently
 * undecryptable — the operator has to manually re-enter that secret through
 * the UI after rotating, there's no re-encrypt-in-place migration. Fine for
 * the single secret this protects today; revisit (key-version prefix +
 * dual-key decrypt during rotation) before this guards anything where that
 * manual recovery step isn't acceptable.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (base64).");
  }
  return key;
}

/** Encrypts plaintext, returning base64(iv || authTag || ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, loadKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Reverses encryptSecret. Throws if ENCRYPTION_KEY is wrong or the blob was tampered with. */
export function decryptSecret(ciphertextB64: string): string {
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, loadKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
