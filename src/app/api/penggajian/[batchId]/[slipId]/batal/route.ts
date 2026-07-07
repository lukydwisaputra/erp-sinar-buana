import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { cancelSlip } from "@/lib/penggajian/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ batchId: string; slipId: string }> };

/** Pure status update — trusts fn_payslip_after_change's BATAL branch to
 * cancel any locked cashflow entry / drop unsettled auto tax entries. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { batchId, slipId } = await params;
    const slip = await cancelSlip(session.id, decodeURIComponent(batchId), slipId);
    return NextResponse.json(slip);
  } catch (error) {
    return errorResponse(error);
  }
}
