import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateCategoryExpenseNature, deleteCashflowCategory } from "@/lib/arus-kas/service";
import { updateCashflowCategoryInputSchema } from "@/lib/schemas/expense-nature";
import { errorResponse } from "@/lib/api-error";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const body = updateCashflowCategoryInputSchema.parse(await request.json());
    const category = await updateCategoryExpenseNature(session.id, id, body.sifat);
    return NextResponse.json(category);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    await deleteCashflowCategory(session.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
