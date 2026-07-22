"use client";
import { StatCard, type StatCardInfo } from "@/components/shared/stat-card";
import { formatRupiahCompact } from "@/lib/format";
import type { LabaRugi, ForecastView } from "@/lib/dasbor/types";

interface KpiStripProps {
  labaRugi: LabaRugi | undefined;
  forecastView: ForecastView | undefined;
  arOutstanding: number;
  taxDue: number;
}

const INFO: Record<string, StatCardInfo> = {
  labaBersih: {
    definisi: "Estimasi laba bersih setelah pajak untuk periode terpilih.",
    basisPerhitungan:
      "Laba Operasional dikurangi estimasi PPh Badan (final 0,5% dari pendapatan, atau 22% dari laba operasional positif dikurangi kredit PPh 23 terkumpul — tergantung metode pajak di Konfigurasi).",
    sumberData: ["Faktur (pendapatan & kredit PPh 23)", "Realisasi RAB (HPP)", "Arus Kas kategori operasional", "Konfigurasi Pajak"],
  },
  pendapatan: {
    definisi: "Total nilai jasa yang diakui (accrual) dari termin faktur terbit pada periode terpilih, di luar PPN.",
    basisPerhitungan: "Jumlah nilai termin semua Faktur yang sudah terbit (status bukan Batal) dengan tanggal dalam periode.",
    sumberData: ["Faktur — termin per proyek"],
  },
  kasSaatIni: {
    definisi: "Saldo kas riil saat ini — akumulasi seluruh transaksi Arus Kas sampai hari ini, bukan dibatasi periode dasbor.",
    basisPerhitungan: "Total pemasukan dikurangi total pengeluaran dari semua entri Arus Kas yang tidak dibatalkan, sejak awal pencatatan.",
    sumberData: ["Arus Kas — seluruh entri aktif"],
  },
  runway: {
    definisi: "Estimasi berapa bulan kas saat ini bisa menutupi kewajiban gaji, jika tidak ada pemasukan tambahan.",
    basisPerhitungan: "Kas Saat Ini dibagi kewajiban bulanan (total gaji bersih dari batch Penggajian terakhir).",
    sumberData: ["Arus Kas (saldo)", "Penggajian — batch terbaru"],
  },
  arTerutang: {
    definisi: "Total nilai termin Faktur yang sudah terbit tapi belum lunas dibayar.",
    basisPerhitungan: "Jumlah nilai termin dengan status pembayaran belum lunas.",
    sumberData: ["Faktur — termin belum lunas"],
  },
  pajakTerutang: {
    definisi: "Total kewajiban pajak yang belum disetorkan ke kas negara.",
    basisPerhitungan: "Jumlah seluruh entri Pajak dengan status penyetoran selain \"Sudah Disetor\".",
    sumberData: ["Pajak — daftar kewajiban"],
  },
  labaKotor: {
    definisi: "Pendapatan dikurangi harga pokok penjualan (HPP) pada periode terpilih.",
    basisPerhitungan: "Pendapatan periode dikurangi realisasi RAB (biaya proyek) yang dicatat dalam periode yang sama.",
    sumberData: ["Faktur (pendapatan)", "Realisasi RAB (HPP)"],
  },
  labaOperasional: {
    definisi: "Laba Kotor dikurangi beban operasional pada periode terpilih.",
    basisPerhitungan: "Laba Kotor dikurangi entri Arus Kas berkategori operasional (bukan modal/investasi) dalam periode.",
    sumberData: ["Faktur (pendapatan)", "Realisasi RAB (HPP)", "Arus Kas kategori operasional"],
  },
};

export function KpiStrip({ labaRugi, forecastView, arOutstanding, taxDue }: KpiStripProps) {
  const fmt = (n: number | undefined) => n !== undefined ? formatRupiahCompact(n) : undefined;
  const pct = (n: number | undefined) => n !== undefined ? `${n.toFixed(1)}%` : undefined;
  const runway = forecastView?.runwayBulan;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Laba Bersih (Est.)"
        value={fmt(labaRugi?.labaBersih)}
        sub={pct(labaRugi?.marginBersihPersen) && <p className="text-xs text-muted-foreground">Margin {pct(labaRugi?.marginBersihPersen)}</p>}
        info={INFO.labaBersih}
      />
      <StatCard
        label="Pendapatan"
        value={fmt(labaRugi?.pendapatan)}
        sub={pct(labaRugi?.marginKotorPersen) && <p className="text-xs text-muted-foreground">Margin Kotor {pct(labaRugi?.marginKotorPersen)}</p>}
        info={INFO.pendapatan}
      />
      <StatCard label="Kas Saat Ini" value={fmt(forecastView?.saldoSaatIni)} info={INFO.kasSaatIni} />
      <StatCard
        label="Runway"
        value={
          forecastView === undefined
            ? undefined
            : runway === null
            ? "–"
            : `${runway} bln`
        }
        sub={<p className="text-xs text-muted-foreground">estimasi pembayaran gaji</p>}
        sensitive={false}
        info={INFO.runway}
      />
      <StatCard
        label="AR Terutang"
        value={fmt(arOutstanding)}
        sub={<p className="text-xs text-muted-foreground">faktur belum dibayar</p>}
        info={INFO.arTerutang}
      />
      <StatCard
        label="Pajak Terutang"
        value={fmt(taxDue)}
        sub={<p className="text-xs text-muted-foreground">belum disetor</p>}
        info={INFO.pajakTerutang}
      />
      <StatCard label="Laba Kotor" value={fmt(labaRugi?.labaKotor)} info={INFO.labaKotor} />
      <StatCard label="Laba Operasional" value={fmt(labaRugi?.labaOperasional)} info={INFO.labaOperasional} />
    </div>
  );
}
