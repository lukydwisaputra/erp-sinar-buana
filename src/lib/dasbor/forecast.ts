import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { Faktur } from "@/lib/schemas/faktur";
import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";
import type { PenggajianBatch } from "@/lib/schemas/penggajian";
import { calcSlip } from "@/lib/schemas/penggajian";
import { computeFaktur } from "@/lib/faktur";
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

function nextPayrollDate(today: string): string {
  const d = new Date(today + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const d25 = new Date(Date.UTC(y, m, 25));
  if (d <= d25) return d25.toISOString().slice(0, 10);
  return new Date(Date.UTC(y, m + 1, 25)).toISOString().slice(0, 10);
}

export function saldoArusKas(entries: ArusKasEntry[]): number {
  return entries.reduce(
    (s, e) => s + (e.jenis === "kredit" ? e.jumlah : -e.jumlah),
    0,
  );
}

export function forecastInflows(
  fakturs: Faktur[],
  today: string,
  horizonDays: number,
): ForecastEntry[] {
  const horizon = addDays(today, horizonDays);
  return fakturs
    .filter((f) => f.status === "terkirim" && f.jatuhTempo >= today && f.jatuhTempo <= horizon)
    .map((f) => {
      const totals = computeFaktur(f);
      return {
        tanggal: f.jatuhTempo,
        label: f.perusahaanNama + " – " + f.id,
        jumlah: Math.round(totals.nilaiTermin - totals.pph23),
        jenis: "masuk" as const,
        sumber: "faktur" as const,
        refId: f.id,
      };
    });
}

export function forecastOutflows(
  kewajiban: KewajibanPajak[],
  batches: PenggajianBatch[],
  today: string,
  horizonDays: number,
): ForecastEntry[] {
  const horizon = addDays(today, horizonDays);
  const entries: ForecastEntry[] = [];

  for (const k of kewajiban) {
    if (k.status === "belum_setor" && k.jatuhTempo >= today && k.jatuhTempo <= horizon) {
      entries.push({
        tanggal: k.jatuhTempo,
        label: k.jenis.toUpperCase() + " " + k.periode,
        jumlah: k.jumlah,
        jenis: "keluar",
        sumber: "pajak",
        refId: k.id,
      });
    }
  }

  if (batches.length > 0) {
    const latest = [...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const payDate = nextPayrollDate(today);
    if (payDate <= horizon) {
      const jumlah = Math.round(
        latest.slips.reduce((s, slip) => s + calcSlip(slip).penggajianBersih, 0),
      );
      entries.push({
        tanggal: payDate,
        label: "Penggajian " + latest.periode.mulai.slice(0, 7),
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
  fakturs: Faktur[];
  kewajiban: KewajibanPajak[];
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
