import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { withUserTransaction } from "@/lib/db/tx";
import { updateStatus, deleteStatus } from "@/lib/workflow-status";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

function toAdminRow(r: Awaited<ReturnType<typeof updateStatus>>) {
  return {
    id: r.id, entity: r.entity, label: r.label, color: r.color, systemRole: r.systemRole,
    isDefault: r.isDefault, isSystem: r.isSystem, isActive: r.isActive, sortOrder: r.sortOrder,
  };
}

const patchBodySchema = z.object({
  label: z.string().min(1).optional(),
  systemRole: z.enum(["SELESAI", "LUNAS", "DIBAYAR", "BATAL"]).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const body = patchBodySchema.parse(await request.json());
    const row = await withUserTransaction(session.id, (tx) => updateStatus(tx, id, body));
    return NextResponse.json(toAdminRow(row));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    await withUserTransaction(session.id, (tx) => deleteStatus(tx, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
