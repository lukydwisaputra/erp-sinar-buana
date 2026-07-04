import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccountByEmail } from "@/lib/auth/accounts";
import { createResetToken } from "@/lib/auth/invite-reset";
import { isRateLimited } from "@/lib/auth/rate-limit";
import { errorResponse } from "@/lib/api-error";

const requestResetSchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  try {
    const body = requestResetSchema.parse(await request.json());

    if (isRateLimited(`reset:${body.email}`)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan, coba lagi nanti." },
        { status: 429 },
      );
    }

    // US-01.4 — always report success (anti-enumeration); only issue a token
    // if the account actually exists. No email service is wired yet (see
    // Non-goals) — the link is only ever surfaced to an Admin via /pengguna,
    // never returned here.
    const account = await getAccountByEmail(body.email);
    if (account && account.isActive) {
      await createResetToken(account.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
