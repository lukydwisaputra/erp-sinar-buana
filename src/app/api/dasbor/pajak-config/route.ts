import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireFinance } from "@/lib/auth/rbac";
import { getPajakConfig, updatePajakConfig } from "@/lib/dasbor/pajak-config-service";
import { pajakConfigSchema } from "@/lib/schemas/pajak-config";
import { errorResponse } from "@/lib/api-error";

/** Admin/Keuangan only both ways — corp-tax method/rate feeds the P&L
 * (view_profit territory), and editing it is a Konfigurasi write. */
export async function GET() {
  try {
    const session = requireFinance(await getCurrentSession());
    const config = await getPajakConfig(session.id);
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireFinance(await getCurrentSession());
    const body = pajakConfigSchema.parse(await request.json());
    const config = await updatePajakConfig(session.id, body);
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error);
  }
}
