import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { createEmailDelivery } from "@/lib/pengiriman/service";
import { createDeliveryInputSchema } from "@/lib/schemas/pengiriman";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales");
    const body = createDeliveryInputSchema.parse(await request.json());
    const delivery = await createEmailDelivery(session.id, body);
    return NextResponse.json(delivery, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
