/** Inclusive ISO yyyy-mm-dd date range for dashboard period filtering. */
export type Periode = { mulai: string; selesai: string };

/** Planned project cost split: Personil (A) + Langsung (B). */
export type RabPlan = { personil: number; langsung: number; total: number };

/** Per-project health flag. */
export type KesehatanProyek = "hijau" | "kuning" | "merah" | "abu";

/** Accrual P&L waterfall for a period. All amounts integer IDR. */
export type LabaRugi = {
  pendapatan: number;
  hpp: number;
  labaKotor: number;
  marginKotorPersen: number;
  bebanOperasional: number;
  labaOperasional: number;
  /** Estimated income tax (PPh Badan). Always an estimate — see flag. */
  pphBadan: number;
  pphBadanEstimasi: true;
  labaBersih: number;
  marginBersihPersen: number;
  /** True when there is revenue but zero recorded cost (margin not 100%). */
  adaPendapatanTanpaBiaya: boolean;
};

/** Per-project plan-vs-actual profitability row. */
export type ProyekProfit = {
  proyekId: string;
  proyekNama: string;
  nilaiKontrak: number;
  pendapatanDiakui: number;
  rabRencana: number;
  /** null = belum dicatat (no Realisasi RAB yet). */
  realisasi: number | null;
  marginRencana: number;
  /** null when realisasi is null. */
  marginAktual: number | null;
  /** null when realisasi is null or rabRencana is 0. */
  persenAnggaranTerpakai: number | null;
  kesehatan: KesehatanProyek;
};

/** Single projected cashflow event within the forecast horizon. */
export type ForecastEntry = {
  tanggal: string;
  label: string;
  jumlah: number;
  jenis: "masuk" | "keluar";
  sumber: "faktur" | "pajak" | "penggajian";
  refId: string;
};

/** Running balance snapshot at end of each calendar week. */
export type WeeklyProjection = {
  weekStart: string;
  saldoAkhir: number;
};

/** Full forecast view. */
export type ForecastView = {
  saldoSaatIni: number;
  entries: ForecastEntry[];
  weeklyProjections: WeeklyProjection[];
  runwayBulan: number | null;
  monthlyObligation: number;
};
