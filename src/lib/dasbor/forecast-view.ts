import { listArusKas } from "@/lib/arus-kas/service";
import { listAll as listFaktur } from "@/lib/faktur/service";
import { flattenTermins } from "@/lib/faktur/mapping";
import { listTaxEntries } from "@/lib/tax/service";
import { listBatches } from "@/lib/penggajian/service";
import { computeForekast } from "@/lib/dasbor/forecast";
import type { ForecastView } from "@/lib/dasbor/types";

/** Faktur/Arus Kas/Pajak/Penggajian are all real now — this needs a userId,
 * so it can no longer run client-side (see src/app/api/dasbor/forecast/route.ts). */
export async function getForekast(userId: string, horizonDays?: number): Promise<ForecastView> {
  const [arusKas, induks, kewajiban, batches] = await Promise.all([
    listArusKas(userId),
    listFaktur(userId),
    listTaxEntries(userId),
    listBatches(userId),
  ]);
  const fakturs = flattenTermins(induks);
  const today = new Date().toISOString().slice(0, 10);
  return computeForekast({ arusKas, fakturs, kewajiban, batches, today, horizonDays });
}
