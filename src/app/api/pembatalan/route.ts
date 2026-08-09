import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { cancelPembatalan } from "@/lib/pembatalan/service";
import { cancelPembatalanSchema } from "@/lib/schemas/pembatalan";
import { errorResponse } from "@/lib/api-error";

// Cancellation touches cashflow and cascades across SPH/Proyek/Faktur — admin-only.
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = cancelPembatalanSchema.parse(await request.json());
    await cancelPembatalan(session.id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
