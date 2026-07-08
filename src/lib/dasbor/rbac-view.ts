import type { Proyek } from "@/lib/schemas/proyek";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Tim Teknis sees only projects they're assigned to (PRD Bab 8.7's
 * "Tim Teknis: ringkasan proyek yang ditugaskan"). Admin/Keuangan see
 * everything, matching the wider role's full Dasbor access. Sales's own
 * "only my quotations/projects" narrowing is deliberately NOT implemented
 * here — Sph carries no owner field through to the app layer at all, and
 * exposing one is a Penawaran-module change out of this pass's boundary
 * (see docs/architecture.md's Dasbor writeup).
 */
export function filterProyekForRole(proyeks: Proyek[], session: SessionUser | null): Proyek[] {
  if (!session) return [];
  if (session.role !== "tim_teknis") return proyeks;
  if (!session.employeeId) return [];
  return proyeks.filter((p) => p.assignees.some((a) => a.karyawanId === session.employeeId));
}
