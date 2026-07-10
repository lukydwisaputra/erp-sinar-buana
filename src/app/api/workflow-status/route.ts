import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { withUserTransaction } from "@/lib/db/tx";
import {
  listWorkflowStatuses, listAllForEntity, createStatus, type WorkflowStatusEntity,
} from "@/lib/workflow-status";
import { errorResponse } from "@/lib/api-error";

const VALID_ENTITIES: WorkflowStatusEntity[] = ["proyek", "milestone", "faktur", "penggajian"];

function toAdminRow(r: Awaited<ReturnType<typeof listAllForEntity>>[number]) {
  return {
    id: r.id, entity: r.entity, label: r.label, color: r.color, systemRole: r.systemRole,
    isDefault: r.isDefault, isSystem: r.isSystem, isActive: r.isActive, sortOrder: r.sortOrder,
  };
}

/** Shared status-list lookup for any config-driven entity (Proyek/Milestone/
 * Faktur/Penggajian) — lets a status dropdown list live options without each
 * module needing its own copy of this query. `includeInactive=true`
 * (Admin-only) switches to the Konfigurasi admin view, which also needs
 * inactive rows so they can be reactivated. */
export async function GET(request: NextRequest) {
  try {
    const entity = request.nextUrl.searchParams.get("entity");
    if (!entity || !VALID_ENTITIES.includes(entity as WorkflowStatusEntity)) {
      return NextResponse.json({ error: "entity wajib salah satu dari: proyek, milestone, faktur, penggajian." }, { status: 400 });
    }

    if (request.nextUrl.searchParams.get("includeInactive") === "true") {
      const session = requireRole(await getCurrentSession(), "admin");
      const rows = await withUserTransaction(session.id, (tx) => listAllForEntity(tx, entity as WorkflowStatusEntity));
      return NextResponse.json(rows.map(toAdminRow));
    }

    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await withUserTransaction(session.id, (tx) => listWorkflowStatuses(tx, entity as WorkflowStatusEntity));
    return NextResponse.json(rows.map((r) => ({ id: r.id, label: r.label, color: r.color, systemRole: r.systemRole })));
  } catch (error) {
    return errorResponse(error);
  }
}

const createBodySchema = z.object({
  entity: z.enum(["proyek", "milestone", "faktur", "penggajian"]),
  label: z.string().min(1, "Label wajib diisi."),
});

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = createBodySchema.parse(await request.json());
    const row = await withUserTransaction(session.id, (tx) => createStatus(tx, body.entity, body.label));
    return NextResponse.json(toAdminRow(row), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
