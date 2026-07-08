import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listCashflowCategories, createCashflowCategory } from "@/lib/arus-kas/service";
import { createCashflowCategoryInputSchema } from "@/lib/schemas/expense-nature";
import { errorResponse } from "@/lib/api-error";

/** Read matches cashflow_sel's own role set; write is Admin-only, same as
 * every other Konfigurasi list (Daftar Pilihan, etc.). */
export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "viewer");
    const categories = await listCashflowCategories(session.id);
    return NextResponse.json(categories);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = createCashflowCategoryInputSchema.parse(await request.json());
    const category = await createCashflowCategory(session.id, body);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
