import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getProjectSchedules, addScheduleRow } from "@/lib/proyek/jadwal-service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const { id } = await params;
    const jadwal = await getProjectSchedules(session.id, id);
    return NextResponse.json(jadwal);
  } catch (error) {
    return errorResponse(error);
  }
}

const addRowSchema = z.object({
  scheduleId: z.string().optional(),
  activityName: z.string().min(1),
  numMonths: z.coerce.number().optional(),
});

// Matches RLS's sched_write: sales or tim_teknis (activity_schedules family
// is shared between Penawaran-time planning and Proyek-time progress).
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales", "tim_teknis");
    const { id } = await params;
    const body = addRowSchema.parse(await request.json());
    const jadwal = await addScheduleRow(session.id, id, body);
    return NextResponse.json(jadwal, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
