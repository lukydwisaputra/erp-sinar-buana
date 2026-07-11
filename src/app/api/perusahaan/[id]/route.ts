import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getCompany, updateCompany, deleteCompany } from "@/lib/perusahaan/service";
import { updatePerusahaanSchema } from "@/lib/schemas/perusahaan";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

// Not Viewer — unlike the list endpoint, nothing in the client portal calls
// this single-company lookup (confirmed: no live caller of usePerusahaan(id)
// anywhere in the app).
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis",
    );
    const { id } = await params;
    const company = await getCompany(session.id, id);
    return NextResponse.json(company);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales");
    const { id } = await params;
    const body = updatePerusahaanSchema.parse(await request.json());
    const company = await updateCompany(session.id, id, body);
    return NextResponse.json(company);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    await deleteCompany(session.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
