import { and, eq, ne } from "drizzle-orm";
import { withServiceRole } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";

export type MentionableUser = { id: string; nama: string };

/** `user_profiles`' own RLS (`profiles_sel`) only lets a session read its own
 * row — same elevation precedent as `proyek/service.ts`'s `loadUserNames`.
 * Deliberately minimal (id + name only, no email/role/status) since this is
 * exposed to every role just to populate a comment @mention picker, unlike
 * the full Akun Pengguna list which stays Admin-only. Excludes role='viewer'
 * — those are client-portal (PIC) accounts with no access to comments at
 * all, so mentioning one would create a notification pointing at a thread
 * they can never open. */
export async function listMentionableUsers(): Promise<MentionableUser[]> {
  return withServiceRole(async (tx) => {
    const rows = await tx
      .select({ id: schema.userProfiles.id, fullName: schema.userProfiles.fullName })
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.isActive, true), ne(schema.userProfiles.role, "viewer")))
      .orderBy(schema.userProfiles.fullName);
    return rows.map((r) => ({ id: r.id, nama: r.fullName }));
  });
}
