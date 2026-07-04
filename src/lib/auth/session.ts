import { and, eq, gt } from "drizzle-orm";
import { withServiceRole } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { generateOpaqueToken, hashToken } from "./tokens";
import { SESSION_TTL_MS } from "./cookie";

export type SessionUser = {
  id: string;
  fullName: string;
  role: (typeof schema.appRole.enumValues)[number];
  employeeId: string | null;
  isActive: boolean;
};

export async function createSession(userId: string): Promise<string> {
  const rawToken = generateOpaqueToken();
  await withServiceRole(async (tx) => {
    await tx.insert(schema.sessions).values({
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
  });
  return rawToken;
}

export async function getSession(
  rawToken: string,
): Promise<SessionUser | null> {
  const tokenHash = hashToken(rawToken);
  return withServiceRole(async (tx) => {
    const [row] = await tx
      .select({
        id: schema.userProfiles.id,
        fullName: schema.userProfiles.fullName,
        role: schema.userProfiles.role,
        employeeId: schema.userProfiles.employeeId,
        isActive: schema.userProfiles.isActive,
      })
      .from(schema.sessions)
      .innerJoin(
        schema.userProfiles,
        eq(schema.sessions.userId, schema.userProfiles.id),
      )
      .where(
        and(
          eq(schema.sessions.tokenHash, tokenHash),
          gt(schema.sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row || !row.isActive) return null; // FR-01.9 — inactive accounts can't stay logged in
    return row;
  });
}

export async function deleteSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await withServiceRole(async (tx) => {
    await tx.delete(schema.sessions).where(eq(schema.sessions.tokenHash, tokenHash));
  });
}

/** Called on account deactivation (FR-01.6/01.9) — logs every device out. */
export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await withServiceRole(async (tx) => {
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  });
}
