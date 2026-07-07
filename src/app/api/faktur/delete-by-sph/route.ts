import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { deleteFakturBySph } from "@/lib/faktur/service";
import { errorResponse } from "@/lib/api-error";

const bodySchema = z.object({ sphId: z.string() });

/** Cross-module cleanup: Penawaran's delete flow removes the Faktur Induk set
 * born from a deleted SPH's project. Same broad non-viewer gating as
 * Proyek's cancel-by-sph/delete-by-sph (a cleanup action, not a normal
 * Faktur edit, so not restricted to is_finance() like real Faktur writes). */
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
    const { sphId } = bodySchema.parse(await request.json());
    await deleteFakturBySph(session.id, sphId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
