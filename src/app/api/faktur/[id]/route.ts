import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getFakturInduk, updateFakturInduk } from "@/lib/faktur/service";
import { updateFakturIndukSchema } from "@/lib/schemas/faktur";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

// Read: admin/keuangan + viewer (own company only, client_read RLS).
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "viewer");
    const { id } = await params;
    const induk = await getFakturInduk(session.id, id);
    return NextResponse.json(induk);
  } catch (error) {
    return errorResponse(error);
  }
}

// Matches faktur_write (is_finance()) — same roles as POST /api/faktur.
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { id } = await params;
    const body = updateFakturIndukSchema.parse(await request.json());
    const induk = await updateFakturInduk(session.id, id, body);
    return NextResponse.json(induk);
  } catch (error) {
    return errorResponse(error);
  }
}
