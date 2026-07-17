import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getPasswordHashById, setPasswordHash } from "@/lib/auth/accounts";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { isRateLimited } from "@/lib/auth/rate-limit";
import { changePasswordSchema } from "@/lib/schemas/profil";
import { errorResponse } from "@/lib/api-error";

const ALL_ROLES = ["admin", "keuangan", "sales", "tim_teknis", "viewer"] as const;

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), ...ALL_ROLES);

    if (isRateLimited(`password-change:${session.id}`)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan, coba lagi nanti." }, { status: 429 });
    }

    const body = changePasswordSchema.parse(await request.json());
    const currentHash = await getPasswordHashById(session.id);
    const valid = currentHash && (await verifyPassword(currentHash, body.currentPassword));
    if (!valid) {
      return NextResponse.json({ error: "Sandi saat ini salah." }, { status: 401 });
    }

    await setPasswordHash(session.id, await hashPassword(body.newPassword));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
