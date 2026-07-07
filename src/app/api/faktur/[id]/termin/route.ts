import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { generateNextTermin } from "@/lib/faktur/service";
import { generateTerminSchema } from "@/lib/schemas/faktur";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

/** Generates the next Invoice Termin in sequence. The DB trigger
 * (fn_installment_validate) enforces the sum-vs-Total-Biaya guard — surfaced
 * here as a 409 if it fires. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { id } = await params;
    const body = generateTerminSchema.parse(await request.json());
    const induk = await generateNextTermin(session.id, id, body);
    return NextResponse.json(induk, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
