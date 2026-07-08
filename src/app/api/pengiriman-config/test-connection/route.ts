import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { testEmailConnection } from "@/lib/pengiriman-config/service";
import { testEmailConnectionInputSchema } from "@/lib/schemas/pengiriman-config";
import { errorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    requireRole(await getCurrentSession(), "admin");
    const body = testEmailConnectionInputSchema.parse(await request.json());
    const result = await testEmailConnection(body);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
