import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listDeliveries } from "@/lib/pengiriman/service";
import { errorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales");
    const deliveries = await listDeliveries(session.id);
    return NextResponse.json(deliveries);
  } catch (error) {
    return errorResponse(error);
  }
}
