import { eq } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { toTaxSettings, fromTaxSettings, type TaxSettingsRow } from "@/lib/tax-settings/mapping";
import type { TaxSettings, UpdateTaxSettingsInput } from "@/lib/schemas/tax-settings";

export { toTaxSettings } from "@/lib/tax-settings/mapping";

const SELECT_COLUMNS = {
  ppnRate: schema.taxSettings.ppnRate,
  ppnDppNumerator: schema.taxSettings.ppnDppNumerator,
  ppnDppDenominator: schema.taxSettings.ppnDppDenominator,
  pph23Rate: schema.taxSettings.pph23Rate,
  pph21SetorDay: schema.taxSettings.pph21SetorDay,
  pph21LaporDay: schema.taxSettings.pph21LaporDay,
  pph23SetorDay: schema.taxSettings.pph23SetorDay,
  pph23LaporDay: schema.taxSettings.pph23LaporDay,
  ppnSetorDay: schema.taxSettings.ppnSetorDay,
  bpjsSetorDay: schema.taxSettings.bpjsSetorDay,
  invoiceDueDays: schema.taxSettings.invoiceDueDays,
  quotationValidityDays: schema.taxSettings.quotationValidityDays,
};

export async function getTaxSettings(userId: string): Promise<TaxSettings> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx.select(SELECT_COLUMNS).from(schema.taxSettings).limit(1);
    return toTaxSettings(row as TaxSettingsRow);
  });
}

export async function updateTaxSettings(
  userId: string,
  input: UpdateTaxSettingsInput,
): Promise<TaxSettings> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .update(schema.taxSettings)
      .set({ ...fromTaxSettings(input), updatedAt: new Date() })
      .where(eq(schema.taxSettings.singleton, true))
      .returning(SELECT_COLUMNS);
    return toTaxSettings(row as TaxSettingsRow);
  });
}
