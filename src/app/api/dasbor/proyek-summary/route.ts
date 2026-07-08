import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listProyek } from "@/lib/proyek/service";
import { filterProyekForRole } from "@/lib/dasbor/rbac-view";
import { computeProyekSummary } from "@/lib/dasbor/proyek-summary";
import { errorResponse } from "@/lib/api-error";

/** FR-09.4 — Ringkasan Proyek is the one panel non-finance roles see too
 * (Tim Teknis narrowed to assigned projects via filterProyekForRole). */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const proyeks = await listProyek(session.id);
    const summary = computeProyekSummary(filterProyekForRole(proyeks, session));
    return NextResponse.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
