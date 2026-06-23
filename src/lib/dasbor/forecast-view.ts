import { listArusKas } from "@/lib/data/arus-kas";
import { listFaktur } from "@/lib/data/faktur";
import { listKewajibanPajak } from "@/lib/data/kewajiban-pajak";
import { listBatch } from "@/lib/data/penggajian";
import { computeForekast } from "@/lib/dasbor/forecast";
import type { ForecastView } from "@/lib/dasbor/types";

export async function getForekast(horizonDays?: number): Promise<ForecastView> {
  const [arusKas, fakturs, kewajiban, batches] = await Promise.all([
    listArusKas(),
    listFaktur(),
    listKewajibanPajak(),
    listBatch(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return computeForekast({ arusKas, fakturs, kewajiban, batches, today, horizonDays });
}
