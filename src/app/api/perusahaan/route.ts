import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listCompanies, createCompany } from "@/lib/perusahaan/service";
import { createPerusahaanSchema } from "@/lib/schemas/perusahaan";
import { errorResponse } from "@/lib/api-error";

// RBAC matrix (planning/prd/02-peran-rbac.md §2.2): Perusahaan & PIC —
// Admin CRUDE, Sales CRU, Keuangan/Tim Teknis/Viewer R. Viewer kept
// deliberately: `companies`' own `client_read` RLS already scopes a
// client-linked session to just their own row, AND ProyekDetail's
// PerusahaanPic renders unconditionally for every role via this same list
// endpoint — removing viewer here would 403 their own Proyek detail page.
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await listCompanies(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "sales");
    const body = createPerusahaanSchema.parse(await request.json());
    const company = await createCompany(session.id, body);
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
