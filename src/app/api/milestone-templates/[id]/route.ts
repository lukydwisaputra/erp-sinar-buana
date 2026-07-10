import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import {
  getMilestoneTemplate, updateMilestoneTemplate, deleteMilestoneTemplate,
} from "@/lib/milestone-templates/service";
import { updateMilestoneTemplateSchema } from "@/lib/schemas/milestone-templates";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const { id } = await params;
    const template = await getMilestoneTemplate(session.id, id);
    return NextResponse.json(template);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const body = updateMilestoneTemplateSchema.parse(await request.json());
    const template = await updateMilestoneTemplate(session.id, id, body);
    return NextResponse.json(template);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    await deleteMilestoneTemplate(session.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
