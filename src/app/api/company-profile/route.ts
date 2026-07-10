import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/company-profile/service";
import { updateCompanyProfileSchema } from "@/lib/schemas/company-profile";
import { errorResponse } from "@/lib/api-error";

/** Singleton config, no `[id]`. GET: same 5-role read-all as every other
 * Konfigurasi table. PATCH: Admin only — matches `company_profile`'s RLS
 * exactly (`read_auth` grants SELECT to all, only `admin_all` can write). */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const profile = await getCompanyProfile(session.id);
    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const body = updateCompanyProfileSchema.parse(await request.json());
    const profile = await updateCompanyProfile(session.id, body);
    return NextResponse.json(profile);
  } catch (error) {
    return errorResponse(error);
  }
}
