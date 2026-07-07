import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listByProyek, listAll, createFakturInduk } from "@/lib/faktur/service";
import { createFakturIndukSchema } from "@/lib/schemas/faktur";
import { errorResponse } from "@/lib/api-error";

// Matches faktur_sel/faktur_write: read = admin/keuangan/sales/tim_teknis
// (not viewer); write = admin/keuangan only (is_finance()).
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
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
