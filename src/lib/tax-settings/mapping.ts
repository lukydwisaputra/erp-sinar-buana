/**
 * Pure DB-row <-> app-shape mapping for tax_settings, kept free of any DB
 * connection import so this stays unit-testable without a live Postgres —
 * see `src/lib/tax-settings/service.ts` for the actual queries.
 */
import type { TaxSettings } from "@/lib/schemas/tax-settings";

export type TaxSettingsRow = {
  ppnRate: string;
  ppnDppNumerator: number;
  ppnDppDenominator: number;
  pph23Rate: string;
  pph21SetorDay: number;
  pph21LaporDay: number;
  pph23SetorDay: number;
  pph23LaporDay: number;
  ppnSetorDay: number;
  bpjsSetorDay: number;
  invoiceDueDays: number;
  quotationValidityDays: number;
};

/** `ppnRate`/`pph23Rate` are Drizzle `numeric` columns — returned as
 * strings, converted to `number` here; the rest are plain integer/smallint
 * columns, already native numbers. */
export function toTaxSettings(row: TaxSettingsRow): TaxSettings {
  return {
    ppnRate: Number(row.ppnRate),
    ppnDppNumerator: row.ppnDppNumerator,
    ppnDppDenominator: row.ppnDppDenominator,
    pph23Rate: Number(row.pph23Rate),
    pph21SetorDay: row.pph21SetorDay,
    pph21LaporDay: row.pph21LaporDay,
    pph23SetorDay: row.pph23SetorDay,
    pph23LaporDay: row.pph23LaporDay,
    ppnSetorDay: row.ppnSetorDay,
    bpjsSetorDay: row.bpjsSetorDay,
    invoiceDueDays: row.invoiceDueDays,
    quotationValidityDays: row.quotationValidityDays,
  };
}

/** Inverse of `toTaxSettings`, for building an UPDATE `.set()` payload. */
export function fromTaxSettings(input: TaxSettings) {
  return {
    ppnRate: String(input.ppnRate),
    ppnDppNumerator: input.ppnDppNumerator,
    ppnDppDenominator: input.ppnDppDenominator,
    pph23Rate: String(input.pph23Rate),
    pph21SetorDay: input.pph21SetorDay,
    pph21LaporDay: input.pph21LaporDay,
    pph23SetorDay: input.pph23SetorDay,
    pph23LaporDay: input.pph23LaporDay,
    ppnSetorDay: input.ppnSetorDay,
    bpjsSetorDay: input.bpjsSetorDay,
    invoiceDueDays: input.invoiceDueDays,
    quotationValidityDays: input.quotationValidityDays,
  };
}
