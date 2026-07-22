import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { globalSearch } from "@/lib/search/service";
import { errorResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const results = await globalSearch(session.id, q);
    return NextResponse.json(results);
  } catch (error) {
    return errorResponse(error);
  }
}
