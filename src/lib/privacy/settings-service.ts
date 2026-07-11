import { eq } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import type { PrivacySettings } from "@/lib/schemas/privacy";

export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx.select().from(schema.privacySettings).limit(1);
    return { enabled: row.enabled };
  });
}

export async function updatePrivacySettings(
  userId: string,
  input: PrivacySettings,
): Promise<PrivacySettings> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .update(schema.privacySettings)
      .set({ enabled: input.enabled })
      .where(eq(schema.privacySettings.singleton, true))
      .returning();
    return { enabled: row.enabled };
  });
}
