import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listTemplates, createTemplate } from "@/lib/kelengkapan/service";
import { createKelengkapanSchema } from "@/lib/schemas/kelengkapan";
import { errorResponse } from "@/lib/api-error";

// No PRD chapter/RBAC-matrix row exists for Kelengkapan — Admin-only write
// was a scope decision made directly with the user (matches the Konfigurasi/
// Daftar Pilihan precedent for centrally-maintained reference data), all
// other roles read-only.
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await listTemplates(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = createKelengkapanSchema.parse(await request.json());
    const template = await createTemplate(session.id, body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
