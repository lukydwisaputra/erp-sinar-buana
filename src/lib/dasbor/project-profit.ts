import type { Proyek } from "@/lib/schemas/proyek";
import type { Sph } from "@/lib/schemas/penawaran";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { Faktur } from "@/lib/schemas/faktur";
import type { ProyekProfit, KesehatanProyek } from "@/lib/dasbor/types";
import { sumRabPlan } from "@/lib/dasbor/rab-plan";
import { pendapatanPerSph } from "@/lib/dasbor/revenue";

/**
 * Health flag for a project row.
 * Invariant (maintained by computeProjectProfitability): marginAktual is null
 * iff realisasi is null — the two are co-variant. Callers must preserve this;
 * passing realisasi non-null with marginAktual null is unsupported.
 */
export function kesehatanProyek(args: {
  rabRencana: number;
  realisasi: number | null;
  marginRencana: number;
  marginAktual: number | null;
  ambang?: number;
}): KesehatanProyek {
  const { rabRencana, realisasi, marginRencana, marginAktual, ambang = 0.1 } = args;
  if (realisasi === null) return "abu";
  if (realisasi > rabRencana) return "merah";
  if (marginAktual !== null && marginAktual < marginRencana - ambang * marginRencana) return "kuning";
  return "hijau";
}

/** One profitability row per project. */
export function computeProjectProfitability(args: {
  proyeks: Proyek[];
  sphById: Map<string, Sph>;
  fakturs: Faktur[];
  realisasi: RealisasiRab[];
  ambang?: number;
}): ProyekProfit[] {
  const { proyeks, sphById, fakturs, realisasi, ambang } = args;
  const revBySph = pendapatanPerSph(fakturs);

  return proyeks.map((p) => {
    const sph = p.sphId ? sphById.get(p.sphId) : undefined;
    const rabRencana = sph ? sumRabPlan(sph).total : 0;
    const pendapatanDiakui = p.sphId ? revBySph.get(p.sphId) ?? 0 : 0;

    const realisasiRows = realisasi.filter((r) => r.proyekId === p.id);
    const realisasiTotal = realisasiRows.length > 0
      ? realisasiRows.reduce((s, r) => s + r.jumlah, 0)
      : null;

    const marginRencana = p.nilaiKontrak - rabRencana;
    const marginAktual = realisasiTotal === null ? null : pendapatanDiakui - realisasiTotal;
    const persenAnggaranTerpakai =
      realisasiTotal === null || rabRencana === 0 ? null : (realisasiTotal / rabRencana) * 100;

    return {
      proyekId: p.id,
      proyekNama: p.nama,
      nilaiKontrak: p.nilaiKontrak,
      pendapatanDiakui,
      rabRencana,
      realisasi: realisasiTotal,
      marginRencana,
      marginAktual,
      persenAnggaranTerpakai,
      kesehatan: kesehatanProyek({ rabRencana, realisasi: realisasiTotal, marginRencana, marginAktual, ambang }),
    };
  });
}
