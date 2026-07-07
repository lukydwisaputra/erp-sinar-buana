import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getBatch } from "@/lib/penggajian/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
    const { batchId } = await params;
    const batch = await getBatch(session.id, decodeURIComponent(batchId));
    return NextResponse.json(batch);
  } catch (error) {
    return errorResponse(error);
  }
}
