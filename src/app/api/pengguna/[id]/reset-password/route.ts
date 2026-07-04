import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { createResetToken } from "@/lib/auth/invite-reset";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * US-01.4 "Admin reset paksa" — for a user who can't access their email.
 * Issues a reset link for the Admin to hand to the user directly (same
 * no-email-service fallback as invites) rather than the Admin choosing the
 * user's new password themselves.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  try {
    requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const resetToken = await createResetToken(id);
    return NextResponse.json({ resetToken });
  } catch (error) {
    return errorResponse(error);
  }
}
