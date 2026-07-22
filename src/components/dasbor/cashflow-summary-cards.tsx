"use client";
import { StatCard, type StatCardInfo } from "@/components/shared/stat-card";
import { formatRupiah } from "@/lib/format";
import type { MonthlySummary } from "@/lib/dasbor/cashflow-summary";

interface CashflowSummaryCardsProps {
  summary: MonthlySummary | undefined;
  isLoading: boolean;
}

const INFO: Record<"pemasukan" | "pengeluaran" | "saldo", StatCardInfo> = {
  pemasukan: {
    definisi: "Total dana masuk dari Arus Kas pada periode terpilih.",
    basisPerhitungan: "Jumlah nominal semua entri Arus Kas berjenis Kredit (pemasukan) yang tidak dibatalkan, dalam periode.",
    sumberData: ["Arus Kas — entri Kredit"],
  },
  pengeluaran: {
    definisi: "Total dana keluar dari Arus Kas pada periode terpilih.",
    basisPerhitungan: "Jumlah nominal semua entri Arus Kas berjenis Debit (pengeluaran) yang tidak dibatalkan, dalam periode.",
    sumberData: ["Arus Kas — entri Debit"],
  },
  saldo: {
    definisi: "Selisih pemasukan dan pengeluaran Arus Kas pada periode terpilih.",
    basisPerhitungan:
      "Total Pemasukan dikurangi Total Pengeluaran periode ini — saldo periode, bukan saldo kumulatif (beda dengan \"Kas Saat Ini\" di KPI atas).",
    sumberData: ["Arus Kas — entri periode terpilih"],
  },
};

/** FR-09.1 — Ringkasan Keuangan Bulanan. */
export function CashflowSummaryCards({ summary, isLoading }: CashflowSummaryCardsProps) {
  const s = isLoading ? undefined : summary;
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Total Pemasukan" value={s ? formatRupiah(s.totalPemasukan) : undefined} info={INFO.pemasukan} />
      <StatCard label="Total Pengeluaran" value={s ? formatRupiah(s.totalPengeluaran) : undefined} info={INFO.pengeluaran} />
      <StatCard label="Saldo Akhir" value={s ? formatRupiah(s.saldoAkhir) : undefined} info={INFO.saldo} />
    </div>
  );
}
