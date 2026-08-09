import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { getAccountById, updateAccount } from "@/lib/auth/accounts";
import { updateProfilSchema } from "@/lib/schemas/profil";
import { NotFoundError, errorResponse } from "@/lib/api-error";

const ALL_ROLES = ["admin", "keuangan", "sales", "tim_teknis", "viewer"] as const;

/** Every logged-in account can view/edit its own profile — unlike Akun
 * Pengguna (Admin-only, manages every OTHER account's role/employeeId/
 * clientCompanyId/isActive), this is scoped to `session.id` only. */
export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), ...ALL_ROLES);
    const account = await getAccountById(session.id);
    if (!account) throw new NotFoundError("Akun tidak ditemukan.");
    return NextResponse.json(account);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), ...ALL_ROLES);
    const body = updateProfilSchema.parse(await request.json());
    await updateAccount(session.id, { fullName: body.fullName });
    const account = await getAccountById(session.id);
    return NextResponse.json(account);
  } catch (error) {
    return errorResponse(error);
  }
}
