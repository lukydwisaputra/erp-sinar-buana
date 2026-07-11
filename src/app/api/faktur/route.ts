import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listByProyek, listAll, createFakturInduk } from "@/lib/faktur/service";
import { createFakturIndukSchema } from "@/lib/schemas/faktur";
import { errorResponse } from "@/lib/api-error";

// Read: admin/keuangan (all rows, is_finance()) + viewer (own company only,
// via client_read RLS — matches faktur_sel/client_read). Write stays
// Keuangan-only (faktur_write).
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "viewer");
    const proyekId = request.nextUrl.searchParams.get("proyekId");
    const rows = proyekId ? await listByProyek(session.id, proyekId) : await listAll(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const body = createFakturIndukSchema.parse(await request.json());
    const induk = await createFakturInduk(session.id, body);
    return NextResponse.json(induk, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
