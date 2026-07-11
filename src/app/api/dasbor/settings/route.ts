import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole, requireFinance } from "@/lib/auth/rbac";
import { getDashboardSettings, updateDashboardSettings } from "@/lib/dasbor/settings-service";
import { dashboardParamsSchema } from "@/lib/schemas/dashboard-params";
import { errorResponse } from "@/lib/api-error";

/** GET: same staff role set as the other dasbor routes (not Viewer — Dasbor
 * isn't part of the client portal). PATCH: Admin/Keuangan only. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis",
    );
    const settings = await getDashboardSettings(session.id);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireFinance(await getCurrentSession());
    const body = dashboardParamsSchema.parse(await request.json());
    const settings = await updateDashboardSettings(session.id, body);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
