import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listProyekLog } from "@/lib/proyek/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

// Not Viewer — internal status-change audit trail, not client-facing
// (matches project_status_log's RLS, staff-only, no client_read).
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis",
    );
    const { id } = await params;
    const log = await listProyekLog(session.id, id);
    return NextResponse.json(log);
  } catch (error) {
    return errorResponse(error);
  }
}
