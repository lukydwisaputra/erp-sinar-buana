import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque, unguessable token for session cookies and invite/reset links.
 * Only `hashToken()`'s output is ever persisted — the raw value here is the
 * one the browser holds (cookie) or the one embedded in an emailed link.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

/** sha256 of a raw token, for DB storage/lookup — never store the raw value. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
