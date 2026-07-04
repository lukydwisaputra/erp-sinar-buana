import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { consumeToken } from "@/lib/auth/invite-reset";
import { hashPassword } from "@/lib/auth/password";
import { setPasswordHash } from "@/lib/auth/accounts";
import { createSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, SESSION_TTL_MS } from "@/lib/auth/cookie";
import { errorResponse } from "@/lib/api-error";

// VR-01.5 — baseline password policy.
const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Sandi minimal 8 karakter."),
});

export async function POST(request: NextRequest) {
  try {
    const body = acceptInviteSchema.parse(await request.json());

    const userId = await consumeToken(body.token, "invite");
    if (!userId) {
      return NextResponse.json(
        { error: "Tautan tidak berlaku atau kedaluwarsa." },
        { status: 400 },
      );
    }

    await setPasswordHash(userId, await hashPassword(body.password));

    // US-01.2 — auto-login after activation.
    const rawToken = await createSession(userId);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: SESSION_TTL_MS / 1000,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
