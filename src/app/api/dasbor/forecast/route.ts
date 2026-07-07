import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getForekast } from "@/lib/dasbor/forecast-view";
import { errorResponse } from "@/lib/api-error";

/** See dasbor/alerts/route.ts's comment — getForekast now transitively
 * depends on real Faktur/Arus Kas/Pajak service calls (DB access), which can
 * no longer run client-side. */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const horizonParam = request.nextUrl.searchParams.get("horizonDays");
    const horizonDays = horizonParam ? Number(horizonParam) : undefined;
    const view = await getForekast(session.id, horizonDays);
    return NextResponse.json(view);
  } catch (error) {
    return errorResponse(error);
  }
}
