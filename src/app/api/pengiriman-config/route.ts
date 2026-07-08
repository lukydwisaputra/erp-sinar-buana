import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getConfig } from "@/lib/pengiriman-config/service";
import { errorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const config = await getConfig(session.id);
    return NextResponse.json(config);
  } catch (error) {
    return errorResponse(error);
  }
}
