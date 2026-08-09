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

// Proyek's Jadwal is read-all/write-admin-only — everyone can see progress,
// only Admin can edit the plan (activity_schedules is shared with Penawaran,
// which keeps its own broader sales/tim_teknis write access there).
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const body = addRowSchema.parse(await request.json());
    const jadwal = await addScheduleRow(session.id, id, body);
    return NextResponse.json(jadwal, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
