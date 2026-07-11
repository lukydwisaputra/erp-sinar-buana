import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listArusKas } from "@/lib/arus-kas/service";
import { errorResponse } from "@/lib/api-error";

/** Read-only — matches `cashflow_sel` (Keuangan-only, admin/keuangan;
 * manual-entry CRUD is out of scope this pass, see the Faktur plan). */
export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const entries = await listArusKas(session.id);
    return NextResponse.json(entries);
  } catch (error) {
    return errorResponse(error);
  }
}
