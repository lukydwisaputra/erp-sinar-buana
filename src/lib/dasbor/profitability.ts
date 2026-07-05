import { listFaktur } from "@/lib/data/faktur";
import { listProyek } from "@/lib/proyek/service";
import { listPenawaran } from "@/lib/data/penawaran";
import { listAll as listRealisasiRab } from "@/lib/realisasi-rab/service";
import { listArusKas } from "@/lib/data/arus-kas";
import { listExpenseNature } from "@/lib/data/expense-nature";
import { getPajakConfig } from "@/lib/data/pajak-config";
import { getDashboardParams } from "@/lib/data/dashboard-params";
import { DEFAULT_SIFAT } from "@/lib/fixtures/expense-nature";
import type { SifatBeban } from "@/lib/schemas/expense-nature";
import type { Sph } from "@/lib/schemas/penawaran";
import type { LabaRugi, Periode, ProyekProfit } from "@/lib/dasbor/types";
import { computeLabaRugi } from "@/lib/dasbor/profit-loss";
import { computeProjectProfitability } from "@/lib/dasbor/project-profit";

export type ProfitabilitasView = { labaRugi: LabaRugi; proyek: ProyekProfit[] };

export async function getProfitabilitas(userId: string, periode: Periode): Promise<ProfitabilitasView> {
  const [fakturs, proyeks, penawarans, realisasi, arusKas, natureRows, config, params] = await Promise.all([
    listFaktur(),
    listProyek(userId),
    listPenawaran(),
    listRealisasiRab(userId),
    listArusKas(),
    listExpenseNature(),
    getPajakConfig(),
    getDashboardParams(),
  ]);

  const natureMap = new Map<string, SifatBeban>(natureRows.map((n) => [n.kategori, n.sifat]));
  const natureOf = (kategori: string): SifatBeban => natureMap.get(kategori) ?? DEFAULT_SIFAT;
  const sphById = new Map<string, Sph>(penawarans.map((s) => [s.id, s]));

  const labaRugi = computeLabaRugi({ fakturs, realisasi, arusKas, natureOf, config, periode });
  const proyek = computeProjectProfitability({ proyeks, sphById, fakturs, realisasi, ambang: params.ambangMarginProyek });

  return { labaRugi, proyek };
}
