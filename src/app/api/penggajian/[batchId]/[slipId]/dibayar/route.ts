import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { markSlipDibayar } from "@/lib/penggajian/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ batchId: string; slipId: string }> };

/** Pure status update — marking Dibayar triggers fn_payslip_after_change's
 * cashflow/tax-entry automation automatically. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { batchId, slipId } = await params;
    const slip = await markSlipDibayar(session.id, decodeURIComponent(batchId), slipId);
    return NextResponse.json(slip);
  } catch (error) {
    return errorResponse(error);
  }
}
