import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listRabTemplates, createRabTemplate } from "@/lib/rab-templates/service";
import { createRabTemplateSchema } from "@/lib/schemas/rab-templates";
import { errorResponse } from "@/lib/api-error";

/** Generic Konfigurasi RBAC: GET all 5 roles, write Admin-only. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await listRabTemplates(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = createRabTemplateSchema.parse(await request.json());
    const template = await createRabTemplate(session.id, body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
