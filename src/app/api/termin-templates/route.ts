import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listTerminTemplates, createTerminTemplate } from "@/lib/termin-templates/service";
import { createTerminTemplateSchema } from "@/lib/schemas/termin-templates";
import { errorResponse } from "@/lib/api-error";

/** Generic Konfigurasi RBAC: GET all 5 roles, write Admin-only. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await listTerminTemplates(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = createTerminTemplateSchema.parse(await request.json());
    const template = await createTerminTemplate(session.id, body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
