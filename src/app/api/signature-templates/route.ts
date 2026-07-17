import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listSignatureTemplates, createSignatureTemplate } from "@/lib/signature-templates/service";
import { createSignatureTemplateSchema } from "@/lib/schemas/signature-templates";
import { errorResponse } from "@/lib/api-error";

/** Generic Konfigurasi RBAC: GET all 5 roles (SPH/Faktur forms need the list
 * to populate their signature-template picker), write Admin-only. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const rows = await listSignatureTemplates(session.id);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = createSignatureTemplateSchema.parse(await request.json());
    const template = await createSignatureTemplate(session.id, body);
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
