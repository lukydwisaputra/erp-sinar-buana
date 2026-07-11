import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole, isFinance } from "@/lib/auth/rbac";
import { getAlerts } from "@/lib/dasbor/alert-view";
import { errorResponse } from "@/lib/api-error";

/** Staff roles only — Dasbor isn't part of the client portal. Pusat
 * Perhatian is the one panel non-finance staff partially see (project-health
 * kinds only; getAlerts drops finance-only kinds for them — the "subset of
 * the same engine" FR-09.13 describes, not a 403). */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis",
    );
    const alerts = await getAlerts(session.id, isFinance(session));
    return NextResponse.json(alerts);
  } catch (error) {
    return errorResponse(error);
  }
}
