import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listQuotations, createQuotation } from "@/lib/penawaran/service";
import { createPenawaranSchema } from "@/lib/schemas/penawaran";
import { errorResponse } from "@/lib/api-error";

// RBAC matrix (planning/prd/02-peran-rbac.md §2.2): Penawaran (SPH) — Admin
// CRUDES, Sales CRUES (no delete), Keuangan/Tim Teknis/Viewer read-only.
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await listQuotations(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales");
    const body = createPenawaranSchema.parse(await request.json());
    const sph = await createQuotation(session.id, body);
    return NextResponse.json(sph, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
