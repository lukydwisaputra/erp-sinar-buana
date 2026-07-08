import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateTemplate } from "@/lib/pengiriman-config/service";
import { updateTemplateInputSchema } from "@/lib/schemas/pengiriman-config";
import { errorResponse } from "@/lib/api-error";

export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = updateTemplateInputSchema.parse(await request.json());
    const template = await updateTemplate(session.id, body);
    return NextResponse.json(template);
  } catch (error) {
    return errorResponse(error);
  }
}
