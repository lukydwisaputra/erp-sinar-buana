import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole, isFinance } from "@/lib/auth/rbac";
import { getAlerts } from "@/lib/dasbor/alert-view";
import { errorResponse } from "@/lib/api-error";

/** All 5 roles can call this — Pusat Perhatian is the one panel non-finance
 * roles partially see (project-health kinds only; getAlerts drops
 * finance-only kinds for them — the "subset of the same engine" FR-09.13
 * describes, not a 403). */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const alerts = await getAlerts(session.id, isFinance(session));
    return NextResponse.json(alerts);
  } catch (error) {
    return errorResponse(error);
  }
}
