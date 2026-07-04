import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getEmployee, updateEmployee } from "@/lib/karyawan/service";
import { updateKaryawanSchema } from "@/lib/schemas/karyawan";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "tim_teknis");
    const { id } = await params;
    const employee = await getEmployee(session.id, id);
    return NextResponse.json(employee);
  } catch (error) {
    return errorResponse(error);
  }
}

// Covers both editing and the "Nonaktifkan" archive action (status: "terarsip")
// — Karyawan has no hard delete, matching the mock's deactivate-only behavior.
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const body = updateKaryawanSchema.parse(await request.json());
    const employee = await updateEmployee(session.id, id, body);
    return NextResponse.json(employee);
  } catch (error) {
    return errorResponse(error);
  }
}
