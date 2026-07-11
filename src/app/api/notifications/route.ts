import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listNotifications } from "@/lib/notifications/service";
import { errorResponse } from "@/lib/api-error";

/** Every role — `notif_sel`'s RLS already scopes to the caller's own rows,
 * there's no role-based reason to gate this further. */
export async function GET() {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const notifications = await listNotifications(session.id);
    return NextResponse.json(notifications);
  } catch (error) {
    return errorResponse(error);
  }
}
