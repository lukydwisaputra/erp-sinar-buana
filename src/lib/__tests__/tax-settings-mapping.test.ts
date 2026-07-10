import { describe, expect, it } from "vitest";
import { toTaxSettings, fromTaxSettings, type TaxSettingsRow } from "@/lib/tax-settings/mapping";

function row(overrides: Partial<TaxSettingsRow> = {}): TaxSettingsRow {
  return {
    ppnRate: "12.0000",
    ppnDppNumerator: 11,
    ppnDppDenominator: 12,
    pph23Rate: "2.0000",
    pph21SetorDay: 10,
    pph21LaporDay: 20,
    pph23SetorDay: 10,
    pph23LaporDay: 20,
    ppnSetorDay: 31,
    bpjsSetorDay: 10,
    invoiceDueDays: 14,
    quotationValidityDays: 30,
    ...overrides,
  };
}

describe("toTaxSettings", () => {
  it("converts numeric-string rate columns to number, passes integers through", () => {
    const settings = toTaxSettings(row());
    expect(settings.ppnRate).toBe(12);
    expect(settings.pph23Rate).toBe(2);
    expect(settings.ppnDppNumerator).toBe(11);
    expect(settings.invoiceDueDays).toBe(14);
  });

  it("round-trips through fromTaxSettings back to the same DB-shaped values", () => {
    const settings = toTaxSettings(row({ ppnRate: "11.5000", ppnSetorDay: 28 }));
    const back = fromTaxSettings(settings);
    expect(back.ppnRate).toBe("11.5");
    expect(back.ppnSetorDay).toBe(28);
  });
});
