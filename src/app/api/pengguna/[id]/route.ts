import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateAccount, setAccountActive } from "@/lib/auth/accounts";
import { deleteAllSessionsForUser } from "@/lib/auth/session";
import { updatePenggunaSchema } from "@/lib/schemas/pengguna";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    requireRole(await getCurrentSession(), "admin");
    const { id } = await params;
    const body = updatePenggunaSchema.parse(await request.json());

    if (body.role !== undefined || body.employeeId !== undefined) {
      await updateAccount(id, { role: body.role, employeeId: body.employeeId });
    }
    if (body.isActive !== undefined) {
      await setAccountActive(id, body.isActive);
      // US-01.5 — deactivating logs the account out everywhere immediately.
      if (!body.isActive) await deleteAllSessionsForUser(id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
