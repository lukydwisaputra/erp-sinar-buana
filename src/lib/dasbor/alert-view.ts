import { listFaktur } from "@/lib/data/faktur";
import { listKewajibanPajak } from "@/lib/data/kewajiban-pajak";
import { listProyek } from "@/lib/data/proyek";
import { listPenawaran } from "@/lib/data/penawaran";
import { listRealisasiRab } from "@/lib/data/realisasi-rab";
import { computeProjectProfitability } from "@/lib/dasbor/project-profit";
import { computeAlerts } from "@/lib/dasbor/alerts";
import type { Sph } from "@/lib/schemas/penawaran";
import type { AlertItem } from "@/lib/dasbor/types";

export async function getAlerts(): Promise<AlertItem[]> {
  const [fakturs, kewajiban, proyeks, penawarans, realisasi] = await Promise.all([
    listFaktur(),
    listKewajibanPajak(),
    listProyek(),
    listPenawaran(),
    listRealisasiRab(),
  ]);
  const sphById = new Map<string, Sph>(penawarans.map((s) => [s.id, s]));
  const proyek = computeProjectProfitability({ proyeks, sphById, fakturs, realisasi });
  const today = new Date().toISOString().slice(0, 10);
  return computeAlerts({ fakturs, kewajiban, proyek, today });
}
