import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { FakturTerminRow } from "@/lib/faktur/mapping";
import type { TaxEntry } from "@/lib/schemas/tax-entries";
import type { PenggajianBatch } from "@/lib/schemas/penggajian";
import { calcSlip } from "@/lib/schemas/penggajian";
import type { ForecastEntry, WeeklyProjection, ForecastView } from "@/lib/dasbor/types";

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const daysToMon = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + daysToMon);
  return d.toISOString().slice(0, 10);
}

/** Next occurrence of the same day-of-month as `tanggalBayar`, on or after `today`. */
function nextOccurrence(tanggalBayar: string, today: string): string {
  const payDay = parseInt(tanggalBayar.slice(8, 10), 10);
  const d = new Date(today + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const thisMonth = new Date(Date.UTC(y, m, payDay));
  if (thisMonth.toISOString().slice(0, 10) >= today) return thisMonth.toISOString().slice(0, 10);
  return new Date(Date.UTC(y, m + 1, payDay)).toISOString().slice(0, 10);
}

export function saldoArusKas(entries: ArusKasEntry[]): number {
  return entries.reduce(
    (s, e) => (e.isCancelled ? s : s + (e.jenis === "kredit" ? e.jumlah : -e.jumlah)),
    0,
  );
}

export function forecastInflows(
  fakturs: FakturTerminRow[],
  today: string,
  horizonDays: number,
): ForecastEntry[] {
  const horizon = addDays(today, horizonDays);
  return fakturs
    .filter((f): f is FakturTerminRow & { jatuhTempo: string } =>
      f.statusSystemRole === null && f.jatuhTempo !== null && f.jatuhTempo >= today && f.jatuhTempo <= horizon)
    .map((f) => ({
      tanggal: f.jatuhTempo,
      label: f.perusahaanNama + " – " + f.id,
      jumlah: Math.round(f.netIncome),
      jenis: "masuk" as const,
      sumber: "faktur" as const,
      refId: f.id,
    }));
}

export function forecastOutflows(
  kewajiban: TaxEntry[],
  batches: PenggajianBatch[],
  today: string,
  horizonDays: number,
): ForecastEntry[] {
  const horizon = addDays(today, horizonDays);
  const entries: ForecastEntry[] = [];

  for (const k of kewajiban) {
    if (k.settlementStatus !== "sudah_disetor" && k.dueDate && k.dueDate >= today && k.dueDate <= horizon) {
      entries.push({
        tanggal: k.dueDate,
        label: k.taxType.toUpperCase() + " " + k.taxPeriod.slice(0, 7),
        jumlah: k.jumlah,
        jenis: "keluar",
        sumber: "pajak",
        refId: k.id,
      });
    }
  }

  if (batches.length > 0) {
    const latest = [...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    // If tanggalBayar is still upcoming, use it directly; else project next occurrence.
    const isUpcoming = latest.tanggalBayar >= today;
    const payDate = isUpcoming ? latest.tanggalBayar : nextOccurrence(latest.tanggalBayar, today);
    if (payDate <= horizon) {
      const jumlah = Math.round(
        latest.slips.reduce((s, slip) => s + calcSlip(slip).penggajianBersih, 0),
      );
      entries.push({
        tanggal: payDate,
        label: (isUpcoming ? "Penggajian " : "Penggajian (est.) ") + payDate.slice(0, 7),
        jumlah,
        jenis: "keluar",
        sumber: "penggajian",
        refId: latest.id,
      });
    }
  }

  return entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export function estimateMonthlyObligation(batches: PenggajianBatch[]): number {
  if (batches.length === 0) return 0;
  const latest = [...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return Math.round(
    latest.slips.reduce((s, slip) => s + calcSlip(slip).penggajianBersih, 0),
  );
}

export function computeWeeklyProjections(
  saldoAwal: number,
  entries: ForecastEntry[],
  today: string,
  horizonDays: number,
): WeeklyProjection[] {
  const projections: WeeklyProjection[] = [];
  const endDate = addDays(today, horizonDays);
  let weekStart = mondayOf(today);
  let saldo = saldoAwal;

  while (weekStart <= endDate) {
    const weekEnd = addDays(weekStart, 6);
    const net = entries
      .filter((e) => e.tanggal >= weekStart && e.tanggal <= weekEnd)
      .reduce((s, e) => s + (e.jenis === "masuk" ? e.jumlah : -e.jumlah), 0);
    saldo += net;
    projections.push({ weekStart, saldoAkhir: saldo });
    weekStart = addDays(weekStart, 7);
  }

  return projections;
}

export function computeForekast(args: {
  arusKas: ArusKasEntry[];
  fakturs: FakturTerminRow[];
  kewajiban: TaxEntry[];
  batches: PenggajianBatch[];
  today: string;
  horizonDays?: number;
}): ForecastView {
  const { arusKas, fakturs, kewajiban, batches, today } = args;
  const horizonDays = args.horizonDays ?? 90;

  const saldoSaatIni = saldoArusKas(arusKas);
  const inflows = forecastInflows(fakturs, today, horizonDays);
  const outflows = forecastOutflows(kewajiban, batches, today, horizonDays);
  const entries = [...inflows, ...outflows].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const weeklyProjections = computeWeeklyProjections(saldoSaatIni, entries, today, horizonDays);
  const monthlyObligation = estimateMonthlyObligation(batches);
  const runwayBulan =
    monthlyObligation === 0
      ? null
      : Math.round((saldoSaatIni / monthlyObligation) * 10) / 10;

  return { saldoSaatIni, entries, weeklyProjections, runwayBulan, monthlyObligation };
}
