import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateEmailAkun } from "@/lib/pengiriman-config/service";
import { updateEmailAkunInputSchema } from "@/lib/schemas/pengiriman-config";
import { errorResponse } from "@/lib/api-error";

export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = updateEmailAkunInputSchema.parse(await request.json());
    const akun = await updateEmailAkun(session.id, body);
    return NextResponse.json(akun);
  } catch (error) {
    return errorResponse(error);
  }
}
