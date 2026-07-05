import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateMilestone, deleteMilestone } from "@/lib/proyek/service";
import { updateMilestoneSchema } from "@/lib/schemas/proyek";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "tim_teknis");
    const { id, milestoneId } = await params;
    const body = updateMilestoneSchema.parse(await request.json());
    const proyek = await updateMilestone(session.id, id, milestoneId, body);
    return NextResponse.json(proyek);
  } catch (error) {
    return errorResponse(error);
  }
}

// Admin-only (see proyek/[id]/route.ts's DELETE comment — no tech delete
// policy on `milestones` either, cascades to sub-milestones via parent_id).
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id, milestoneId } = await params;
    const proyek = await deleteMilestone(session.id, id, milestoneId);
    return NextResponse.json(proyek);
  } catch (error) {
    return errorResponse(error);
  }
}
