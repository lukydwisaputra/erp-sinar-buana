import type { FakturTerminRow } from "@/lib/faktur/mapping";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { SifatBeban } from "@/lib/schemas/expense-nature";
import type { PajakConfig } from "@/lib/schemas/pajak-config";
import { computeLabaRugi } from "@/lib/dasbor/profit-loss";

export type TrendPoint = { bulan: string; pendapatan: number; laba: number; kas: number };

function monthBounds(year: number, month: number): { mulai: string; selesai: string } {
  const mulai = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const selesai = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { mulai, selesai };
}

/** FR-09.12 — MoM trend lines (Pendapatan/Laba/Kas), trailing `months` (default 6) ending on `today`'s month. */
export function computeMonthlyTrend(args: {
  fakturs: FakturTerminRow[];
  realisasi: RealisasiRab[];
  arusKas: ArusKasEntry[];
  natureOf: (kategori: string) => SifatBeban;
  config: PajakConfig;
  today: string;
  months?: number;
}): TrendPoint[] {
  const { fakturs, realisasi, arusKas, natureOf, config, today, months = 6 } = args;
  const [ty, tm] = today.split("-").map(Number);

  const points: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ty, tm - 1 - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const periode = monthBounds(year, month);
    const labaRugi = computeLabaRugi({ fakturs, realisasi, arusKas, natureOf, config, periode });
    const kas = arusKas
      .filter((e) => !e.isCancelled && e.tanggal <= periode.selesai)
      .reduce((s, e) => s + (e.jenis === "kredit" ? e.jumlah : -e.jumlah), 0);
    points.push({
      bulan: `${year}-${String(month).padStart(2, "0")}`,
      pendapatan: labaRugi.pendapatan,
      laba: labaRugi.labaBersih,
      kas,
    });
  }
  return points;
}
