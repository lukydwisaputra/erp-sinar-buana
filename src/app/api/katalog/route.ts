import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listServices, createService } from "@/lib/katalog/service";
import { createLayananSchema } from "@/lib/schemas/katalog";
import { errorResponse } from "@/lib/api-error";

// RBAC matrix (planning/prd/02-peran-rbac.md §2.2): Katalog Layanan — Admin
// CRUD, Sales CRU (no delete), Keuangan/Tim Teknis/Viewer read-only.
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await listServices(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales");
    const body = createLayananSchema.parse(await request.json());
    const service = await createService(session.id, body);
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
