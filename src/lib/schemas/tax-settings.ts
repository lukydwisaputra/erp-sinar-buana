import { z } from "zod";

/** Read/write shape for the `tax_settings` singleton (PRD Bab 9.5 / 10). All
 * 12 fields are always sent together — a full-object settings form, not a
 * partial-patch endpoint, so there's no `.partial()`-resolves-`.default()`
 * risk (see updatePenawaranSchema's history for why that matters here). */
export const taxSettingsSchema = z.object({
  ppnRate: z.number().min(0).max(100),
  ppnDppNumerator: z.number().int().positive(),
  ppnDppDenominator: z.number().int().positive(),
  pph23Rate: z.number().min(0).max(100),
  pph21SetorDay: z.number().int().min(1).max(31),
  pph21LaporDay: z.number().int().min(1).max(31),
  pph23SetorDay: z.number().int().min(1).max(31),
  pph23LaporDay: z.number().int().min(1).max(31),
  ppnSetorDay: z.number().int().min(1).max(31),
  bpjsSetorDay: z.number().int().min(1).max(31),
  invoiceDueDays: z.number().int().min(0),
  quotationValidityDays: z.number().int().min(0),
});
export type TaxSettings = z.infer<typeof taxSettingsSchema>;

export const updateTaxSettingsSchema = taxSettingsSchema;
export type UpdateTaxSettingsInput = z.infer<typeof updateTaxSettingsSchema>;
