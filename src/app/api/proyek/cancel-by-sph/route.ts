import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { cancelProyekBySph } from "@/lib/proyek/service";
import { errorResponse } from "@/lib/api-error";

const bodySchema = z.object({ sphId: z.string() });

/** Cross-module cleanup: Faktur's (still-mock) cancel-faktur-by-sph flow
 * marks the real project born from that SPH as Batal. Not a normal "edit a
 * project" action, so gated broadly (any non-viewer) rather than the
 * stricter admin+tim_teknis matrix a real project edit needs. */
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
    const { sphId } = bodySchema.parse(await request.json());
    await cancelProyekBySph(session.id, sphId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
