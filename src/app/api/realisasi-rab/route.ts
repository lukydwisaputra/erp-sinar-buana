import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listByProyek, create } from "@/lib/realisasi-rab/service";
import { realisasiRabFormSchema } from "@/lib/schemas/realisasi-rab";
import { errorResponse } from "@/lib/api-error";

// Matches rab_actuals' RLS (rab_actuals_sel/write): Admin/Keuangan only —
// biaya/margin proyek stays hidden from Sales/Tim Teknis/Viewer (PRD Bab 6.8,
// `view_project_cost`).
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const proyekId = request.nextUrl.searchParams.get("proyekId");
    if (!proyekId) return NextResponse.json({ error: "proyekId wajib diisi." }, { status: 400 });
    const rows = await listByProyek(session.id, proyekId);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const body = realisasiRabFormSchema.parse(await request.json());
    const row = await create(session.id, body);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
