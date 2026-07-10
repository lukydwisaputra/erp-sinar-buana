import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getNumberingSettings, updateNumberingSettings } from "@/lib/numbering/service";
import { updateNumberingSettingsSchema } from "@/lib/schemas/numbering";
import { errorResponse } from "@/lib/api-error";

/** GET: all 5 roles (uniform read_auth shape, matches every other
 * Konfigurasi singleton). PATCH: Admin only — generic Konfigurasi RBAC row,
 * matches numbering_settings' RLS (admin_all only, no finance policy). */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const settings = await getNumberingSettings(session.id);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = updateNumberingSettingsSchema.parse(await request.json());
    const settings = await updateNumberingSettings(session.id, body);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
