# Dasbor Profitability Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the accrual Profitability Engine — a P&L waterfall (Revenue → Gross → Operating → Net, with margins and an estimated income-tax line) plus per-project plan-vs-actual margin with health flags — as pure, unit-tested functions consuming the Plan 1 data foundations, wrapped by one async orchestrator + query hook.

**Architecture:** Plan 2 of the 5-plan Dasbor series. The engine stores nothing — it is pure computation over module data (PRD §8). All math lives in pure functions in `src/lib/dasbor/` that take plain arrays/objects and return view models (no I/O, no React), making them trivially testable with hand-built inputs. A thin async orchestrator fetches the real data via the Plan 1 + existing data layers and calls the pure functions; a TanStack Query hook exposes it to UI (plan 4). No UI in this plan.

**Tech Stack:** TypeScript, Zod (types already defined in Plan 1 + existing modules), TanStack Query, vitest. Reuses `computeFaktur` from `src/lib/faktur.ts` and `delay` from `src/lib/data/_delay`.

## Global Constraints

- **NOT vanilla Next.js** — read `node_modules/next/dist/docs/` before any framework-coupled code (per AGENTS.md). This plan is pure lib + one `"use client"` query hook; the constraint binds only the hook file.
- **All engine math is pure functions** in `src/lib/dasbor/*.ts`: no `async`, no `fetch`, no React, no fixture imports inside the pure modules — inputs are passed in. Only the orchestrator (`src/lib/dasbor/profitability.ts`) and the query hook do I/O.
- **BR-14 (must not violate):** cashflow ≠ profit; **PPh 23 is NEVER subtracted from P&L revenue** (it is a prepaid tax credit/asset). Revenue = full service value **ex-PPN** = `computeFaktur(f).nilaiTermin`. PPN is excluded entirely from the P&L.
- **Accrual recognition:** revenue is recognized at invoice **issuance** (`faktur.tanggal`), not payment. "Issued" = `status` is `"terkirim"` or `"lunas"` (exclude `"draft"` and `"dibatalkan"`).
- **Income-tax line is always an estimate** — carry an explicit `pphBadanEstimasi: true` flag on the result. Method/rate/threshold come from `getPajakConfig()` (Plan 1). When `metode === "badan_22"`, subtract accumulated PPh 23 credit (sum of `computeFaktur(f).pph23` over issued fakturs in period) from the computed tax, floored at 0.
- **Currency:** integer IDR throughout; round only at the final number, percentages are plain numbers (e.g. `42.5` means 42.5%).
- **Period filter:** a `Periode = { mulai: string; selesai: string }` of inclusive ISO `yyyy-mm-dd` dates; membership is a string comparison (`d >= mulai && d <= selesai`), empty date string is never a member.
- **Health thresholds:** 🔴 `merah` when `realisasi > rabRencana`; ⚪ `abu` when no realisasi recorded; 🟡 `kuning` when `marginAktual < marginRencana` by more than the configurable margin threshold (default fraction `0.1` of `marginRencana`); 🟢 `hijau` otherwise. Threshold is a parameter with default `0.1`.

---

### Task 1: Shared types + period & RAB-plan helpers

Foundational pure helpers every later task imports: the `Periode` type and membership test, and RAB-plan aggregation from an SPH.

**Files:**
- Create: `src/lib/dasbor/types.ts`
- Create: `src/lib/dasbor/period.ts`
- Create: `src/lib/dasbor/rab-plan.ts`
- Test: `src/lib/__tests__/dasbor-period.test.ts`
- Test: `src/lib/__tests__/dasbor-rab-plan.test.ts`

**Interfaces:**
- Consumes: `Sph` type from `@/lib/schemas/penawaran` (each `Sph` has `items: { rab: { personil: RabRow[]; langsung: RabRow[] } }[]`, where `RabRow = { uraian; vol; satuan; hargaSatuan }`).
- Produces:
  - `Periode = { mulai: string; selesai: string }`
  - `RabPlan = { personil: number; langsung: number; total: number }`
  - `KesehatanProyek = "hijau" | "kuning" | "merah" | "abu"`
  - `LabaRugi` and `ProyekProfit` types (defined here, used by Tasks 3 & 4)
  - `dalamPeriode(tanggal: string, periode: Periode): boolean`
  - `sumRabPlan(sph: Pick<Sph, "items">): RabPlan`

- [ ] **Step 1: Write the shared types**

Create `src/lib/dasbor/types.ts`:

```ts
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
```

- [ ] **Step 2: Write the period helper**

Create `src/lib/dasbor/period.ts`:

```ts
import type { Periode } from "@/lib/dasbor/types";

/**
 * Inclusive membership test. ISO yyyy-mm-dd strings compare lexicographically,
 * so plain string comparison is correct. Empty dates are never members.
 */
export function dalamPeriode(tanggal: string, periode: Periode): boolean {
  if (!tanggal) return false;
  return tanggal >= periode.mulai && tanggal <= periode.selesai;
}
```

- [ ] **Step 3: Write the RAB-plan helper**

Create `src/lib/dasbor/rab-plan.ts`:

```ts
import type { Sph } from "@/lib/schemas/penawaran";
import type { RabPlan } from "@/lib/dasbor/types";

const rowsTotal = (rows: { vol: number; hargaSatuan: number }[]): number =>
  rows.reduce((s, r) => s + r.vol * r.hargaSatuan, 0);

/**
 * Aggregate the planned RAB cost from an SPH: Personil (A) and Langsung (B)
 * summed across every service item. total = personil + langsung.
 */
export function sumRabPlan(sph: Pick<Sph, "items">): RabPlan {
  let personil = 0;
  let langsung = 0;
  for (const item of sph.items) {
    personil += rowsTotal(item.rab.personil);
    langsung += rowsTotal(item.rab.langsung);
  }
  return { personil, langsung, total: personil + langsung };
}
```

- [ ] **Step 4: Write the failing tests**

Create `src/lib/__tests__/dasbor-period.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { dalamPeriode } from "@/lib/dasbor/period";

const juni: { mulai: string; selesai: string } = { mulai: "2026-06-01", selesai: "2026-06-30" };

describe("dalamPeriode", () => {
  it("includes the boundary dates (inclusive)", () => {
    expect(dalamPeriode("2026-06-01", juni)).toBe(true);
    expect(dalamPeriode("2026-06-30", juni)).toBe(true);
  });

  it("excludes dates outside the range", () => {
    expect(dalamPeriode("2026-05-31", juni)).toBe(false);
    expect(dalamPeriode("2026-07-01", juni)).toBe(false);
  });

  it("treats empty string as not a member", () => {
    expect(dalamPeriode("", juni)).toBe(false);
  });
});
```

Create `src/lib/__tests__/dasbor-rab-plan.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sumRabPlan } from "@/lib/dasbor/rab-plan";

const sph = {
  items: [
    {
      rab: {
        personil: [{ uraian: "Ahli", vol: 2, satuan: "OB", hargaSatuan: 10_000_000 }],
        langsung: [{ uraian: "Transport", vol: 1, satuan: "ls", hargaSatuan: 5_000_000 }],
      },
    },
    {
      rab: {
        personil: [{ uraian: "Surveyor", vol: 3, satuan: "OB", hargaSatuan: 4_000_000 }],
        langsung: [],
      },
    },
  ],
};

describe("sumRabPlan", () => {
  it("sums personil (A) across items", () => {
    expect(sumRabPlan(sph).personil).toBe(2 * 10_000_000 + 3 * 4_000_000);
  });

  it("sums langsung (B) across items", () => {
    expect(sumRabPlan(sph).langsung).toBe(5_000_000);
  });

  it("total is personil + langsung", () => {
    const p = sumRabPlan(sph);
    expect(p.total).toBe(p.personil + p.langsung);
  });

  it("returns zeros for empty items", () => {
    expect(sumRabPlan({ items: [] })).toEqual({ personil: 0, langsung: 0, total: 0 });
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/dasbor-period.test.ts src/lib/__tests__/dasbor-rab-plan.test.ts`
Expected: PASS, all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dasbor/types.ts src/lib/dasbor/period.ts src/lib/dasbor/rab-plan.ts src/lib/__tests__/dasbor-period.test.ts src/lib/__tests__/dasbor-rab-plan.test.ts
git commit -m "feat(dasbor): add profitability shared types + period & RAB-plan helpers"
```

---

### Task 2: Revenue recognition

Pure accrual revenue functions: total recognized revenue in a period, and recognized revenue per SPH/deal (used for per-project recognized revenue). Also the PPh 23 credit accumulator (needed by the income-tax line).

**Files:**
- Create: `src/lib/dasbor/revenue.ts`
- Test: `src/lib/__tests__/dasbor-revenue.test.ts`

**Interfaces:**
- Consumes: `Faktur` from `@/lib/schemas/faktur`; `computeFaktur` from `@/lib/faktur`; `dalamPeriode` (Task 1); `Periode` (Task 1).
- Produces:
  - `fakturDiterbitkan(f: Faktur): boolean` — issued = status terkirim|lunas
  - `pendapatanPeriode(fakturs: Faktur[], periode: Periode): number` — Σ nilaiTermin of issued fakturs with `tanggal` in period
  - `pendapatanPerSph(fakturs: Faktur[]): Map<string, number>` — Σ nilaiTermin of issued fakturs grouped by `sphId` (recognized to date, ignores period)
  - `pph23KreditPeriode(fakturs: Faktur[], periode: Periode): number` — Σ pph23 of issued fakturs in period

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/dasbor-revenue.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  fakturDiterbitkan,
  pendapatanPeriode,
  pendapatanPerSph,
  pph23KreditPeriode,
} from "@/lib/dasbor/revenue";
import type { Faktur } from "@/lib/schemas/faktur";

// Minimal faktur factory — only fields the engine reads.
function mk(partial: Partial<Faktur>): Faktur {
  return {
    sphId: "SPH-1", perusahaanId: "C1", perusahaanNama: "PT A", alamat: "", kota: "", npwp: "",
    tanggal: "2026-06-10", jatuhTempo: "2026-07-10",
    items: [{ uraian: "Jasa", volume: 1, harga: 100_000_000, satuan: "ls" }],
    terminList: [{ label: "Termin I", persen: 100, pemicu: "" }],
    terminIndex: 0,
    ppnAktif: true, ppnPersen: 11, pph23Aktif: true, pph23Persen: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
    bankNama: "", bankAtasNama: "", bankNoRekening: "",
    jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "",
    id: "INV/1-T1",
    ...partial,
  } as Faktur;
}

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };

describe("fakturDiterbitkan", () => {
  it("treats terkirim and lunas as issued", () => {
    expect(fakturDiterbitkan(mk({ status: "terkirim" }))).toBe(true);
    expect(fakturDiterbitkan(mk({ status: "lunas" }))).toBe(true);
  });
  it("treats draft and dibatalkan as not issued", () => {
    expect(fakturDiterbitkan(mk({ status: "draft" }))).toBe(false);
    expect(fakturDiterbitkan(mk({ status: "dibatalkan" }))).toBe(false);
  });
});

describe("pendapatanPeriode", () => {
  it("sums nilaiTermin (ex-PPN, pre-PPh23) of issued fakturs in period", () => {
    // single 100% termin of 100jt -> nilaiTermin = 100jt
    const rev = pendapatanPeriode([mk({ status: "terkirim", tanggal: "2026-06-10" })], juni);
    expect(rev).toBe(100_000_000);
  });
  it("excludes drafts and out-of-period fakturs", () => {
    const rev = pendapatanPeriode(
      [
        mk({ status: "draft", tanggal: "", id: "d" }),
        mk({ status: "terkirim", tanggal: "2026-05-10", id: "may" }),
        mk({ status: "lunas", tanggal: "2026-06-15", id: "jun" }),
      ],
      juni,
    );
    expect(rev).toBe(100_000_000); // only the June one
  });
  it("does NOT subtract PPh 23 from revenue (BR-14)", () => {
    // pph23 2% would be 2jt; revenue must remain the full 100jt service value
    const rev = pendapatanPeriode([mk({ pph23Aktif: true, pph23Persen: 2 })], juni);
    expect(rev).toBe(100_000_000);
  });
});

describe("pendapatanPerSph", () => {
  it("groups recognized revenue by sphId across periods", () => {
    const map = pendapatanPerSph([
      mk({ sphId: "SPH-1", status: "lunas", tanggal: "2026-01-10", id: "a" }),
      mk({ sphId: "SPH-1", status: "terkirim", tanggal: "2026-06-10", id: "b" }),
      mk({ sphId: "SPH-2", status: "lunas", tanggal: "2026-06-10", id: "c" }),
      mk({ sphId: "SPH-2", status: "draft", tanggal: "", id: "d" }),
    ]);
    expect(map.get("SPH-1")).toBe(200_000_000);
    expect(map.get("SPH-2")).toBe(100_000_000);
  });
});

describe("pph23KreditPeriode", () => {
  it("sums pph23 of issued fakturs in period", () => {
    const credit = pph23KreditPeriode([mk({ pph23Aktif: true, pph23Persen: 2 })], juni);
    expect(credit).toBe(2_000_000); // 2% of 100jt nilaiTermin
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/dasbor-revenue.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dasbor/revenue'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/dasbor/revenue.ts`:

```ts
import type { Faktur } from "@/lib/schemas/faktur";
import { computeFaktur } from "@/lib/faktur";
import { dalamPeriode } from "@/lib/dasbor/period";
import type { Periode } from "@/lib/dasbor/types";

/** Issued = recognized on accrual: status terkirim or lunas. */
export function fakturDiterbitkan(f: Faktur): boolean {
  return f.status === "terkirim" || f.status === "lunas";
}

/** Total recognized revenue (service value ex-PPN) for issued fakturs in period. */
export function pendapatanPeriode(fakturs: Faktur[], periode: Periode): number {
  return fakturs.reduce((sum, f) => {
    if (!fakturDiterbitkan(f) || !dalamPeriode(f.tanggal, periode)) return sum;
    return sum + computeFaktur(f).nilaiTermin;
  }, 0);
}

/** Recognized revenue to date, grouped by sphId (period-agnostic). */
export function pendapatanPerSph(fakturs: Faktur[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of fakturs) {
    if (!fakturDiterbitkan(f)) continue;
    map.set(f.sphId, (map.get(f.sphId) ?? 0) + computeFaktur(f).nilaiTermin);
  }
  return map;
}

/** Accumulated PPh 23 credit from issued fakturs in period (income-tax credit). */
export function pph23KreditPeriode(fakturs: Faktur[], periode: Periode): number {
  return fakturs.reduce((sum, f) => {
    if (!fakturDiterbitkan(f) || !dalamPeriode(f.tanggal, periode)) return sum;
    return sum + computeFaktur(f).pph23;
  }, 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/dasbor-revenue.test.ts`
Expected: PASS, all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dasbor/revenue.ts src/lib/__tests__/dasbor-revenue.test.ts
git commit -m "feat(dasbor): add accrual revenue recognition (BR-14: PPh 23 not deducted)"
```

---

### Task 3: P&L waterfall engine

The accrual waterfall: Revenue − COGS = Gross; − Opex = Operating; − PPh Badan (estimate) = Net; with margins and the revenue-without-cost flag. Includes the income-tax sub-function.

**Files:**
- Create: `src/lib/dasbor/income-tax.ts`
- Create: `src/lib/dasbor/profit-loss.ts`
- Test: `src/lib/__tests__/dasbor-income-tax.test.ts`
- Test: `src/lib/__tests__/dasbor-profit-loss.test.ts`

**Interfaces:**
- Consumes: `PajakConfig` from `@/lib/schemas/pajak-config`; `ArusKasEntry` from `@/lib/schemas/arus-kas`; `RealisasiRab` from `@/lib/schemas/realisasi-rab`; `SifatBeban` from `@/lib/schemas/expense-nature`; `Faktur`; `pendapatanPeriode`, `pph23KreditPeriode` (Task 2); `dalamPeriode` (Task 1); `LabaRugi`, `Periode` (Task 1).
- Produces:
  - `estimasiPphBadan(args: { config: PajakConfig; pendapatan: number; labaOperasional: number; pph23Kredit: number }): number`
  - `hppPeriode(realisasi: RealisasiRab[], periode: Periode): number`
  - `bebanOperasionalPeriode(arusKas: ArusKasEntry[], natureOf: (kategori: string) => SifatBeban, periode: Periode): number`
  - `computeLabaRugi(args: { fakturs: Faktur[]; realisasi: RealisasiRab[]; arusKas: ArusKasEntry[]; natureOf: (kategori: string) => SifatBeban; config: PajakConfig; periode: Periode }): LabaRugi`

- [ ] **Step 1: Write the failing income-tax test**

Create `src/lib/__tests__/dasbor-income-tax.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { estimasiPphBadan } from "@/lib/dasbor/income-tax";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

const final: PajakConfig = { metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 };
const badan: PajakConfig = { metode: "badan_22", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 };

describe("estimasiPphBadan", () => {
  it("final method: 0.5% of revenue, ignores profit", () => {
    const tax = estimasiPphBadan({ config: final, pendapatan: 100_000_000, labaOperasional: 30_000_000, pph23Kredit: 0 });
    expect(tax).toBe(500_000);
  });

  it("badan method: 22% of operating profit, minus PPh 23 credit", () => {
    const tax = estimasiPphBadan({ config: badan, pendapatan: 100_000_000, labaOperasional: 30_000_000, pph23Kredit: 2_000_000 });
    expect(tax).toBe(22 / 100 * 30_000_000 - 2_000_000); // 6.6jt - 2jt = 4.6jt
  });

  it("badan method: floors at 0 when credit exceeds tax", () => {
    const tax = estimasiPphBadan({ config: badan, pendapatan: 10_000_000, labaOperasional: 1_000_000, pph23Kredit: 5_000_000 });
    expect(tax).toBe(0);
  });

  it("badan method: zero tax on a loss", () => {
    const tax = estimasiPphBadan({ config: badan, pendapatan: 100_000_000, labaOperasional: -5_000_000, pph23Kredit: 0 });
    expect(tax).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/__tests__/dasbor-income-tax.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the income-tax implementation**

Create `src/lib/dasbor/income-tax.ts`:

```ts
import type { PajakConfig } from "@/lib/schemas/pajak-config";

/**
 * Estimated income tax (PPh Badan). Always an estimate.
 * - final_05: tarifFinalPersen% of revenue (PP 55/2022); profit & credit ignored.
 * - badan_22: tarifBadanPersen% of positive operating profit, minus accumulated
 *   PPh 23 credit, floored at 0.
 */
export function estimasiPphBadan(args: {
  config: PajakConfig;
  pendapatan: number;
  labaOperasional: number;
  pph23Kredit: number;
}): number {
  const { config, pendapatan, labaOperasional, pph23Kredit } = args;
  if (config.metode === "final_05") {
    return Math.round((config.tarifFinalPersen / 100) * pendapatan);
  }
  const dasar = Math.max(0, labaOperasional);
  const bruto = Math.round((config.tarifBadanPersen / 100) * dasar);
  return Math.max(0, bruto - pph23Kredit);
}
```

- [ ] **Step 4: Write the failing P&L test**

Create `src/lib/__tests__/dasbor-profit-loss.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hppPeriode, bebanOperasionalPeriode, computeLabaRugi } from "@/lib/dasbor/profit-loss";
import type { Faktur } from "@/lib/schemas/faktur";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { SifatBeban } from "@/lib/schemas/expense-nature";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };
const finalCfg: PajakConfig = { metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 };

function mkFaktur(p: Partial<Faktur>): Faktur {
  return {
    sphId: "SPH-1", perusahaanId: "C1", perusahaanNama: "PT A", alamat: "", kota: "", npwp: "",
    tanggal: "2026-06-10", jatuhTempo: "2026-07-10",
    items: [{ uraian: "Jasa", volume: 1, harga: 100_000_000, satuan: "ls" }],
    terminList: [{ label: "Termin I", persen: 100, pemicu: "" }],
    terminIndex: 0, ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
    bankNama: "", bankAtasNama: "", bankNoRekening: "",
    jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "", id: "INV/1-T1",
    ...p,
  } as Faktur;
}
const rr = (jumlah: number, tanggal: string): RealisasiRab => ({
  id: "RRB-1", proyekId: "P1", kategori: "personil", rabLineLabel: "x", jumlah, tanggal, keterangan: "",
});
const ak = (jumlah: number, kategori: string, tanggal: string): ArusKasEntry => ({
  id: "AKS-1", jenis: "debit", tanggal, jumlah, kategori, sumber: "manual", keterangan: "", locked: false,
});
// All categories Opex except "pajak" which is non-P&L.
const natureOf = (k: string): SifatBeban => (k === "pajak" ? "non_laba_rugi" : "operasional");

describe("hppPeriode", () => {
  it("sums realisasi RAB within the period only", () => {
    expect(hppPeriode([rr(10_000_000, "2026-06-05"), rr(5_000_000, "2026-05-30")], juni)).toBe(10_000_000);
  });
});

describe("bebanOperasionalPeriode", () => {
  it("sums only Opex-flagged categories in period; excludes non-P&L", () => {
    const rows = [ak(3_000_000, "Sewa Kantor", "2026-06-03"), ak(9_000_000, "pajak", "2026-06-04")];
    expect(bebanOperasionalPeriode(rows, natureOf, juni)).toBe(3_000_000);
  });
});

describe("computeLabaRugi", () => {
  it("builds the full waterfall with margins", () => {
    const result = computeLabaRugi({
      fakturs: [mkFaktur({})], // revenue 100jt
      realisasi: [rr(40_000_000, "2026-06-05")], // HPP 40jt
      arusKas: [ak(10_000_000, "Sewa Kantor", "2026-06-03")], // Opex 10jt
      natureOf, config: finalCfg, periode: juni,
    });
    expect(result.pendapatan).toBe(100_000_000);
    expect(result.hpp).toBe(40_000_000);
    expect(result.labaKotor).toBe(60_000_000);
    expect(result.marginKotorPersen).toBeCloseTo(60);
    expect(result.bebanOperasional).toBe(10_000_000);
    expect(result.labaOperasional).toBe(50_000_000);
    expect(result.pphBadan).toBe(500_000); // 0.5% of 100jt
    expect(result.pphBadanEstimasi).toBe(true);
    expect(result.labaBersih).toBe(49_500_000);
    expect(result.marginBersihPersen).toBeCloseTo(49.5);
    expect(result.adaPendapatanTanpaBiaya).toBe(false);
  });

  it("flags revenue with no recorded cost (margin not a true 100%)", () => {
    const result = computeLabaRugi({
      fakturs: [mkFaktur({})], realisasi: [], arusKas: [], natureOf, config: finalCfg, periode: juni,
    });
    expect(result.adaPendapatanTanpaBiaya).toBe(true);
    expect(result.labaKotor).toBe(100_000_000);
  });

  it("zero revenue yields zero margins, not NaN", () => {
    const result = computeLabaRugi({
      fakturs: [], realisasi: [], arusKas: [], natureOf, config: finalCfg, periode: juni,
    });
    expect(result.marginKotorPersen).toBe(0);
    expect(result.marginBersihPersen).toBe(0);
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npx vitest run src/lib/__tests__/dasbor-profit-loss.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6: Write the P&L implementation**

Create `src/lib/dasbor/profit-loss.ts`:

```ts
import type { Faktur } from "@/lib/schemas/faktur";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { SifatBeban } from "@/lib/schemas/expense-nature";
import type { PajakConfig } from "@/lib/schemas/pajak-config";
import type { LabaRugi, Periode } from "@/lib/dasbor/types";
import { dalamPeriode } from "@/lib/dasbor/period";
import { pendapatanPeriode, pph23KreditPeriode } from "@/lib/dasbor/revenue";
import { estimasiPphBadan } from "@/lib/dasbor/income-tax";

/** COGS = realisasi RAB recorded within the period. */
export function hppPeriode(realisasi: RealisasiRab[], periode: Periode): number {
  return realisasi.reduce((s, r) => (dalamPeriode(r.tanggal, periode) ? s + r.jumlah : s), 0);
}

/** Opex = cashflow entries flagged operasional, within the period. */
export function bebanOperasionalPeriode(
  arusKas: ArusKasEntry[],
  natureOf: (kategori: string) => SifatBeban,
  periode: Periode,
): number {
  return arusKas.reduce((s, e) => {
    if (!dalamPeriode(e.tanggal, periode)) return s;
    return natureOf(e.kategori) === "operasional" ? s + e.jumlah : s;
  }, 0);
}

const pct = (num: number, den: number): number => (den === 0 ? 0 : (num / den) * 100);

export function computeLabaRugi(args: {
  fakturs: Faktur[];
  realisasi: RealisasiRab[];
  arusKas: ArusKasEntry[];
  natureOf: (kategori: string) => SifatBeban;
  config: PajakConfig;
  periode: Periode;
}): LabaRugi {
  const { fakturs, realisasi, arusKas, natureOf, config, periode } = args;
  const pendapatan = pendapatanPeriode(fakturs, periode);
  const hpp = hppPeriode(realisasi, periode);
  const labaKotor = pendapatan - hpp;
  const bebanOperasional = bebanOperasionalPeriode(arusKas, natureOf, periode);
  const labaOperasional = labaKotor - bebanOperasional;
  const pph23Kredit = pph23KreditPeriode(fakturs, periode);
  const pphBadan = estimasiPphBadan({ config, pendapatan, labaOperasional, pph23Kredit });
  const labaBersih = labaOperasional - pphBadan;
  return {
    pendapatan,
    hpp,
    labaKotor,
    marginKotorPersen: pct(labaKotor, pendapatan),
    bebanOperasional,
    labaOperasional,
    pphBadan,
    pphBadanEstimasi: true,
    labaBersih,
    marginBersihPersen: pct(labaBersih, pendapatan),
    adaPendapatanTanpaBiaya: pendapatan > 0 && hpp === 0,
  };
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/dasbor-income-tax.test.ts src/lib/__tests__/dasbor-profit-loss.test.ts`
Expected: PASS, all green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/dasbor/income-tax.ts src/lib/dasbor/profit-loss.ts src/lib/__tests__/dasbor-income-tax.test.ts src/lib/__tests__/dasbor-profit-loss.test.ts
git commit -m "feat(dasbor): add P&L waterfall engine with estimated PPh Badan line"
```

---

### Task 4: Per-project profitability engine

One row per project: contract value, recognized revenue, RAB plan, realisasi, plan vs actual margin, % budget used, health flag.

**Files:**
- Create: `src/lib/dasbor/project-profit.ts`
- Test: `src/lib/__tests__/dasbor-project-profit.test.ts`

**Interfaces:**
- Consumes: `Proyek` from `@/lib/schemas/proyek` (`id`, `nama`, `nilaiKontrak`, `sphId`); `Sph` from `@/lib/schemas/penawaran`; `RealisasiRab`; `sumRabPlan` (Task 1); `pendapatanPerSph` (Task 2); `ProyekProfit`, `KesehatanProyek` (Task 1); `Faktur`.
- Produces:
  - `kesehatanProyek(args: { rabRencana: number; realisasi: number | null; marginRencana: number; marginAktual: number | null; ambang?: number }): KesehatanProyek` (default `ambang = 0.1`)
  - `computeProjectProfitability(args: { proyeks: Proyek[]; sphById: Map<string, Sph>; fakturs: Faktur[]; realisasi: RealisasiRab[]; ambang?: number }): ProyekProfit[]`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/dasbor-project-profit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { kesehatanProyek, computeProjectProfitability } from "@/lib/dasbor/project-profit";
import type { Proyek } from "@/lib/schemas/proyek";
import type { Sph } from "@/lib/schemas/penawaran";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { Faktur } from "@/lib/schemas/faktur";

describe("kesehatanProyek", () => {
  it("merah when realisasi exceeds RAB plan", () => {
    expect(kesehatanProyek({ rabRencana: 100, realisasi: 120, marginRencana: 50, marginAktual: -20 })).toBe("merah");
  });
  it("abu when no realisasi recorded", () => {
    expect(kesehatanProyek({ rabRencana: 100, realisasi: null, marginRencana: 50, marginAktual: null })).toBe("abu");
  });
  it("kuning when actual margin slips below plan by more than threshold", () => {
    // plan 50, actual 40 -> slip 10 > 10% of 50 (=5)
    expect(kesehatanProyek({ rabRencana: 100, realisasi: 60, marginRencana: 50, marginAktual: 40 })).toBe("kuning");
  });
  it("hijau when actual margin is on track", () => {
    expect(kesehatanProyek({ rabRencana: 100, realisasi: 50, marginRencana: 50, marginAktual: 49 })).toBe("hijau");
  });
});

describe("computeProjectProfitability", () => {
  const sph: Sph = {
    items: [{ rab: { personil: [{ uraian: "A", vol: 1, satuan: "x", hargaSatuan: 30_000_000 }],
                     langsung: [{ uraian: "B", vol: 1, satuan: "x", hargaSatuan: 20_000_000 }] } }],
  } as unknown as Sph;
  const proyek: Proyek = {
    id: "P1", nama: "Proyek Satu", sphId: "SPH-1", nilaiKontrak: 100_000_000,
  } as unknown as Proyek;
  const faktur = {
    sphId: "SPH-1", status: "lunas", tanggal: "2026-06-10", terminIndex: 0,
    terminList: [{ label: "I", persen: 100, pemicu: "" }],
    items: [{ uraian: "j", volume: 1, harga: 100_000_000, satuan: "ls" }],
    ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2, id: "INV-1",
  } as unknown as Faktur;

  it("computes plan margin, actual margin, and % budget used", () => {
    const rows = computeProjectProfitability({
      proyeks: [proyek],
      sphById: new Map([["SPH-1", sph]]),
      fakturs: [faktur],
      realisasi: [{ id: "r1", proyekId: "P1", kategori: "personil", rabLineLabel: "x", jumlah: 25_000_000, tanggal: "2026-06-05", keterangan: "" } as RealisasiRab],
    });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.nilaiKontrak).toBe(100_000_000);
    expect(r.pendapatanDiakui).toBe(100_000_000);
    expect(r.rabRencana).toBe(50_000_000);
    expect(r.realisasi).toBe(25_000_000);
    expect(r.marginRencana).toBe(50_000_000);          // 100jt - 50jt
    expect(r.marginAktual).toBe(75_000_000);           // 100jt recognized - 25jt realisasi
    expect(r.persenAnggaranTerpakai).toBeCloseTo(50);  // 25/50
    expect(r.kesehatan).toBe("hijau");
  });

  it("marks realisasi null and health abu when no realisasi recorded", () => {
    const rows = computeProjectProfitability({
      proyeks: [proyek], sphById: new Map([["SPH-1", sph]]), fakturs: [faktur], realisasi: [],
    });
    expect(rows[0].realisasi).toBeNull();
    expect(rows[0].marginAktual).toBeNull();
    expect(rows[0].persenAnggaranTerpakai).toBeNull();
    expect(rows[0].kesehatan).toBe("abu");
  });

  it("handles a project whose SPH is missing (rabRencana 0)", () => {
    const orphan = { ...proyek, id: "P2", sphId: "SPH-X" } as Proyek;
    const rows = computeProjectProfitability({
      proyeks: [orphan], sphById: new Map([["SPH-1", sph]]), fakturs: [], realisasi: [],
    });
    expect(rows[0].rabRencana).toBe(0);
    expect(rows[0].pendapatanDiakui).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/dasbor-project-profit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/dasbor/project-profit.ts`:

```ts
import type { Proyek } from "@/lib/schemas/proyek";
import type { Sph } from "@/lib/schemas/penawaran";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { Faktur } from "@/lib/schemas/faktur";
import type { ProyekProfit, KesehatanProyek } from "@/lib/dasbor/types";
import { sumRabPlan } from "@/lib/dasbor/rab-plan";
import { pendapatanPerSph } from "@/lib/dasbor/revenue";

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/dasbor-project-profit.test.ts`
Expected: PASS, all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dasbor/project-profit.ts src/lib/__tests__/dasbor-project-profit.test.ts
git commit -m "feat(dasbor): add per-project profitability engine with health flags"
```

---

### Task 5: Async orchestrator + query hook

Wire the pure engines to the real data layers. One async function fetches everything (Plan 1 + existing modules), builds the `natureOf` lookup and `sphById` map, and returns both view models; one TanStack Query hook exposes it.

**Files:**
- Create: `src/lib/dasbor/profitability.ts`
- Create: `src/lib/query/dasbor.ts`
- Test: `src/lib/__tests__/dasbor-profitability.test.ts`

**Interfaces:**
- Consumes: `listFaktur`/equivalent from `@/lib/data/faktur`, `listProyek` from `@/lib/data/proyek`, `listPenawaran` from `@/lib/data/penawaran`, `listRealisasiRab` from `@/lib/data/realisasi-rab`, `listArusKas` from `@/lib/data/arus-kas`, `listExpenseNature` + `DEFAULT_SIFAT` from `@/lib/data/expense-nature`/fixtures, `getPajakConfig` from `@/lib/data/pajak-config`; the four pure engines; `Periode`, `LabaRugi`, `ProyekProfit`.
- Produces:
  - `ProfitabilitasView = { labaRugi: LabaRugi; proyek: ProyekProfit[] }`
  - `getProfitabilitas(periode: Periode): Promise<ProfitabilitasView>`
  - `useProfitabilitas(periode: Periode)` hook

> **Implementation note (read the faktur data layer first):** confirm the exported list function name in `src/lib/data/faktur.ts` (e.g. `listFaktur`) and `src/lib/data/proyek.ts` (e.g. `listProyek`) before writing — use the real exported names. The test below stubs the data layer via `vi.mock`, so it does not depend on fixture contents.

- [ ] **Step 1: Confirm the data-layer export names**

Run: `grep -nE "export async function list|export async function get" src/lib/data/faktur.ts src/lib/data/proyek.ts src/lib/data/penawaran.ts`
Expected: prints the list/get function names. Use these exact names in Steps 3–4. (`listPenawaran`, `listRealisasiRab`, `listArusKas`, `listExpenseNature`, `getPajakConfig` are already confirmed by Plan 1 + the penawaran data layer.)

- [ ] **Step 2: Write the failing test**

Create `src/lib/__tests__/dasbor-profitability.test.ts`. It mocks every data-layer module so the orchestrator is tested in isolation. Replace `listFaktur`/`listProyek` with the real names found in Step 1 if they differ:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/data/faktur", () => ({
  listFaktur: vi.fn(async () => [
    {
      sphId: "SPH-1", status: "lunas", tanggal: "2026-06-10", terminIndex: 0,
      terminList: [{ label: "I", persen: 100, pemicu: "" }],
      items: [{ uraian: "j", volume: 1, harga: 100_000_000, satuan: "ls" }],
      ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2, id: "INV-1",
    },
  ]),
}));
vi.mock("@/lib/data/proyek", () => ({
  listProyek: vi.fn(async () => [{ id: "P1", nama: "Proyek Satu", sphId: "SPH-1", nilaiKontrak: 100_000_000 }]),
}));
vi.mock("@/lib/data/penawaran", () => ({
  listPenawaran: vi.fn(async () => [
    { id: "SPH-1", items: [{ rab: { personil: [{ uraian: "A", vol: 1, satuan: "x", hargaSatuan: 30_000_000 }], langsung: [] } }] },
  ]),
}));
vi.mock("@/lib/data/realisasi-rab", () => ({
  listRealisasiRab: vi.fn(async () => [
    { id: "r1", proyekId: "P1", kategori: "personil", rabLineLabel: "x", jumlah: 20_000_000, tanggal: "2026-06-05", keterangan: "" },
  ]),
}));
vi.mock("@/lib/data/arus-kas", () => ({
  listArusKas: vi.fn(async () => [
    { id: "a1", jenis: "debit", tanggal: "2026-06-03", jumlah: 5_000_000, kategori: "Sewa Kantor", sumber: "manual", keterangan: "", locked: false },
  ]),
}));
vi.mock("@/lib/data/expense-nature", () => ({
  listExpenseNature: vi.fn(async () => [{ kategori: "Sewa Kantor", sifat: "operasional" }]),
}));
vi.mock("@/lib/data/pajak-config", () => ({
  getPajakConfig: vi.fn(async () => ({ metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 })),
}));

import { getProfitabilitas } from "@/lib/dasbor/profitability";

const juni = { mulai: "2026-06-01", selesai: "2026-06-30" };

describe("getProfitabilitas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a P&L waterfall and per-project rows from the data layers", async () => {
    const view = await getProfitabilitas(juni);
    // revenue 100jt, HPP 20jt, Opex 5jt
    expect(view.labaRugi.pendapatan).toBe(100_000_000);
    expect(view.labaRugi.hpp).toBe(20_000_000);
    expect(view.labaRugi.bebanOperasional).toBe(5_000_000);
    expect(view.labaRugi.labaOperasional).toBe(75_000_000);
    expect(view.proyek).toHaveLength(1);
    expect(view.proyek[0].proyekId).toBe("P1");
    expect(view.proyek[0].rabRencana).toBe(30_000_000);
    expect(view.proyek[0].pendapatanDiakui).toBe(100_000_000);
  });

  it("uses DEFAULT_SIFAT (operasional) for unmapped categories", async () => {
    const view = await getProfitabilitas(juni);
    // Sewa Kantor is mapped; an unmapped category would still default to operasional.
    expect(view.labaRugi.bebanOperasional).toBe(5_000_000);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/lib/__tests__/dasbor-profitability.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dasbor/profitability'`.

- [ ] **Step 4: Write the orchestrator**

Create `src/lib/dasbor/profitability.ts` (adjust `listFaktur`/`listProyek` import names to match Step 1):

```ts
import { listFaktur } from "@/lib/data/faktur";
import { listProyek } from "@/lib/data/proyek";
import { listPenawaran } from "@/lib/data/penawaran";
import { listRealisasiRab } from "@/lib/data/realisasi-rab";
import { listArusKas } from "@/lib/data/arus-kas";
import { listExpenseNature } from "@/lib/data/expense-nature";
import { getPajakConfig } from "@/lib/data/pajak-config";
import { DEFAULT_SIFAT } from "@/lib/fixtures/expense-nature";
import type { SifatBeban } from "@/lib/schemas/expense-nature";
import type { Sph } from "@/lib/schemas/penawaran";
import type { LabaRugi, Periode, ProyekProfit } from "@/lib/dasbor/types";
import { computeLabaRugi } from "@/lib/dasbor/profit-loss";
import { computeProjectProfitability } from "@/lib/dasbor/project-profit";

export type ProfitabilitasView = { labaRugi: LabaRugi; proyek: ProyekProfit[] };

export async function getProfitabilitas(periode: Periode): Promise<ProfitabilitasView> {
  const [fakturs, proyeks, penawarans, realisasi, arusKas, natureRows, config] = await Promise.all([
    listFaktur(),
    listProyek(),
    listPenawaran(),
    listRealisasiRab(),
    listArusKas(),
    listExpenseNature(),
    getPajakConfig(),
  ]);

  const natureMap = new Map<string, SifatBeban>(natureRows.map((n) => [n.kategori, n.sifat]));
  const natureOf = (kategori: string): SifatBeban => natureMap.get(kategori) ?? DEFAULT_SIFAT;
  const sphById = new Map<string, Sph>(penawarans.map((s) => [s.id, s]));

  const labaRugi = computeLabaRugi({ fakturs, realisasi, arusKas, natureOf, config, periode });
  const proyek = computeProjectProfitability({ proyeks, sphById, fakturs, realisasi });

  return { labaRugi, proyek };
}
```

> If `listFaktur` is not the real export name (Step 1), use the actual name. If the faktur list function requires params, call it with none / an empty object as the existing callers do.

- [ ] **Step 5: Write the query hook**

Create `src/lib/query/dasbor.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { getProfitabilitas } from "@/lib/dasbor/profitability";
import type { Periode } from "@/lib/dasbor/types";

export function useProfitabilitas(periode: Periode) {
  return useQuery({
    queryKey: ["dasbor", "profitabilitas", periode.mulai, periode.selesai],
    queryFn: () => getProfitabilitas(periode),
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/dasbor-profitability.test.ts`
Expected: PASS, all green.

- [ ] **Step 7: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS; no new type errors from `src/lib/dasbor/**` or `src/lib/query/dasbor.ts`. (Pre-existing app-page tsc errors in `arus-kas/page.tsx`, `penggajian/page.tsx`, and stale `.next` types are out of scope — do not fix them here.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/dasbor/profitability.ts src/lib/query/dasbor.ts src/lib/__tests__/dasbor-profitability.test.ts
git commit -m "feat(dasbor): add profitability orchestrator + query hook"
```

---

## What this plan defers (to plans 3–5)

- **Forecast + Alert engines** (spec §5.3/§5.4) — plan 3.
- **All UI** — KPI strip, waterfall rendering, per-project table, drilldown, charts, period picker — plan 4.
- **Realisasi RAB entry UI / Settings UI** for expense-nature + pajak-config edits — plan 4.
- **Role switcher + per-role panel filtering / RBAC** (spec §6.2, §7) — plan 5.
- **At-completion margin forecast for mid-period projects** (spec §5.2 "to date + forecast") — the engine currently reports to-date actuals; the forecast projection is a plan-3 concern (shares the forecast engine).

## Self-Review

- **Spec coverage (§5.1 + §5.2):** P&L waterfall lines Revenue→Gross→Operating→Net with margins → Task 3 ✓; accrual revenue ex-PPN, PPh 23 not deducted (BR-14) → Task 2 ✓ + explicit test; COGS from Realisasi RAB → Task 3 `hppPeriode` ✓; Opex from operasional-flagged cashflow → Task 3 `bebanOperasionalPeriode` ✓; non-P&L excluded via expense-nature → covered (only `operasional` counts) ✓; income tax estimate w/ both methods + PPh 23 credit + estimate flag → Task 3 `estimasiPphBadan` ✓; per-project contract/recognized/plan/actual/% used/health → Task 4 ✓; "no realisasi → plan margin only, health abu" → Task 4 test ✓; "revenue but no cost flagged" → Task 3 `adaPendapatanTanpaBiaya` ✓. Mid-period at-completion forecast correctly deferred to plan 3 and noted.
- **Placeholder scan:** no TBD/TODO; every code step shows complete content; every test step shows full assertions and exact commands with expected output. The one lookup step (Task 5 Step 1) is a concrete `grep` with a stated reason (real export-name verification), not a placeholder.
- **Type consistency:** `Periode`, `RabPlan`, `LabaRugi`, `ProyekProfit`, `KesehatanProyek` defined once in `types.ts` (Task 1) and imported everywhere; `natureOf: (kategori: string) => SifatBeban` signature identical in Task 3 and Task 5; `pendapatanPerSph` returns `Map<string, number>` consumed identically in Task 4; `estimasiPphBadan` arg object shape matches between Task 3 def and its caller in `computeLabaRugi`; `getProfitabilitas` returns `ProfitabilitasView` consumed by the hook.
