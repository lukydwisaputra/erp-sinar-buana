import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listMentionableUsers } from "@/lib/mentionable-users/service";
import { errorResponse } from "@/lib/api-error";

/** Staff roles only — populates the @mention picker on project comments,
 * which Viewer (client portal) doesn't have at all. Deliberately minimal
 * data (id + name), unlike the Admin-only Akun Pengguna list. */
export async function GET() {
  try {
    requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis",
    );
    const users = await listMentionableUsers();
    return NextResponse.json(users);
  } catch (error) {
    return errorResponse(error);
  }
}
