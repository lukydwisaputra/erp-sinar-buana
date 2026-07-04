import type { AppRole } from "@/lib/schemas/pengguna";
import type { SessionUser } from "./session";

export type { AppRole };

export class ForbiddenError extends Error {
  constructor(message = "Anda tidak memiliki akses untuk aksi ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Sesi tidak valid, silakan masuk kembali.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Server-side RBAC gate (FR-01.8/GC-12) — every Route Handler that needs a
 * specific role calls this before touching data. Proxy-level checks (proxy.ts)
 * are optimistic only; this is the real boundary.
 */
export function requireRole(
  session: SessionUser | null,
  ...allowed: AppRole[]
): SessionUser {
  if (!session) throw new UnauthorizedError();
  if (!allowed.includes(session.role)) throw new ForbiddenError();
  return session;
}
