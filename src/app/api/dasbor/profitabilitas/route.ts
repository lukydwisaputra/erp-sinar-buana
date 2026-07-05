import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getProfitabilitas } from "@/lib/dasbor/profitability";
import { errorResponse } from "@/lib/api-error";

/** See dasbor/alerts/route.ts's comment — same reason this route exists. */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
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
