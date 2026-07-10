import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { withUserTransaction } from "@/lib/db/tx";
import { moveStatus } from "@/lib/workflow-status";
import { errorResponse } from "@/lib/api-error";

const bodySchema = z.object({ direction: z.enum(["up", "down"]) });

type RouteContext = { params: Promise<{ id: string }> };

/** Mirrors POST /api/daftar-pilihan/[kategori]/[id]/pindah exactly. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const { direction } = bodySchema.parse(await request.json());
    const rows = await withUserTransaction(session.id, (tx) => moveStatus(tx, id, direction));
    return NextResponse.json(rows.map((r) => ({
      id: r.id, entity: r.entity, label: r.label, color: r.color, systemRole: r.systemRole,
      isDefault: r.isDefault, isSystem: r.isSystem, isActive: r.isActive, sortOrder: r.sortOrder,
    })));
  } catch (error) {
    return errorResponse(error);
  }
}
