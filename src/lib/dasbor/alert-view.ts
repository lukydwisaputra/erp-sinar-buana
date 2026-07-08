import { listAll as listFaktur } from "@/lib/faktur/service";
import { flattenTermins } from "@/lib/faktur/mapping";
import { listTaxEntries } from "@/lib/tax/service";
import { listProyek } from "@/lib/proyek/service";
import { listQuotations } from "@/lib/penawaran/service";
import { listAll as listRealisasiRab } from "@/lib/realisasi-rab/service";
import { getDashboardSettings } from "@/lib/dasbor/settings-service";
import { computeProjectProfitability } from "@/lib/dasbor/project-profit";
import { computeAlerts } from "@/lib/dasbor/alerts";
import type { Sph } from "@/lib/schemas/penawaran";
import type { AlertItem } from "@/lib/dasbor/types";

const FINANCE_ONLY_JENIS = new Set<AlertItem["jenis"]>([
  "pajak_terlambat",
  "pajak_jatuh_tempo",
  "bukti_potong_belum",
  "proyek_over_budget",
  "proyek_margin_slip",
]);

/**
 * `isFinanceCaller=false` (Sales/Tim Teknis/Viewer) drops finance-only alert
 * kinds — the "subset of the same engine" FR-09.13 asks for, applied where
 * non-finance roles do partially see Pusat Perhatian (unlike Laba-Rugi/
 * Profitabilitas Per-Proyek, which 403 entirely for them).
 */
export async function getAlerts(userId: string, isFinanceCaller: boolean): Promise<AlertItem[]> {
  const [induks, kewajiban, proyeks, penawarans, realisasi, params] = await Promise.all([
    listFaktur(userId),
    listTaxEntries(userId),
    listProyek(userId),
    listQuotations(userId),
    listRealisasiRab(userId),
    getDashboardSettings(userId),
  ]);
  const fakturs = flattenTermins(induks);
  const sphById = new Map<string, Sph>(penawarans.map((s) => [s.id, s]));
  const proyek = computeProjectProfitability({ proyeks, sphById, fakturs, realisasi, ambang: params.ambangMarginProyek });
  const today = new Date().toISOString().slice(0, 10);
  const alerts = computeAlerts({ fakturs, kewajiban, proyek, proyeks, today, ambangMangkrakHari: params.ambangMangkrakHari });
  return isFinanceCaller ? alerts : alerts.filter((a) => !FINANCE_ONLY_JENIS.has(a.jenis));
}
