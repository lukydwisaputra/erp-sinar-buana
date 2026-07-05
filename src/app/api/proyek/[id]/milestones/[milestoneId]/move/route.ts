import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { moveMilestone } from "@/lib/proyek/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string; milestoneId: string }> };

const moveSchema = z.object({ direction: z.enum(["up", "down"]) });

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "tim_teknis");
    const { id, milestoneId } = await params;
    const { direction } = moveSchema.parse(await request.json());
    const proyek = await moveMilestone(session.id, id, milestoneId, direction);
    return NextResponse.json(proyek);
  } catch (error) {
    return errorResponse(error);
  }
}
