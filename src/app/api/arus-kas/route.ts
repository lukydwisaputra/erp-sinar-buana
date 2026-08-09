import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listArusKas, createArusKasEntry } from "@/lib/arus-kas/service";
import { createArusKasEntrySchema } from "@/lib/schemas/arus-kas";
import { errorResponse } from "@/lib/api-error";

/** Matches `cashflow_sel` (Keuangan-only, admin/keuangan) for both read and
 * manual-entry write. */
export async function GET() {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const entries = await listArusKas(session.id);
    return NextResponse.json(entries);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const body = createArusKasEntrySchema.parse(await request.json());
    const entry = await createArusKasEntry(session.id, body);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
