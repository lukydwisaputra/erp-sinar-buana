import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listProyek } from "@/lib/proyek/service";
import { filterProyekForRole } from "@/lib/dasbor/rbac-view";
import { computeProyekSummary } from "@/lib/dasbor/proyek-summary";
import { errorResponse } from "@/lib/api-error";

/** FR-09.4 — Ringkasan Proyek is the one panel non-finance staff see too
 * (Tim Teknis narrowed to assigned projects via filterProyekForRole). Not
 * Viewer — Dasbor isn't part of the client portal (Penawaran/Proyek/Faktur
 * only, each already scoped by client_read RLS on its own). */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis",
    );
    const proyeks = await listProyek(session.id);
    const summary = computeProyekSummary(filterProyekForRole(proyeks, session));
    return NextResponse.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
