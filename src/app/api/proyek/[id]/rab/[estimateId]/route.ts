import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateProjectRabEstimate } from "@/lib/proyek/rab-service";
import { updateProyekRabSchema } from "@/lib/schemas/proyek";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string; estimateId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { estimateId } = await params;
    const body = updateProyekRabSchema.parse(await request.json());
    const rab = await updateProjectRabEstimate(session.id, estimateId, body);
    return NextResponse.json(rab);
  } catch (error) {
    return errorResponse(error);
  }
}
