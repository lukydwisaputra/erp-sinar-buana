import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listTaxEntries } from "@/lib/tax/service";
import { errorResponse } from "@/lib/api-error";

/** Read-only — matches `tax_sel` (admin/keuangan only, no viewer read, a
 * stricter cut than every other read-heavy route wired so far). */
export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const entries = await listTaxEntries(session.id);
    return NextResponse.json(entries);
  } catch (error) {
    return errorResponse(error);
  }
}
