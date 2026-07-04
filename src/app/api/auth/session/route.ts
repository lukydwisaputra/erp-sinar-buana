import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { errorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak ada sesi aktif." }, { status: 401 });
    }
    return NextResponse.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}
