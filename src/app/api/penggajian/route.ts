import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listBatches, createBatch } from "@/lib/penggajian/service";
import { createBatchSchema } from "@/lib/schemas/penggajian";
import { errorResponse } from "@/lib/api-error";

/** GET: admin/keuangan/sales/tim_teknis matching nav's existing role list —
 * RLS narrows a non-finance session to only their own payslip, so this
 * route doesn't need any manual employeeId check itself. */
export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
    const batches = await listBatches(session.id);
    return NextResponse.json(batches);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const body = createBatchSchema.parse(await request.json());
    const batch = await createBatch(session.id, body);
    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
