import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getProyek, updateProyek, deleteProyek } from "@/lib/proyek/service";
import { updateProyekSchema } from "@/lib/schemas/proyek";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const { id } = await params;
    const proyek = await getProyek(session.id, id);
    return NextResponse.json(proyek);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "tim_teknis");
    const { id } = await params;
    const body = updateProyekSchema.parse(await request.json());
    const proyek = await updateProyek(session.id, id, body);
    return NextResponse.json(proyek);
  } catch (error) {
    return errorResponse(error);
  }
}

// Admin-only — matches the DB's RLS (no tech delete policy for `projects`,
// only `admin_all`); PRD user-stories: "Tim Teknis never deletes a proyek."
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    await deleteProyek(session.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
