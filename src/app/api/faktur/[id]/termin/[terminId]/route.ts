import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateTermin } from "@/lib/faktur/service";
import { updateTerminSchema } from "@/lib/schemas/faktur";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string; terminId: string }> };

/** Pure status/field update — marking Lunas/Batal triggers the DB's payment
 * automation automatically (cashflow + tax entries, master-invoice roll-up). */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { id, terminId } = await params;
    const body = updateTerminSchema.parse(await request.json());
    const induk = await updateTermin(session.id, id, terminId, body);
    return NextResponse.json(induk);
  } catch (error) {
    return errorResponse(error);
  }
}
