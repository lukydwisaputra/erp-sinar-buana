import { and, eq, gt, isNull } from "drizzle-orm";
import { withServiceRole } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { generateOpaqueToken, hashToken } from "./tokens";
import { INVITE_TOKEN_TTL_MS, RESET_TOKEN_TTL_MS } from "./cookie";

type TokenType = (typeof schema.authTokenType.enumValues)[number];

async function createToken(userId: string, type: TokenType, ttlMs: number) {
  const rawToken = generateOpaqueToken();
  await withServiceRole(async (tx) => {
    await tx.insert(schema.authTokens).values({
      userId,
      type,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMs),
    });
  });
  return rawToken;
}

/** EP-01 US-01.1 — sent (or, absent email, shown) when Admin creates an account. */
export function createInviteToken(userId: string): Promise<string> {
  return createToken(userId, "invite", INVITE_TOKEN_TTL_MS);
}

/** EP-01 US-01.4 — "Lupa sandi" / Admin-triggered reset. */
export function createResetToken(userId: string): Promise<string> {
  return createToken(userId, "reset", RESET_TOKEN_TTL_MS);
}

/**
 * Single-use + expiring (VR-01.7). Marks the token consumed and returns the
 * owning userId, or null if the token is invalid/expired/already used.
 */
export async function consumeToken(
  rawToken: string,
  type: TokenType,
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select({ id: schema.authTokens.id, userId: schema.authTokens.userId })
      .from(schema.authTokens)
      .where(
        and(
          eq(schema.authTokens.tokenHash, tokenHash),
          eq(schema.authTokens.type, type),
          isNull(schema.authTokens.usedAt),
          gt(schema.authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) return null;

    await tx
      .update(schema.authTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.authTokens.id, row.id));

    return row.userId;
  });
}

/** Derived "Menunggu Aktivasi" status (EP-01 §6) — no schema change needed. */
export async function hasPendingInvite(userId: string): Promise<boolean> {
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select({ id: schema.authTokens.id })
      .from(schema.authTokens)
      .where(
        and(
          eq(schema.authTokens.userId, userId),
          eq(schema.authTokens.type, "invite"),
          isNull(schema.authTokens.usedAt),
          gt(schema.authTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return !!row;
  });
}
