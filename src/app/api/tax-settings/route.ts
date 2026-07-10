import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole, requireFinance } from "@/lib/auth/rbac";
import { getTaxSettings, updateTaxSettings } from "@/lib/tax-settings/service";
import { updateTaxSettingsSchema } from "@/lib/schemas/tax-settings";
import { errorResponse } from "@/lib/api-error";

/** GET: all 5 roles — Sales/Tim Teknis need ppnRate/pph23Rate/
 * quotationValidityDays to prefill new SPHs (sph-builder.tsx). PATCH:
 * Admin/Keuangan — the Tax Center RBAC row (PRD 02-peran-rbac.md), matching
 * the new `tax_settings_write` RLS policy. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const settings = await getTaxSettings(session.id);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireFinance(await getCurrentSession());
    const body = updateTaxSettingsSchema.parse(await request.json());
    const settings = await updateTaxSettings(session.id, body);
    return NextResponse.json(settings);
  } catch (error) {
    return errorResponse(error);
  }
}
