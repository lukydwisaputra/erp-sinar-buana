import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCredentialsByEmail } from "@/lib/auth/accounts";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, SESSION_TTL_MS } from "@/lib/auth/cookie";
import { isRateLimited } from "@/lib/auth/rate-limit";
import { errorResponse } from "@/lib/api-error";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// US-01.3 — never reveal whether the email or the password was wrong.
const GENERIC_ERROR = "Email atau sandi salah.";
const INACTIVE_ERROR = "Akun nonaktif, hubungi Admin.";

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());

    if (isRateLimited(`login:${body.email}`)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan, coba lagi nanti." },
        { status: 429 },
      );
    }

    const credentials = await getCredentialsByEmail(body.email);
    if (!credentials || !credentials.passwordHash) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }
    if (!credentials.isActive) {
      return NextResponse.json({ error: INACTIVE_ERROR }, { status: 403 });
    }

    const valid = await verifyPassword(credentials.passwordHash, body.password);
    if (!valid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const rawToken = await createSession(credentials.id);
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
