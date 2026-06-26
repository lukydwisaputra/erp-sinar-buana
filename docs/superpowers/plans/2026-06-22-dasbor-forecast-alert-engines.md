# Dasbor — Forecast + Alert Engines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Forecast Engine (cash runway projection) and Alert Engine (prioritised needs-attention feed) as pure computation layers, plus async orchestrators and TanStack Query hooks.

**Architecture:** Two pure engines (forecast.ts, alerts.ts) consume data already returned by existing data modules. Each engine is independently testable with no I/O. Async orchestrators (forecast-view.ts, alert-view.ts) do the parallel fetching and wire engines to data. Two query hooks extend the existing dasbor.ts.

**Tech Stack:** TypeScript, Zod, TanStack Query, vitest, `@/lib/data/*`, `@/lib/dasbor/*`, `@/lib/schemas/*`

## Global Constraints

- Pure engine files (`forecast.ts`, `alerts.ts`) must contain NO async code — no `await`, no data fetches.
- Orchestrators fetch all data modules in parallel via a single `Promise.all`.
- `today` is always passed as a parameter to pure engines (never `new Date()` inside them) — testable without mocking dates.
- All amounts: integer IDR. No floats for money. `Math.round` where division occurs.
- `computeFaktur` from `@/lib/faktur` is the canonical invoice math — never reimplement it.
- `calcSlip` from `@/lib/schemas/penggajian` is canonical payroll math.
- Engine re-uses `computeProjectProfitability` from `@/lib/dasbor/project-profit` for project health; never duplicates that logic.
- Import `listBatch` from `@/lib/data/penggajian` (NOT `listPenggajian` — that function does not exist).
- Test files live in `src/lib/__tests__/`.
- Run `npx vitest run` to verify; check full suite count (currently 157/157 on clean HEAD).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/dasbor/types.ts` | Modify | Add ForecastEntry, WeeklyProjection, ForecastView, AlertJenis, AlertPrioritas, AlertItem |
| `src/lib/dasbor/forecast.ts` | Create | Pure forecast engine |
| `src/lib/dasbor/alerts.ts` | Create | Pure alert engine |
| `src/lib/dasbor/forecast-view.ts` | Create | Async orchestrator for forecast |
| `src/lib/dasbor/alert-view.ts` | Create | Async orchestrator for alerts |
| `src/lib/query/dasbor.ts` | Modify | Add useForekast + useAlerts hooks |
| `src/lib/__tests__/dasbor-forecast.test.ts` | Create | Pure forecast engine tests |
| `src/lib/__tests__/dasbor-alerts.test.ts` | Create | Pure alert engine tests |
| `src/lib/__tests__/dasbor-forecast-view.test.ts` | Create | Orchestrator test (mocked) |
| `src/lib/__tests__/dasbor-alert-view.test.ts` | Create | Orchestrator test (mocked) |

---

## Interfaces

### Types to add to `src/lib/dasbor/types.ts`

```ts
/** Single projected cashflow event within the forecast horizon. */
export type ForecastEntry = {
  tanggal: string;        // ISO yyyy-mm-dd
  label: string;
  jumlah: number;         // positive integer IDR
  jenis: "masuk" | "keluar";
  sumber: "faktur" | "pajak" | "penggajian";
  refId: string;
};

/** Running balance snapshot at end of each calendar week. */
export type WeeklyProjection = {
  weekStart: string; // ISO date of Monday
  saldoAkhir: number;
};

/** Full forecast view: current balance + projected entries + weekly snapshots + runway. */
export type ForecastView = {
  saldoSaatIni: number;
  entries: ForecastEntry[];          // sorted by tanggal asc
  weeklyProjections: WeeklyProjection[];
  runwayBulan: number | null;        // null when monthlyObligation is 0
  monthlyObligation: number;         // estimated monthly outflow (payroll)
};

export type AlertJenis =
  | "faktur_terlambat"
  | "faktur_jatuh_tempo"
  | "pajak_terlambat"
  | "pajak_jatuh_tempo"
  | "bukti_potong_belum"
  | "proyek_over_budget"
  | "proyek_margin_slip";

export type AlertPrioritas = "tinggi" | "sedang";

/** Single item in the Needs Attention feed. */
export type AlertItem = {
  id: string;
  jenis: AlertJenis;
  prioritas: AlertPrioritas;
  judul: string;
  detail: string;
  refId: string;
  refType: "faktur" | "pajak" | "proyek";
  tanggal?: string; // jatuhTempo or relevant ISO date
};
```

### Exported functions in `src/lib/dasbor/forecast.ts`

```ts
// Internal helpers (not exported):
// addDays(dateStr: string, n: number): string
// mondayOf(dateStr: string): string
// daysDiff(a: string, b: string): number  (b - a in days)
// nextPayrollDate(today: string): string  (25th of current month if today <= 25, else 25th of next month)

export function saldoArusKas(entries: ArusKasEntry[]): number
// Σ kredit - Σ debit (integer IDR)

export function forecastInflows(
  fakturs: Faktur[],
  today: string,
  horizonDays: number,
): ForecastEntry[]
// Filters: status === "terkirim", jatuhTempo in [today, today+horizonDays]
// jumlah = Math.round(computeFaktur(f).nilaiTermin - computeFaktur(f).pph23)
// label = f.perusahaanNama + " – " + f.id
// sumber = "faktur", jenis = "masuk"

export function forecastOutflows(
  kewajiban: KewajibanPajak[],
  batches: PenggajianBatch[],
  today: string,
  horizonDays: number,
): ForecastEntry[]
// Tax entries: status "belum_setor", jatuhTempo in [today, today+horizonDays]
//   label = kewajiban.jenis + " " + kewajiban.periode, sumber = "pajak", jenis = "keluar"
// Payroll entry: take latest batch (sort by createdAt desc, take first)
//   projected date = nextPayrollDate(today)
//   only include if projected date <= addDays(today, horizonDays)
//   jumlah = Math.round(Σ calcSlip(slip).penggajianBersih for all slips in batch)
//   label = "Penggajian " + latestBatch.periode.mulai.slice(0, 7), sumber = "penggajian", jenis = "keluar"
//   refId = latestBatch.id
// Returns array sorted by tanggal asc

export function estimateMonthlyObligation(batches: PenggajianBatch[]): number
// Returns latest batch total net payroll (Σ calcSlip(s).penggajianBersih)
// Returns 0 if no batches

export function computeWeeklyProjections(
  saldoAwal: number,
  entries: ForecastEntry[],
  today: string,
  horizonDays: number,
): WeeklyProjection[]
// Generate weeks: mondayOf(today), mondayOf(today)+7, ..., up to today+horizonDays
// For each week [weekStart, weekStart+6]:
//   netWeek = Σ masuk - Σ keluar for entries with tanggal in that week
//   saldoAkhir = previous saldoAkhir + netWeek (first: saldoAwal + netWeek)

export function computeForekast(args: {
  arusKas: ArusKasEntry[];
  fakturs: Faktur[];
  kewajiban: KewajibanPajak[];
  batches: PenggajianBatch[];
  today: string;
  horizonDays?: number; // default 90
}): ForecastView
// saldoSaatIni = saldoArusKas(arusKas)
// inflows = forecastInflows(fakturs, today, horizonDays)
// outflows = forecastOutflows(kewajiban, batches, today, horizonDays)
// entries = [...inflows, ...outflows].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
// weeklyProjections = computeWeeklyProjections(saldoSaatIni, entries, today, horizonDays)
// monthlyObligation = estimateMonthlyObligation(batches)
// runwayBulan = monthlyObligation === 0 ? null : Math.round((saldoSaatIni / monthlyObligation) * 10) / 10
```

### Exported functions in `src/lib/dasbor/alerts.ts`

```ts
export const FAKTUR_DUE_SOON_DAYS = 7;   // alert window for invoices
export const PAJAK_DUE_SOON_DAYS = 3;    // H-3 rule

// Internal helper (not exported):
// daysDiff(a: string, b: string): number  (same as forecast.ts — copy inline, no shared helper file)

export function alertsFaktur(fakturs: Faktur[], today: string): AlertItem[]
// terlambat: status "terkirim", jatuhTempo < today
//   id = "faktur-terlambat-" + f.id, prioritas "tinggi", jenis "faktur_terlambat"
//   judul = "Faktur Terlambat: " + f.id
//   detail = f.perusahaanNama + " – jatuh tempo " + f.jatuhTempo
//   refType = "faktur", tanggal = f.jatuhTempo
// jatuh_tempo: status "terkirim", daysDiff(today, jatuhTempo) in [0, FAKTUR_DUE_SOON_DAYS]
//   id = "faktur-jatuh-tempo-" + f.id, prioritas "sedang", jenis "faktur_jatuh_tempo"
//   judul = "Faktur Jatuh Tempo: " + f.id
//   detail = f.perusahaanNama + " – jatuh tempo " + f.jatuhTempo
//   refType = "faktur", tanggal = f.jatuhTempo

export function alertsPajak(kewajiban: KewajibanPajak[], today: string): AlertItem[]
// terlambat: status "belum_setor", jatuhTempo < today
//   id = "pajak-terlambat-" + k.id, prioritas "tinggi", jenis "pajak_terlambat"
//   judul = "Pajak Terlambat: " + k.jenis.toUpperCase() + " " + k.periode
//   detail = "Jatuh tempo " + k.jatuhTempo + ", belum disetor"
//   refType = "pajak", tanggal = k.jatuhTempo
// jatuh_tempo: status "belum_setor", daysDiff(today, jatuhTempo) in [0, PAJAK_DUE_SOON_DAYS]
//   id = "pajak-jatuh-tempo-" + k.id, prioritas "sedang", jenis "pajak_jatuh_tempo"
//   judul = "Pajak Jatuh Tempo: " + k.jenis.toUpperCase() + " " + k.periode
//   detail = "Jatuh tempo " + k.jatuhTempo
//   refType = "pajak", tanggal = k.jatuhTempo
// bukti potong: jenis "pph23", buktiPotongDiterima = false (any status)
//   id = "bukti-potong-" + k.id, prioritas "sedang", jenis "bukti_potong_belum"
//   judul = "Bukti Potong PPh 23 Belum Diterima"
//   detail = "Periode " + k.periode + " – PPh 23 credit berisiko"
//   refType = "pajak", tanggal = k.jatuhTempo

export function alertsProyek(proyek: ProyekProfit[]): AlertItem[]
// kesehatan "merah":
//   id = "proyek-over-budget-" + p.proyekId, prioritas "tinggi", jenis "proyek_over_budget"
//   judul = "Proyek Melebihi Anggaran: " + p.proyekNama
//   detail = "Realisasi melebihi RAB rencana"
//   refType = "proyek"
// kesehatan "kuning":
//   id = "proyek-margin-slip-" + p.proyekId, prioritas "sedang", jenis "proyek_margin_slip"
//   judul = "Margin Proyek Menurun: " + p.proyekNama
//   detail = "Margin aktual di bawah rencana"
//   refType = "proyek"

export function computeAlerts(args: {
  fakturs: Faktur[];
  kewajiban: KewajibanPajak[];
  proyek: ProyekProfit[];
  today: string;
}): AlertItem[]
// merge all three lists
// sort: tinggi before sedang; within each tier, tanggal asc (undefined tanggal sorts last)
```

### Exports in `src/lib/dasbor/forecast-view.ts`

```ts
export async function getForekast(horizonDays?: number): Promise<ForecastView>
// parallel fetch: listArusKas(), listFaktur(), listKewajibanPajak(), listBatch()
// today = new Date().toISOString().slice(0, 10)
// returns computeForekast({ arusKas, fakturs, kewajiban, batches, today, horizonDays })
```

### Exports in `src/lib/dasbor/alert-view.ts`

```ts
export async function getAlerts(): Promise<AlertItem[]>
// parallel fetch: listFaktur(), listKewajibanPajak(), listProyek(), listPenawaran(), listRealisasiRab()
// sphById = new Map(penawarans.map(s => [s.id, s]))
// proyek = computeProjectProfitability({ proyeks, sphById, fakturs, realisasi })
// today = new Date().toISOString().slice(0, 10)
// returns computeAlerts({ fakturs, kewajiban, proyek, today })
```

### Additions to `src/lib/query/dasbor.ts`

```ts
export function useForekast(horizonDays?: number)
// queryKey: ["dasbor", "forekast", horizonDays ?? 90]
// queryFn: () => getForekast(horizonDays)

export function useAlerts()
// queryKey: ["dasbor", "alerts"]
// queryFn: () => getAlerts()
```

---

### Task 1: Types extension + Forecast Engine

**Files:**
- Modify: `src/lib/dasbor/types.ts`
- Create: `src/lib/dasbor/forecast.ts`
- Create: `src/lib/__tests__/dasbor-forecast.test.ts`

**Interfaces:**
- Consumes: `ArusKasEntry` from `@/lib/schemas/arus-kas`, `Faktur` from `@/lib/schemas/faktur`, `KewajibanPajak` from `@/lib/schemas/kewajiban-pajak`, `PenggajianBatch`+`calcSlip` from `@/lib/schemas/penggajian`, `computeFaktur` from `@/lib/faktur`
- Produces: `ForecastEntry`, `WeeklyProjection`, `ForecastView` (from types.ts); `saldoArusKas`, `forecastInflows`, `forecastOutflows`, `estimateMonthlyObligation`, `computeWeeklyProjections`, `computeForekast` (from forecast.ts)

- [ ] **Step 1: Add types to `src/lib/dasbor/types.ts`**

Append after the existing `ProyekProfit` type:

```ts
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
```

- [ ] **Step 2: Write failing tests for forecast engine**

Create `src/lib/__tests__/dasbor-forecast.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  saldoArusKas, forecastInflows, forecastOutflows,
  estimateMonthlyObligation, computeWeeklyProjections, computeForekast,
} from "@/lib/dasbor/forecast";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { Faktur } from "@/lib/schemas/faktur";
import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";
import type { PenggajianBatch } from "@/lib/schemas/penggajian";

const TODAY = "2026-06-22";

// Helpers
const ak = (jenis: "kredit" | "debit", jumlah: number): ArusKasEntry => ({
  id: "ak1", jenis, tanggal: "2026-06-01", jumlah, kategori: "test",
  sumber: "manual", keterangan: "", locked: false,
});

const mkFaktur = (id: string, jatuhTempo: string, status: "terkirim" | "lunas" = "terkirim"): Faktur => ({
  id, sphId: "SPH-1", perusahaanId: "C1", perusahaanNama: "PT Klien",
  alamat: "", kota: "", npwp: "", tanggal: "2026-06-01", jatuhTempo,
  items: [{ uraian: "Jasa", volume: 1, harga: 100_000_000, satuan: "ls" }],
  terminList: [{ label: "I", persen: 100, pemicu: "" }], terminIndex: 0,
  ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2,
  catatan: [], status, tanggalBayar: "",
  bankNama: "", bankAtasNama: "", bankNoRekening: "",
  jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "",
});

const mkKewajiban = (id: string, jatuhTempo: string, status: "belum_setor" | "disetor" = "belum_setor"): KewajibanPajak => ({
  id, jenis: "ppn", periode: "2026-06", jumlah: 5_000_000,
  jatuhTempo, status, buktiPotongDiterima: true, keterangan: "",
});

const mkBatch = (id: string, netPerSlip: number): PenggajianBatch => ({
  id, periode: { mulai: "2026-06-01", selesai: "2026-06-30" },
  createdAt: "2026-06-22T00:00:00.000Z",
  slips: [{
    id: "s1", batchId: id, karyawanId: "K1", karyawanNama: "Budi",
    jabatan: "Staff", statusKepegawaian: "tetap",
    pengali: 1, gajiPokok: netPerSlip, tunjangan: 0, lembur: 0, bonus: 0,
    pph21: 0, bpjsPotongan: 0,
    bankNama: "BCA", bankNomor: "123", bankAtasNama: "Budi",
    status: "sudah_dibayar", paidAt: null,
  }],
});

describe("saldoArusKas", () => {
  it("returns kredit minus debit", () => {
    expect(saldoArusKas([ak("kredit", 100_000_000), ak("debit", 30_000_000)])).toBe(70_000_000);
  });
  it("returns 0 for empty", () => {
    expect(saldoArusKas([])).toBe(0);
  });
});

describe("forecastInflows", () => {
  it("includes terkirim invoices with jatuhTempo within horizon", () => {
    const fakturs = [
      mkFaktur("F1", "2026-06-25"),  // within 90 days
      mkFaktur("F2", "2026-10-01"),  // outside horizon (> today+90)
      mkFaktur("F3", "2026-06-10", "lunas"),  // paid — exclude
    ];
    const result = forecastInflows(fakturs, TODAY, 90);
    expect(result).toHaveLength(1);
    expect(result[0].refId).toBe("F1");
    expect(result[0].jenis).toBe("masuk");
    expect(result[0].jumlah).toBe(100_000_000); // nilaiTermin, no pph23
  });

  it("deducts pph23 from inflow amount when pph23Aktif", () => {
    const f: Faktur = {
      ...mkFaktur("F4", "2026-06-25"),
      pph23Aktif: true, pph23Persen: 2,
    };
    const result = forecastInflows([f], TODAY, 90);
    // nilaiTermin = 100_000_000, pph23 = 2% of 100_000_000 = 2_000_000
    expect(result[0].jumlah).toBe(98_000_000);
  });
});

describe("forecastOutflows", () => {
  it("includes belum_setor kewajiban within horizon", () => {
    const kewajiban = [
      mkKewajiban("K1", "2026-06-30"),         // within horizon
      mkKewajiban("K2", "2026-10-30"),         // outside horizon
      mkKewajiban("K3", "2026-06-30", "disetor"), // already paid
    ];
    const result = forecastOutflows(kewajiban, [], TODAY, 90);
    expect(result).toHaveLength(1);
    expect(result[0].refId).toBe("K1");
    expect(result[0].jenis).toBe("keluar");
    expect(result[0].sumber).toBe("pajak");
  });

  it("includes next payroll projection when latest batch exists and within horizon", () => {
    const batch = mkBatch("B1", 10_000_000);
    const result = forecastOutflows([], [batch], TODAY, 90);
    // nextPayrollDate("2026-06-22") = "2026-06-25" (25th of June, since 22 <= 25)
    expect(result).toHaveLength(1);
    expect(result[0].sumber).toBe("penggajian");
    expect(result[0].jenis).toBe("keluar");
    expect(result[0].jumlah).toBe(10_000_000);
  });
});

describe("estimateMonthlyObligation", () => {
  it("returns latest batch total net payroll", () => {
    const batch = mkBatch("B1", 15_000_000);
    expect(estimateMonthlyObligation([batch])).toBe(15_000_000);
  });
  it("returns 0 for no batches", () => {
    expect(estimateMonthlyObligation([])).toBe(0);
  });
});

describe("computeWeeklyProjections", () => {
  it("accumulates entries per week", () => {
    const entries = [
      { tanggal: "2026-06-25", label: "X", jumlah: 10_000_000, jenis: "masuk" as const, sumber: "faktur" as const, refId: "F1" },
      { tanggal: "2026-07-02", label: "Y", jumlah: 5_000_000, jenis: "keluar" as const, sumber: "pajak" as const, refId: "K1" },
    ];
    const projections = computeWeeklyProjections(50_000_000, entries, TODAY, 14);
    // week 1 (Mon 22 Jun): +10jt → 60jt
    expect(projections[0].saldoAkhir).toBe(60_000_000);
    // week 2 (Mon 29 Jun): -5jt → 55jt
    expect(projections[1].saldoAkhir).toBe(55_000_000);
  });
});

describe("computeForekast", () => {
  it("integrates all sub-functions into a ForecastView", () => {
    const result = computeForekast({
      arusKas: [ak("kredit", 100_000_000), ak("debit", 30_000_000)],
      fakturs: [mkFaktur("F1", "2026-06-25")],
      kewajiban: [mkKewajiban("K1", "2026-06-30")],
      batches: [mkBatch("B1", 10_000_000)],
      today: TODAY,
      horizonDays: 90,
    });
    expect(result.saldoSaatIni).toBe(70_000_000);
    expect(result.entries.length).toBeGreaterThanOrEqual(3); // F1 + K1 + payroll
    expect(result.monthlyObligation).toBe(10_000_000);
    expect(result.runwayBulan).toBe(7); // 70jt / 10jt = 7.0
    expect(result.weeklyProjections.length).toBeGreaterThan(0);
  });

  it("runwayBulan is null when no payroll batches", () => {
    const result = computeForekast({
      arusKas: [ak("kredit", 100_000_000)],
      fakturs: [], kewajiban: [], batches: [], today: TODAY,
    });
    expect(result.runwayBulan).toBeNull();
    expect(result.monthlyObligation).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests — verify all fail (functions don't exist yet)**

```bash
npx vitest run src/lib/__tests__/dasbor-forecast.test.ts
```

Expected: all fail with import errors.

- [ ] **Step 4: Implement `src/lib/dasbor/forecast.ts`**

```ts
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

function daysDiff(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
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
        jenis: "masuk",
        sumber: "faktur",
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
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
npx vitest run src/lib/__tests__/dasbor-forecast.test.ts
```

Expected: all pass.

- [ ] **Step 6: Run full suite — verify no regressions**

```bash
npx vitest run
```

Expected: all previous tests still pass + new forecast tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dasbor/types.ts src/lib/dasbor/forecast.ts src/lib/__tests__/dasbor-forecast.test.ts
git commit -m "feat(dasbor): add forecast engine with runway + weekly projections"
```

---

### Task 2: Alert Engine

**Files:**
- Modify: `src/lib/dasbor/types.ts` (add AlertJenis, AlertPrioritas, AlertItem)
- Create: `src/lib/dasbor/alerts.ts`
- Create: `src/lib/__tests__/dasbor-alerts.test.ts`

**Interfaces:**
- Consumes: `Faktur` from `@/lib/schemas/faktur`, `KewajibanPajak` from `@/lib/schemas/kewajiban-pajak`, `ProyekProfit` from `@/lib/dasbor/types`
- Produces: `AlertJenis`, `AlertPrioritas`, `AlertItem` (types.ts); `FAKTUR_DUE_SOON_DAYS`, `PAJAK_DUE_SOON_DAYS`, `alertsFaktur`, `alertsPajak`, `alertsProyek`, `computeAlerts` (alerts.ts)

- [ ] **Step 1: Add alert types to `src/lib/dasbor/types.ts`**

Append after `ForecastView`:

```ts
export type AlertJenis =
  | "faktur_terlambat"
  | "faktur_jatuh_tempo"
  | "pajak_terlambat"
  | "pajak_jatuh_tempo"
  | "bukti_potong_belum"
  | "proyek_over_budget"
  | "proyek_margin_slip";

export type AlertPrioritas = "tinggi" | "sedang";

/** Single item in the Needs Attention feed. */
export type AlertItem = {
  id: string;
  jenis: AlertJenis;
  prioritas: AlertPrioritas;
  judul: string;
  detail: string;
  refId: string;
  refType: "faktur" | "pajak" | "proyek";
  tanggal?: string;
};
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/__tests__/dasbor-alerts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  alertsFaktur, alertsPajak, alertsProyek, computeAlerts,
  FAKTUR_DUE_SOON_DAYS, PAJAK_DUE_SOON_DAYS,
} from "@/lib/dasbor/alerts";
import type { Faktur } from "@/lib/schemas/faktur";
import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";
import type { ProyekProfit } from "@/lib/dasbor/types";

const TODAY = "2026-06-22";

const mkFaktur = (id: string, jatuhTempo: string, status: "terkirim" | "lunas" = "terkirim"): Faktur => ({
  id, sphId: "SPH-1", perusahaanId: "C1", perusahaanNama: "PT Klien",
  alamat: "", kota: "", npwp: "", tanggal: "2026-06-01", jatuhTempo,
  items: [{ uraian: "Jasa", volume: 1, harga: 100_000_000, satuan: "ls" }],
  terminList: [{ label: "I", persen: 100, pemicu: "" }], terminIndex: 0,
  ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2,
  catatan: [], status, tanggalBayar: "",
  bankNama: "", bankAtasNama: "", bankNoRekening: "",
  jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "",
});

const mkKewajiban = (
  id: string, jatuhTempo: string,
  opts: Partial<KewajibanPajak> = {},
): KewajibanPajak => ({
  id, jenis: "ppn", periode: "2026-06", jumlah: 5_000_000,
  jatuhTempo, status: "belum_setor", buktiPotongDiterima: true, keterangan: "",
  ...opts,
});

const mkProyek = (id: string, kesehatan: ProyekProfit["kesehatan"]): ProyekProfit => ({
  proyekId: id, proyekNama: "Proyek " + id, nilaiKontrak: 100_000_000,
  pendapatanDiakui: 50_000_000, rabRencana: 30_000_000,
  realisasi: kesehatan === "abu" ? null : 35_000_000,
  marginRencana: 70_000_000, marginAktual: kesehatan === "abu" ? null : 15_000_000,
  persenAnggaranTerpakai: kesehatan === "abu" ? null : 116,
  kesehatan,
});

describe("alertsFaktur", () => {
  it("flags overdue invoices as tinggi", () => {
    const alerts = alertsFaktur([mkFaktur("F1", "2026-06-10")], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("faktur_terlambat");
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[0].refId).toBe("F1");
  });

  it("flags invoices due within FAKTUR_DUE_SOON_DAYS as sedang", () => {
    const jatuhTempo = "2026-06-25"; // 3 days from TODAY
    const alerts = alertsFaktur([mkFaktur("F2", jatuhTempo)], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("faktur_jatuh_tempo");
    expect(alerts[0].prioritas).toBe("sedang");
  });

  it("ignores paid invoices and future invoices beyond window", () => {
    const alerts = alertsFaktur([
      mkFaktur("F3", "2026-06-10", "lunas"),  // paid
      mkFaktur("F4", "2026-08-01"),            // beyond FAKTUR_DUE_SOON_DAYS, not overdue
    ], TODAY);
    expect(alerts).toHaveLength(0);
  });
});

describe("alertsPajak", () => {
  it("flags overdue obligations as tinggi", () => {
    const alerts = alertsPajak([mkKewajiban("K1", "2026-06-15")], TODAY);
    expect(alerts.find(a => a.jenis === "pajak_terlambat")).toBeTruthy();
    expect(alerts.find(a => a.jenis === "pajak_terlambat")!.prioritas).toBe("tinggi");
  });

  it("flags obligations due within PAJAK_DUE_SOON_DAYS as sedang", () => {
    const alerts = alertsPajak([mkKewajiban("K2", "2026-06-24")], TODAY); // 2 days away
    expect(alerts.find(a => a.jenis === "pajak_jatuh_tempo")).toBeTruthy();
    expect(alerts.find(a => a.jenis === "pajak_jatuh_tempo")!.prioritas).toBe("sedang");
  });

  it("flags PPh 23 without bukti potong as sedang", () => {
    const k = mkKewajiban("K3", "2026-07-01", { jenis: "pph23", buktiPotongDiterima: false });
    const alerts = alertsPajak([k], TODAY);
    expect(alerts.find(a => a.jenis === "bukti_potong_belum")).toBeTruthy();
    expect(alerts.find(a => a.jenis === "bukti_potong_belum")!.prioritas).toBe("sedang");
  });

  it("ignores already-submitted obligations", () => {
    const k = mkKewajiban("K4", "2026-06-15", { status: "disetor" });
    const alerts = alertsPajak([k], TODAY);
    // no terlambat/jatuh_tempo for disetor; check no terlambat or jatuh_tempo
    expect(alerts.filter(a => a.jenis === "pajak_terlambat" || a.jenis === "pajak_jatuh_tempo")).toHaveLength(0);
  });
});

describe("alertsProyek", () => {
  it("flags merah as over_budget tinggi", () => {
    const alerts = alertsProyek([mkProyek("P1", "merah")]);
    expect(alerts[0].jenis).toBe("proyek_over_budget");
    expect(alerts[0].prioritas).toBe("tinggi");
  });

  it("flags kuning as margin_slip sedang", () => {
    const alerts = alertsProyek([mkProyek("P2", "kuning")]);
    expect(alerts[0].jenis).toBe("proyek_margin_slip");
    expect(alerts[0].prioritas).toBe("sedang");
  });

  it("ignores hijau and abu projects", () => {
    expect(alertsProyek([mkProyek("P3", "hijau")])).toHaveLength(0);
    expect(alertsProyek([mkProyek("P4", "abu")])).toHaveLength(0);
  });
});

describe("computeAlerts", () => {
  it("merges and sorts tinggi before sedang", () => {
    const alerts = computeAlerts({
      fakturs: [mkFaktur("F1", "2026-06-10"), mkFaktur("F2", "2026-06-24")],
      kewajiban: [],
      proyek: [],
      today: TODAY,
    });
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[1].prioritas).toBe("sedang");
  });
});
```

- [ ] **Step 3: Run tests — verify fail**

```bash
npx vitest run src/lib/__tests__/dasbor-alerts.test.ts
```

- [ ] **Step 4: Implement `src/lib/dasbor/alerts.ts`**

```ts
import type { Faktur } from "@/lib/schemas/faktur";
import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";
import type { AlertItem, AlertJenis, AlertPrioritas, ProyekProfit } from "@/lib/dasbor/types";

export const FAKTUR_DUE_SOON_DAYS = 7;
export const PAJAK_DUE_SOON_DAYS = 3;

function daysDiff(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
}

function makeItem(
  id: string,
  jenis: AlertJenis,
  prioritas: AlertPrioritas,
  judul: string,
  detail: string,
  refId: string,
  refType: AlertItem["refType"],
  tanggal?: string,
): AlertItem {
  return { id, jenis, prioritas, judul, detail, refId, refType, tanggal };
}

export function alertsFaktur(fakturs: Faktur[], today: string): AlertItem[] {
  const items: AlertItem[] = [];
  for (const f of fakturs) {
    if (f.status !== "terkirim") continue;
    const diff = daysDiff(today, f.jatuhTempo);
    if (diff < 0) {
      items.push(makeItem(
        "faktur-terlambat-" + f.id, "faktur_terlambat", "tinggi",
        "Faktur Terlambat: " + f.id,
        f.perusahaanNama + " – jatuh tempo " + f.jatuhTempo,
        f.id, "faktur", f.jatuhTempo,
      ));
    } else if (diff <= FAKTUR_DUE_SOON_DAYS) {
      items.push(makeItem(
        "faktur-jatuh-tempo-" + f.id, "faktur_jatuh_tempo", "sedang",
        "Faktur Jatuh Tempo: " + f.id,
        f.perusahaanNama + " – jatuh tempo " + f.jatuhTempo,
        f.id, "faktur", f.jatuhTempo,
      ));
    }
  }
  return items;
}

export function alertsPajak(kewajiban: KewajibanPajak[], today: string): AlertItem[] {
  const items: AlertItem[] = [];
  for (const k of kewajiban) {
    if (k.status === "belum_setor") {
      const diff = daysDiff(today, k.jatuhTempo);
      if (diff < 0) {
        items.push(makeItem(
          "pajak-terlambat-" + k.id, "pajak_terlambat", "tinggi",
          "Pajak Terlambat: " + k.jenis.toUpperCase() + " " + k.periode,
          "Jatuh tempo " + k.jatuhTempo + ", belum disetor",
          k.id, "pajak", k.jatuhTempo,
        ));
      } else if (diff <= PAJAK_DUE_SOON_DAYS) {
        items.push(makeItem(
          "pajak-jatuh-tempo-" + k.id, "pajak_jatuh_tempo", "sedang",
          "Pajak Jatuh Tempo: " + k.jenis.toUpperCase() + " " + k.periode,
          "Jatuh tempo " + k.jatuhTempo,
          k.id, "pajak", k.jatuhTempo,
        ));
      }
    }
    if (k.jenis === "pph23" && !k.buktiPotongDiterima) {
      items.push(makeItem(
        "bukti-potong-" + k.id, "bukti_potong_belum", "sedang",
        "Bukti Potong PPh 23 Belum Diterima",
        "Periode " + k.periode + " – PPh 23 credit berisiko",
        k.id, "pajak", k.jatuhTempo,
      ));
    }
  }
  return items;
}

export function alertsProyek(proyek: ProyekProfit[]): AlertItem[] {
  const items: AlertItem[] = [];
  for (const p of proyek) {
    if (p.kesehatan === "merah") {
      items.push(makeItem(
        "proyek-over-budget-" + p.proyekId, "proyek_over_budget", "tinggi",
        "Proyek Melebihi Anggaran: " + p.proyekNama,
        "Realisasi melebihi RAB rencana",
        p.proyekId, "proyek",
      ));
    } else if (p.kesehatan === "kuning") {
      items.push(makeItem(
        "proyek-margin-slip-" + p.proyekId, "proyek_margin_slip", "sedang",
        "Margin Proyek Menurun: " + p.proyekNama,
        "Margin aktual di bawah rencana",
        p.proyekId, "proyek",
      ));
    }
  }
  return items;
}

export function computeAlerts(args: {
  fakturs: Faktur[];
  kewajiban: KewajibanPajak[];
  proyek: ProyekProfit[];
  today: string;
}): AlertItem[] {
  const all = [
    ...alertsFaktur(args.fakturs, args.today),
    ...alertsPajak(args.kewajiban, args.today),
    ...alertsProyek(args.proyek),
  ];
  return all.sort((a, b) => {
    if (a.prioritas !== b.prioritas) {
      return a.prioritas === "tinggi" ? -1 : 1;
    }
    if (a.tanggal && b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    if (a.tanggal) return -1;
    if (b.tanggal) return 1;
    return 0;
  });
}
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
npx vitest run src/lib/__tests__/dasbor-alerts.test.ts
```

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/dasbor/types.ts src/lib/dasbor/alerts.ts src/lib/__tests__/dasbor-alerts.test.ts
git commit -m "feat(dasbor): add alert engine — overdue invoices, tax H-3, project health"
```

---

### Task 3: Orchestrators + Query Hooks

**Files:**
- Create: `src/lib/dasbor/forecast-view.ts`
- Create: `src/lib/dasbor/alert-view.ts`
- Modify: `src/lib/query/dasbor.ts`
- Create: `src/lib/__tests__/dasbor-forecast-view.test.ts`
- Create: `src/lib/__tests__/dasbor-alert-view.test.ts`

**Interfaces:**
- Consumes: `computeForekast` from `@/lib/dasbor/forecast`, `computeAlerts` from `@/lib/dasbor/alerts`, `computeProjectProfitability` from `@/lib/dasbor/project-profit`, all data modules
- Produces: `getForekast`, `getAlerts`, `useForekast`, `useAlerts`

- [ ] **Step 1: Write failing tests for orchestrators**

Create `src/lib/__tests__/dasbor-forecast-view.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data/arus-kas", () => ({
  listArusKas: vi.fn(async () => [
    { id: "a1", jenis: "kredit", tanggal: "2026-06-01", jumlah: 100_000_000, kategori: "x", sumber: "manual", keterangan: "", locked: false },
  ]),
}));
vi.mock("@/lib/data/faktur", () => ({
  listFaktur: vi.fn(async () => []),
}));
vi.mock("@/lib/data/kewajiban-pajak", () => ({
  listKewajibanPajak: vi.fn(async () => []),
}));
vi.mock("@/lib/data/penggajian", () => ({
  listBatch: vi.fn(async () => []),
}));

import { getForekast } from "@/lib/dasbor/forecast-view";

describe("getForekast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a ForecastView with saldoSaatIni from arus-kas", async () => {
    const view = await getForekast(90);
    expect(view.saldoSaatIni).toBe(100_000_000);
    expect(view.weeklyProjections.length).toBeGreaterThan(0);
    expect(view.runwayBulan).toBeNull(); // no batches → monthlyObligation = 0
  });
});
```

Create `src/lib/__tests__/dasbor-alert-view.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data/faktur", () => ({
  listFaktur: vi.fn(async () => []),
}));
vi.mock("@/lib/data/kewajiban-pajak", () => ({
  listKewajibanPajak: vi.fn(async () => [
    { id: "K1", jenis: "ppn", periode: "2026-05", jumlah: 5_000_000,
      jatuhTempo: "2026-05-30", status: "belum_setor", buktiPotongDiterima: true, keterangan: "" },
  ]),
}));
vi.mock("@/lib/data/proyek", () => ({
  listProyek: vi.fn(async () => []),
}));
vi.mock("@/lib/data/penawaran", () => ({
  listPenawaran: vi.fn(async () => []),
}));
vi.mock("@/lib/data/realisasi-rab", () => ({
  listRealisasiRab: vi.fn(async () => []),
}));

import { getAlerts } from "@/lib/dasbor/alert-view";

describe("getAlerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns alert items sorted by priority", async () => {
    const alerts = await getAlerts();
    // K1 overdue → pajak_terlambat, tinggi
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[0].jenis).toBe("pajak_terlambat");
  });
});
```

- [ ] **Step 2: Run — verify both fail**

```bash
npx vitest run src/lib/__tests__/dasbor-forecast-view.test.ts src/lib/__tests__/dasbor-alert-view.test.ts
```

- [ ] **Step 3: Implement `src/lib/dasbor/forecast-view.ts`**

```ts
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
```

- [ ] **Step 4: Implement `src/lib/dasbor/alert-view.ts`**

```ts
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
```

- [ ] **Step 5: Extend `src/lib/query/dasbor.ts`**

Append to the existing file:

```ts
import { getForekast } from "@/lib/dasbor/forecast-view";
import { getAlerts } from "@/lib/dasbor/alert-view";

export function useForekast(horizonDays?: number) {
  return useQuery({
    queryKey: ["dasbor", "forekast", horizonDays ?? 90],
    queryFn: () => getForekast(horizonDays),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["dasbor", "alerts"],
    queryFn: () => getAlerts(),
  });
}
```

(The existing `"use client"` and `useQuery` import at the top of the file already apply — do NOT add them again.)

- [ ] **Step 6: Run orchestrator tests — verify pass**

```bash
npx vitest run src/lib/__tests__/dasbor-forecast-view.test.ts src/lib/__tests__/dasbor-alert-view.test.ts
```

- [ ] **Step 7: Run full suite — verify no regressions**

```bash
npx vitest run
```

Expected: all previous tests + 4 new test files pass. Record total.

- [ ] **Step 8: Commit**

```bash
git add src/lib/dasbor/forecast-view.ts src/lib/dasbor/alert-view.ts \
        src/lib/query/dasbor.ts \
        src/lib/__tests__/dasbor-forecast-view.test.ts \
        src/lib/__tests__/dasbor-alert-view.test.ts
git commit -m "feat(dasbor): add forecast + alert orchestrators and query hooks"
```
