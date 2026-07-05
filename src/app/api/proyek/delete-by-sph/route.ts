import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { deleteProyekBySph } from "@/lib/proyek/service";
import { errorResponse } from "@/lib/api-error";

const bodySchema = z.object({ sphId: z.string() });

/** Cross-module cleanup: Penawaran's delete flow removes the real project
 * born from a deleted SPH. Same broad non-viewer gating as cancel-by-sph. */
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
    const { sphId } = bodySchema.parse(await request.json());
    await deleteProyekBySph(session.id, sphId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
