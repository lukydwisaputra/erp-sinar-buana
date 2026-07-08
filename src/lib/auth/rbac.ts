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

const FINANCE_ROLES: AppRole[] = ["admin", "keuangan"];

/**
 * Mirrors db-schema/sql/rls/00_helpers.sql's is_finance(). Dasbor's PRD
 * describes 4 named permissions (view_profit/view_project_cost/
 * view_forecast/view_tax_detail) that all collapse to this exact boundary
 * today (admin ✓, keuangan ✓, everyone else ✗) — kept as one check, not 4
 * identical booleans; split later if a role ever needs a real subset.
 */
export function isFinance(session: SessionUser | null): boolean {
  return !!session && FINANCE_ROLES.includes(session.role);
}

export function requireFinance(session: SessionUser | null): SessionUser {
  if (!session) throw new UnauthorizedError();
  if (!isFinance(session)) throw new ForbiddenError();
  return session;
}
