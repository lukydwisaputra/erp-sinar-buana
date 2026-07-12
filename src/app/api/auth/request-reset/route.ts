import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccountByEmail } from "@/lib/auth/accounts";
import { createResetToken } from "@/lib/auth/invite-reset";
import { isRateLimited } from "@/lib/auth/rate-limit";
import { errorResponse } from "@/lib/api-error";
import { getBoss, PASSWORD_RESET_EMAIL_QUEUE } from "@/lib/queue/boss";
import { reportError } from "@/lib/observability/sentry";

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
    // (and queue an email) if the account actually exists.
    const account = await getAccountByEmail(body.email);
    if (account && account.isActive) {
      const rawToken = await createResetToken(account.id);
      // Behind Traefik, request.url's origin reflects the container's own
      // bind address (0.0.0.0:3000), not the public Host header — use the
      // same APP_URL the worker already relies on for building public links.
      const origin = process.env.APP_URL ?? new URL(request.url).origin;
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        const boss = await getBoss();
        // Reset tokens expire in 1h (RESET_TOKEN_TTL_MS) — no point retrying past that.
        await boss.send(
          PASSWORD_RESET_EMAIL_QUEUE,
          { to: body.email, resetUrl },
          { retryLimit: 3, retryDelay: 30, expireInSeconds: 3600 },
        );
      } catch (err) {
        // Queueing failure shouldn't surface to the client (anti-enumeration,
        // and the token itself is still valid if an Admin hands it over manually).
        reportError(err, { source: "request-reset" });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
