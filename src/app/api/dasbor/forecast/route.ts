import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireFinance } from "@/lib/auth/rbac";
import { getForekast } from "@/lib/dasbor/forecast-view";
import { errorResponse } from "@/lib/api-error";

/** Proyeksi Arus Kas & Runway is view_forecast territory (PRD Bab 8.7) —
 * 403 before the service ever runs for non-finance callers. */
export async function GET(request: NextRequest) {
  try {
    const session = requireFinance(await getCurrentSession());
    const horizonParam = request.nextUrl.searchParams.get("horizonDays");
    const horizonDays = horizonParam ? Number(horizonParam) : undefined;
    const view = await getForekast(session.id, horizonDays);
    return NextResponse.json(view);
  } catch (error) {
    return errorResponse(error);
  }
}
