import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getSlip, updateSlip } from "@/lib/penggajian/service";
import { updateSlipSchema } from "@/lib/schemas/penggajian";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ batchId: string; slipId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
    const { batchId, slipId } = await params;
    const slip = await getSlip(session.id, decodeURIComponent(batchId), slipId);
    return NextResponse.json(slip);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { batchId, slipId } = await params;
    const body = updateSlipSchema.parse(await request.json());
    const slip = await updateSlip(session.id, decodeURIComponent(batchId), slipId, body);
    return NextResponse.json(slip);
  } catch (error) {
    return errorResponse(error);
  }
}
