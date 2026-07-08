import { eq } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import type { PajakConfig, PphBadanMetode } from "@/lib/schemas/pajak-config";

// DB enum is "final_0_5"/"badan_22"; the app enum (and income-tax.ts's
// existing comparison + passing tests) is "final_05"/"badan_22" — map both
// ways here only, never touch income-tax.ts.
const DB_TO_APP_METODE: Record<"final_0_5" | "badan_22", PphBadanMetode> = {
  final_0_5: "final_05",
  badan_22: "badan_22",
};
const APP_TO_DB_METODE: Record<PphBadanMetode, "final_0_5" | "badan_22"> = {
  final_05: "final_0_5",
  badan_22: "badan_22",
};

const DEFAULT_TARIF_FINAL = 0.5;
const DEFAULT_TARIF_BADAN = 22;

type TaxSettingsCorpRow = {
  corpTaxMethod: "final_0_5" | "badan_22";
  corpTaxRate: string;
  umkmThreshold: string;
};

// tax_settings only stores the rate for whichever method is currently
// active — the mock's independent dual-rate fixture doesn't have a real
// analog. Deliberate simplification: the inactive method's rate falls back
// to a fixed default rather than being independently persisted.
function toPajakConfig(row: TaxSettingsCorpRow): PajakConfig {
  const metode = DB_TO_APP_METODE[row.corpTaxMethod];
  const rate = Number(row.corpTaxRate);
  return {
    metode,
    tarifFinalPersen: metode === "final_05" ? rate : DEFAULT_TARIF_FINAL,
    tarifBadanPersen: metode === "badan_22" ? rate : DEFAULT_TARIF_BADAN,
    ambangOmzet: Number(row.umkmThreshold),
  };
}

export async function getPajakConfig(userId: string): Promise<PajakConfig> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .select({
        corpTaxMethod: schema.taxSettings.corpTaxMethod,
        corpTaxRate: schema.taxSettings.corpTaxRate,
        umkmThreshold: schema.taxSettings.umkmThreshold,
      })
      .from(schema.taxSettings)
      .limit(1);
    return toPajakConfig(row as TaxSettingsCorpRow);
  });
}

export async function updatePajakConfig(userId: string, input: PajakConfig): Promise<PajakConfig> {
  return withUserTransaction(userId, async (tx) => {
    const dbMethod = APP_TO_DB_METODE[input.metode];
    const rate = input.metode === "final_05" ? input.tarifFinalPersen : input.tarifBadanPersen;
    const [row] = await tx
      .update(schema.taxSettings)
      .set({
        corpTaxMethod: dbMethod,
        corpTaxRate: String(rate),
        umkmThreshold: String(input.ambangOmzet),
      })
      .where(eq(schema.taxSettings.singleton, true))
      .returning({
        corpTaxMethod: schema.taxSettings.corpTaxMethod,
        corpTaxRate: schema.taxSettings.corpTaxRate,
        umkmThreshold: schema.taxSettings.umkmThreshold,
      });
    return toPajakConfig(row as TaxSettingsCorpRow);
  });
}
