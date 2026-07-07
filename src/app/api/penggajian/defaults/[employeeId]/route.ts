import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getEmployeeDefaults } from "@/lib/penggajian/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ employeeId: string }> };

/** Resolves an employee's configured salary components (tunjangan/potongan)
 * into prefillable default line items for the batch-creation wizard —
 * Finance edits/removes/adds lines afterward, this is only a starting point. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { employeeId } = await params;
    const defaults = await getEmployeeDefaults(session.id, employeeId);
    return NextResponse.json(defaults);
  } catch (error) {
    return errorResponse(error);
  }
}
