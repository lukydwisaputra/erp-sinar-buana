import { listFaktur } from "@/lib/data/faktur";
import { listKewajibanPajak } from "@/lib/data/kewajiban-pajak";
import { listProyek } from "@/lib/proyek/service";
import { listPenawaran } from "@/lib/data/penawaran";
import { listAll as listRealisasiRab } from "@/lib/realisasi-rab/service";
import { getDashboardParams } from "@/lib/data/dashboard-params";
import { computeProjectProfitability } from "@/lib/dasbor/project-profit";
import { computeAlerts } from "@/lib/dasbor/alerts";
import type { Sph } from "@/lib/schemas/penawaran";
import type { AlertItem } from "@/lib/dasbor/types";

export async function getAlerts(userId: string): Promise<AlertItem[]> {
  const [fakturs, kewajiban, proyeks, penawarans, realisasi, params] = await Promise.all([
    listFaktur(),
    listKewajibanPajak(),
    listProyek(userId),
    listPenawaran(),
    listRealisasiRab(userId),
    getDashboardParams(),
  ]);
  const sphById = new Map<string, Sph>(penawarans.map((s) => [s.id, s]));
  const proyek = computeProjectProfitability({ proyeks, sphById, fakturs, realisasi, ambang: params.ambangMarginProyek });
  const today = new Date().toISOString().slice(0, 10);
  return computeAlerts({ fakturs, kewajiban, proyek, proyeks, today, ambangMangkrakHari: params.ambangMangkrakHari });
}
