import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { addMilestone } from "@/lib/proyek/service";
import { createMilestoneSchema } from "@/lib/schemas/proyek";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "tim_teknis");
    const { id } = await params;
    const body = createMilestoneSchema.parse(await request.json());
    const proyek = await addMilestone(session.id, id, body);
    return NextResponse.json(proyek, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
