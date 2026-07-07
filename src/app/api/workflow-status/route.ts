import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { withUserTransaction } from "@/lib/db/tx";
import { listWorkflowStatuses, type WorkflowStatusEntity } from "@/lib/workflow-status";
import { errorResponse } from "@/lib/api-error";

const VALID_ENTITIES: WorkflowStatusEntity[] = ["proyek", "milestone", "faktur"];

/** Shared status-list lookup for any config-driven entity (Proyek/Milestone/
 * Faktur) — lets a status dropdown list live options without each module
 * needing its own copy of this query. */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const entity = request.nextUrl.searchParams.get("entity");
    if (!entity || !VALID_ENTITIES.includes(entity as WorkflowStatusEntity)) {
      return NextResponse.json({ error: "entity wajib salah satu dari: proyek, milestone, faktur." }, { status: 400 });
    }
    const rows = await withUserTransaction(session.id, (tx) => listWorkflowStatuses(tx, entity as WorkflowStatusEntity));
    return NextResponse.json(rows.map((r) => ({ id: r.id, label: r.label, color: r.color, systemRole: r.systemRole })));
  } catch (error) {
    return errorResponse(error);
  }
}
