import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole, requireFinance } from "@/lib/auth/rbac";
import { getPrivacySettings, updatePrivacySettings } from "@/lib/privacy/settings-service";
import { privacySettingsSchema } from "@/lib/schemas/privacy";
import { errorResponse } from "@/lib/api-error";

/** GET: every role needs to know whether privacy mode is on to render the
 * TopBar eye toggle. PATCH: Admin/Keuangan only — this is a Konfigurasi write. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const settings = await getPrivacySettings(session.id);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireFinance(await getCurrentSession());
    const body = privacySettingsSchema.parse(await request.json());
    const settings = await updatePrivacySettings(session.id, body);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
