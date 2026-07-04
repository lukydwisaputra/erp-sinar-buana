import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeToken } from "@/lib/auth/invite-reset";
import { hashPassword } from "@/lib/auth/password";
import { setPasswordHash } from "@/lib/auth/accounts";
import { deleteAllSessionsForUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api-error";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Sandi minimal 8 karakter."),
});

export async function POST(request: NextRequest) {
  try {
    const body = resetPasswordSchema.parse(await request.json());

    const userId = await consumeToken(body.token, "reset");
    if (!userId) {
      return NextResponse.json(
        { error: "Tautan tidak berlaku atau kedaluwarsa." },
        { status: 400 },
      );
    }

    await setPasswordHash(userId, await hashPassword(body.password));
    await deleteAllSessionsForUser(userId); // a reset invalidates any existing logins

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
