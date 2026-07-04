import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listEmployees, createEmployee } from "@/lib/karyawan/service";
import { createKaryawanSchema } from "@/lib/schemas/karyawan";
import { errorResponse } from "@/lib/api-error";

// RBAC matrix (planning/prd/02-peran-rbac.md §2.3): Data Karyawan — Admin
// CRUD, Keuangan/Tim Teknis read-only, Sales/Viewer no access.
export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "tim_teknis");
    const rows = await listEmployees(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = createKaryawanSchema.parse(await request.json());
    const employee = await createEmployee(session.id, body);
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
