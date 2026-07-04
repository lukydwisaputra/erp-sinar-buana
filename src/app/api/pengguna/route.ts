import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listAccounts, createAccount, type Account } from "@/lib/auth/accounts";
import { hasPendingInvite, createInviteToken } from "@/lib/auth/invite-reset";
import { createPenggunaSchema, type AkunStatus } from "@/lib/schemas/pengguna";
import { errorResponse } from "@/lib/api-error";

async function withStatus(account: Account): Promise<Account & { status: AkunStatus }> {
  if (!account.isActive) return { ...account, status: "nonaktif" };
  if (!account.hasPasswordSet && (await hasPendingInvite(account.id))) {
    return { ...account, status: "menunggu_aktivasi" };
  }
  return { ...account, status: "aktif" };
}

// FR-01.1/01.4 — matrix: "Kelola Akun Pengguna" is Admin-only.
export async function GET() {
  try {
    requireRole(await getCurrentSession(), "admin");
    const accounts = await listAccounts();
    const withStatuses = await Promise.all(accounts.map(withStatus));
    return NextResponse.json(withStatuses);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireRole(await getCurrentSession(), "admin");
    const body = createPenggunaSchema.parse(await request.json());

    const account = await createAccount(body);
    const inviteToken = await createInviteToken(account.id);

    // No email service wired yet (see plan Non-goals) — the Admin UI shows
    // this link directly, per EP-01 §7's own documented fallback.
    return NextResponse.json(
      { ...account, status: "menunggu_aktivasi" as const, inviteToken },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
