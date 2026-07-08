import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireFinance } from "@/lib/auth/rbac";
import { getProfitabilitas } from "@/lib/dasbor/profitability";
import { errorResponse } from "@/lib/api-error";

/** Laba-Rugi & Profitabilitas Per-Proyek are view_profit/view_project_cost
 * territory (PRD Bab 8.7) — 403 before the service ever runs for non-finance
 * callers, not "computed then hidden" (US-09.5's literal acceptance
 * criterion). */
export async function GET(request: NextRequest) {
  try {
    const session = requireFinance(await getCurrentSession());
    const mulai = request.nextUrl.searchParams.get("mulai");
    const selesai = request.nextUrl.searchParams.get("selesai");
    if (!mulai || !selesai) {
      return NextResponse.json({ error: "mulai dan selesai wajib diisi." }, { status: 400 });
    }
    const view = await getProfitabilitas(session.id, { mulai, selesai });
    return NextResponse.json(view);
  } catch (error) {
    return errorResponse(error);
  }
}
