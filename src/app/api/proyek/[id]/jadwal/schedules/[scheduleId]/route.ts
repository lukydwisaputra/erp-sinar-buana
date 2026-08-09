import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateScheduleMonths } from "@/lib/proyek/jadwal-service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string; scheduleId: string }> };

const bodySchema = z.object({ numMonths: z.coerce.number().min(1) });

// Admin-only, matching the rest of Jadwal's write endpoints — see
// src/app/api/proyek/[id]/jadwal/route.ts.
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id, scheduleId } = await params;
    const { numMonths } = bodySchema.parse(await request.json());
    const jadwal = await updateScheduleMonths(session.id, id, scheduleId, numMonths);
    return NextResponse.json(jadwal);
  } catch (error) {
    return errorResponse(error);
  }
}
