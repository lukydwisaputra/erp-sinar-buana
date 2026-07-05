import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { removeScheduleRow } from "@/lib/proyek/jadwal-service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string; rowId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales", "tim_teknis");
    const { id, rowId } = await params;
    const jadwal = await removeScheduleRow(session.id, id, rowId);
    return NextResponse.json(jadwal);
  } catch (error) {
    return errorResponse(error);
  }
}
