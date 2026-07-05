import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { toggleActualWeek, getProjectSchedules } from "@/lib/proyek/jadwal-service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

const markSchema = z.object({ rowId: z.string(), weekNumber: z.coerce.number() });

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales", "tim_teknis");
    const { id } = await params;
    const { rowId, weekNumber } = markSchema.parse(await request.json());
    await toggleActualWeek(session.id, rowId, weekNumber);
    const jadwal = await getProjectSchedules(session.id, id);
    return NextResponse.json(jadwal);
  } catch (error) {
    return errorResponse(error);
  }
}
