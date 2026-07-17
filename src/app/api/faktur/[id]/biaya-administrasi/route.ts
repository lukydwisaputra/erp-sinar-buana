import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { generateCancellationFeeTermin } from "@/lib/faktur/service";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { id } = await params;
    const induk = await generateCancellationFeeTermin(session.id, id);
    return NextResponse.json(induk, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
