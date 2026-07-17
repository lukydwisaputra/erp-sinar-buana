import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getProjectRabEstimates } from "@/lib/proyek/rab-service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

// Matches project_rab_estimates' RLS (project_rab_estimates_sel/write):
// Admin/Keuangan only — same view_project_cost rule as Realisasi RAB.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { id } = await params;
    const rab = await getProjectRabEstimates(session.id, id);
    return NextResponse.json(rab);
  } catch (error) {
    return errorResponse(error);
  }
}
