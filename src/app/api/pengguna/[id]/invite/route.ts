import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { createInviteToken } from "@/lib/auth/invite-reset";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

/** US-01.2 edge case — "Kirim ulang undangan" for an expired/lost invite. */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const inviteToken = await createInviteToken(id);
    return NextResponse.json({ inviteToken });
  } catch (error) {
    return errorResponse(error);
  }
}
