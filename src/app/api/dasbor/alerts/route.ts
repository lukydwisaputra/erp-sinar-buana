import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getAlerts } from "@/lib/dasbor/alert-view";
import { errorResponse } from "@/lib/api-error";

/** Dasbor itself stays mock/unwired — this route only exists because
 * getAlerts() now transitively depends on real Proyek/Realisasi RAB service
 * calls (DB access), which can no longer run client-side like the rest of
 * the still-mock dashboard data. RLS naturally hides rab_actuals cost data
 * from non-Finance roles (rab_actuals_sel), so no extra gating needed here. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const alerts = await getAlerts(session.id);
    return NextResponse.json(alerts);
  } catch (error) {
    return errorResponse(error);
  }
}
