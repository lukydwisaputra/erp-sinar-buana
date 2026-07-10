import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import {
  getTerminTemplate, updateTerminTemplate, deleteTerminTemplate,
} from "@/lib/termin-templates/service";
import { updateTerminTemplateSchema } from "@/lib/schemas/termin-templates";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const { id } = await params;
    const template = await getTerminTemplate(session.id, id);
    return NextResponse.json(template);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const body = updateTerminTemplateSchema.parse(await request.json());
    const template = await updateTerminTemplate(session.id, id, body);
    return NextResponse.json(template);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    await deleteTerminTemplate(session.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
