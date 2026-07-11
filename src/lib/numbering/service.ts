import { eq } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { toNumberingSettings, type NumberingSettingsRow } from "@/lib/numbering/mapping";
import type { NumberingSettings, UpdateNumberingSettingsInput } from "@/lib/schemas/numbering";

export { toNumberingSettings } from "@/lib/numbering/mapping";

export async function getNumberingSettings(userId: string): Promise<NumberingSettings> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx.select().from(schema.numberingSettings).limit(1);
    return toNumberingSettings(row as NumberingSettingsRow);
  });
}

export async function updateNumberingSettings(
  userId: string,
  input: UpdateNumberingSettingsInput,
): Promise<NumberingSettings> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .update(schema.numberingSettings)
      .set({
        sphFormat: input.sphFormat,
        invFormat: input.invFormat,
        gajFormat: input.gajFormat,
        pryFormat: input.pryFormat,
        prsFormat: input.prsFormat,
        klgFormat: input.klgFormat,
        fkiFormat: input.fkiFormat,
        lynFormat: input.lynFormat,
        kryFormat: input.kryFormat,
        seqPadding: input.seqPadding,
        updatedAt: new Date(),
      })
      .where(eq(schema.numberingSettings.singleton, true))
      .returning();
    return toNumberingSettings(row as NumberingSettingsRow);
  });
}
