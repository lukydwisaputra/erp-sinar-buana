import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getQuotation, updateQuotation, updateQuotationStatus, deleteQuotation } from "@/lib/penawaran/service";
import { updatePenawaranSchema } from "@/lib/schemas/penawaran";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const { id } = await params;
    const sph = await getQuotation(session.id, id);
    return NextResponse.json(sph);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales");
    const { id } = await params;
    const body = updatePenawaranSchema.parse(await request.json());
    const isStatusOnly = body.status !== undefined && Object.keys(body).length === 1;
    const sph = isStatusOnly
      ? await updateQuotationStatus(session.id, id, body.status!)
      : await updateQuotation(session.id, id, body);
    return NextResponse.json(sph);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    await deleteQuotation(session.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
