import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { cancelBatch } from "@/lib/penggajian/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ batchId: string }> };

/** Bulk cancel — skips slips already DIBAYAR/BATAL rather than failing. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { batchId } = await params;
    const batch = await cancelBatch(session.id, decodeURIComponent(batchId));
    return NextResponse.json(batch);
  } catch (error) {
    return errorResponse(error);
  }
}
