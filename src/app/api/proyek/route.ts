import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listProyek, createProyek } from "@/lib/proyek/service";
import { createProyekSchema } from "@/lib/schemas/proyek";
import { errorResponse } from "@/lib/api-error";

// RBAC matrix (planning/prd/02-peran-rbac.md §2.2 / user-stories 04): Proyek —
// Admin CRUD, Tim Teknis CRU (matches DB's tech_ins/tech_upd — no delete),
// Keuangan/Sales/Viewer read-only.
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const sphId = request.nextUrl.searchParams.get("sphId") ?? undefined;
    const rows = await listProyek(session.id, { sphId });
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "tim_teknis");
    const body = createProyekSchema.parse(await request.json());
    const proyek = await createProyek(session.id, body);
    return NextResponse.json(proyek, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
