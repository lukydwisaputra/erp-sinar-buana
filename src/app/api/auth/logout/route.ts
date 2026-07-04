import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie";
import { deleteSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) await deleteSession(rawToken);
    cookieStore.delete(SESSION_COOKIE_NAME);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
