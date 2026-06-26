# Dasbor Data Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the four missing data captures the Dasbor profitability/forecast/alert engines depend on — Realisasi RAB, expense-nature flag, PPh Badan config, and tax obligations — as fixture-backed modules following the existing per-module data-layer convention.

**Architecture:** This is plan 1 of a 5-plan series for the Dasbor (Dashboard) module. The dashboard stores nothing of its own; it is a real-time computation layer over other modules (PRD §8). The engines (plans 2–3) and surfaces (plans 4–5) need inputs that do not exist yet. This plan delivers only the persistence/data layer for those inputs: Zod schema → fixtures (seeded, some derived from existing fixtures) → async data functions (matching `delay()` mock-backend style) → TanStack Query hooks → vitest tests. No UI and no computation in this plan.

**Tech Stack:** Next.js (vendored — read `node_modules/next/dist/docs/` before any framework code), TypeScript, Zod, TanStack Query, vitest, sonner (toasts).

## Global Constraints

- **NOT the Next.js you know** — read the relevant guide in `node_modules/next/dist/docs/` before writing any framework-coupled code (per AGENTS.md). This plan is mostly framework-agnostic lib code; the constraint binds only if a step touches Next APIs.
- **Per-module file layout** (copy exactly): `src/lib/schemas/<mod>.ts`, `src/lib/fixtures/<mod>.ts`, `src/lib/data/<mod>.ts`, `src/lib/query/<mod>.ts`, tests in `src/lib/__tests__/<mod>-data.test.ts`.
- **Mock backend pattern:** every data function is `async`, calls `await delay()` (or `delay(ms)`) from `@/lib/data/_delay`, parses through its Zod schema before returning, and mutates the in-memory fixtures array for writes. Mirror `src/lib/data/arus-kas.ts` exactly.
- **ID format:** `PREFIX-####` zero-padded to 4 digits via a module-local `seq` counter + `bumpSeq()` export, mirroring `src/lib/fixtures/arus-kas.ts`.
- **Indonesian domain copy** for all user-facing strings (labels, toasts, error messages), matching existing modules.
- **Currency:** integer IDR (Rupiah), no decimals — `z.number()`.
- **BR-14 (must not violate):** cashflow ≠ profit; PPh 23 is a tax credit (asset), never a revenue reducer. This plan must classify PPh 23 as `non_laba_rugi` in expense-nature defaults so a later engine cannot mistake it for an expense.
- **Income-tax line is always an estimate** — `pajak-config` drives it; the config carries the Rp 4.8B/year threshold verbatim (`4_800_000_000`).

---

### Task 1: Realisasi RAB module

Captures **actual** project cost against the RAB plan (spec §4.1). Keystone — without it there is no real margin. Per project, tagged to a RAB category (Personil **A** / Langsung **B**), entered manually, periodic, with optional link to a source cashflow expense.

**Files:**
- Create: `src/lib/schemas/realisasi-rab.ts`
- Create: `src/lib/fixtures/realisasi-rab.ts`
- Create: `src/lib/data/realisasi-rab.ts`
- Create: `src/lib/query/realisasi-rab.ts`
- Test: `src/lib/__tests__/realisasi-rab-data.test.ts`

**Interfaces:**
- Consumes: `proyekFixtures` from `@/lib/fixtures/proyek` (each has `id: string`, `nilaiKontrak: number`, `status: ProyekStatus`, `nama: string`); `delay` from `@/lib/data/_delay`.
- Produces:
  - `rabKategori` (Zod enum `["personil", "langsung"]`), type `RabKategori`
  - `realisasiRabSchema`, type `RealisasiRab = { id: string; proyekId: string; kategori: RabKategori; rabLineLabel: string; jumlah: number; tanggal: string; keterangan: string; arusKasId?: string }`
  - `realisasiRabFormSchema`, type `RealisasiRabFormValues` (all of the above except `id`)
  - `realisasiRabFixtures: RealisasiRab[]`, `bumpSeq(): number`
  - `listRealisasiRab(): Promise<RealisasiRab[]>`
  - `listRealisasiRabByProyek(proyekId: string): Promise<RealisasiRab[]>`
  - `createRealisasiRab(input: RealisasiRabFormValues): Promise<RealisasiRab>`
  - `removeRealisasiRab(id: string): Promise<void>`
  - Hooks: `useRealisasiRabList`, `useRealisasiRabByProyek(proyekId)`, `useCreateRealisasiRab`, `useRemoveRealisasiRab`

- [ ] **Step 1: Write the schema**

Create `src/lib/schemas/realisasi-rab.ts`:

```ts
import { z } from "zod";

/** RAB cost categories — Personil (A) and Langsung (B). */
export const rabKategori = z.enum(["personil", "langsung"]);
export type RabKategori = z.infer<typeof rabKategori>;

export const realisasiRabSchema = z.object({
  id: z.string(),
  proyekId: z.string(),
  kategori: rabKategori,
  /** Free label of the RAB line/category this actual maps to. */
  rabLineLabel: z.string(),
  /** Actual cost in IDR. */
  jumlah: z.number().positive(),
  tanggal: z.string(),
  keterangan: z.string(),
  /** Optional link to the source cashflow expense entry. */
  arusKasId: z.string().optional(),
});
export type RealisasiRab = z.infer<typeof realisasiRabSchema>;

export const realisasiRabFormSchema = z.object({
  proyekId: z.string().min(1, "Proyek wajib dipilih."),
  kategori: rabKategori,
  rabLineLabel: z.string().min(1, "Baris RAB wajib diisi."),
  jumlah: z.number().positive("Jumlah harus > 0."),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  keterangan: z.string().min(1, "Keterangan wajib diisi."),
  arusKasId: z.string().optional(),
});
export type RealisasiRabFormValues = z.infer<typeof realisasiRabFormSchema>;
```

- [ ] **Step 2: Write the fixtures**

Create `src/lib/fixtures/realisasi-rab.ts`. Seed is **derived** from `proyekFixtures` (mirrors how `arus-kas` derives from faktur fixtures), so it never references hardcoded ids:

```ts
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import { proyekFixtures } from "@/lib/fixtures/proyek";

let seq = 0;
function nextId(): string {
  return `RRB-${String(++seq).padStart(4, "0")}`;
}

export function bumpSeq(): number {
  return ++seq;
}

/**
 * Seed actual cost against a subset of projects that are underway/delivered.
 * Personil ~35% and Langsung ~25% of nilaiKontrak, so plan-vs-actual margin is
 * meaningful (some on-track, one intentionally over-budget for 🔴 testing).
 */
function generate(): RealisasiRab[] {
  const rows: RealisasiRab[] = [];
  const active = proyekFixtures.filter(
    (p) => p.status === "on_track" || p.status === "terlambat" || p.status === "selesai",
  );
  active.forEach((p, i) => {
    // Make the 2nd active project over-budget (realisasi > a plausible RAB plan).
    const overBudget = i === 1;
    const personil = Math.round(p.nilaiKontrak * (overBudget ? 0.6 : 0.35));
    const langsung = Math.round(p.nilaiKontrak * (overBudget ? 0.45 : 0.25));
    rows.push({
      id: nextId(),
      proyekId: p.id,
      kategori: "personil",
      rabLineLabel: "Tenaga Ahli",
      jumlah: personil,
      tanggal: "2026-05-15",
      keterangan: `Realisasi personil — ${p.nama}`,
    });
    rows.push({
      id: nextId(),
      proyekId: p.id,
      kategori: "langsung",
      rabLineLabel: "Material & Operasional Lapangan",
      jumlah: langsung,
      tanggal: "2026-05-28",
      keterangan: `Realisasi biaya langsung — ${p.nama}`,
    });
  });
  return rows;
}

export const realisasiRabFixtures: RealisasiRab[] = generate();
```

- [ ] **Step 3: Write the data layer**

Create `src/lib/data/realisasi-rab.ts`:

```ts
import { delay } from "@/lib/data/_delay";
import { realisasiRabFixtures, bumpSeq } from "@/lib/fixtures/realisasi-rab";
import {
  realisasiRabSchema,
  type RealisasiRab,
  type RealisasiRabFormValues,
} from "@/lib/schemas/realisasi-rab";

export async function listRealisasiRab(): Promise<RealisasiRab[]> {
  await delay();
  return realisasiRabSchema.array().parse(realisasiRabFixtures);
}

export async function listRealisasiRabByProyek(proyekId: string): Promise<RealisasiRab[]> {
  await delay();
  return realisasiRabSchema
    .array()
    .parse(realisasiRabFixtures.filter((r) => r.proyekId === proyekId));
}

export async function createRealisasiRab(input: RealisasiRabFormValues): Promise<RealisasiRab> {
  await delay(400);
  const entry: RealisasiRab = {
    id: `RRB-${String(bumpSeq()).padStart(4, "0")}`,
    proyekId: input.proyekId,
    kategori: input.kategori,
    rabLineLabel: input.rabLineLabel,
    jumlah: input.jumlah,
    tanggal: input.tanggal,
    keterangan: input.keterangan,
    arusKasId: input.arusKasId,
  };
  const parsed = realisasiRabSchema.parse(entry);
  realisasiRabFixtures.push(parsed);
  return parsed;
}

export async function removeRealisasiRab(id: string): Promise<void> {
  await delay(300);
  const idx = realisasiRabFixtures.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Realisasi ${id} tidak ditemukan.`);
  realisasiRabFixtures.splice(idx, 1);
}
```

- [ ] **Step 4: Write the query hooks**

Create `src/lib/query/realisasi-rab.ts`:

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listRealisasiRab,
  listRealisasiRabByProyek,
  createRealisasiRab,
  removeRealisasiRab,
} from "@/lib/data/realisasi-rab";
import type { RealisasiRabFormValues } from "@/lib/schemas/realisasi-rab";

export function useRealisasiRabList() {
  return useQuery({ queryKey: ["realisasi-rab"], queryFn: listRealisasiRab });
}

export function useRealisasiRabByProyek(proyekId: string) {
  return useQuery({
    queryKey: ["realisasi-rab", proyekId],
    queryFn: () => listRealisasiRabByProyek(proyekId),
    enabled: !!proyekId,
  });
}

export function useCreateRealisasiRab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RealisasiRabFormValues) => createRealisasiRab(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realisasi-rab"] });
      toast.success("Realisasi RAB berhasil dicatat.");
    },
    onError: () => {
      toast.error("Gagal mencatat realisasi RAB. Coba lagi.");
    },
  });
}

export function useRemoveRealisasiRab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeRealisasiRab(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realisasi-rab"] });
      toast.success("Realisasi RAB berhasil dihapus.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus realisasi RAB.");
    },
  });
}
```

- [ ] **Step 5: Write the failing tests**

Create `src/lib/__tests__/realisasi-rab-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  listRealisasiRab,
  listRealisasiRabByProyek,
  createRealisasiRab,
  removeRealisasiRab,
} from "@/lib/data/realisasi-rab";

describe("listRealisasiRab", () => {
  it("returns seeded realisasi rows", async () => {
    const rows = await listRealisasiRab();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("seeds both personil and langsung categories", async () => {
    const rows = await listRealisasiRab();
    expect(rows.some((r) => r.kategori === "personil")).toBe(true);
    expect(rows.some((r) => r.kategori === "langsung")).toBe(true);
  });
});

describe("listRealisasiRabByProyek", () => {
  it("filters to a single project", async () => {
    const all = await listRealisasiRab();
    const proyekId = all[0].proyekId;
    const filtered = await listRealisasiRabByProyek(proyekId);
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.every((r) => r.proyekId === proyekId)).toBe(true);
  });
});

describe("createRealisasiRab", () => {
  it("creates a row with generated RRB id", async () => {
    const before = await listRealisasiRab();
    const entry = await createRealisasiRab({
      proyekId: before[0].proyekId,
      kategori: "langsung",
      rabLineLabel: "Sewa Alat",
      jumlah: 5_000_000,
      tanggal: "2026-06-10",
      keterangan: "Test realisasi",
    });
    expect(entry.id).toMatch(/^RRB-/);
    const after = await listRealisasiRab();
    expect(after.length).toBe(before.length + 1);
  });
});

describe("removeRealisasiRab", () => {
  it("removes a row", async () => {
    const created = await createRealisasiRab({
      proyekId: "P-TEST",
      kategori: "personil",
      rabLineLabel: "X",
      jumlah: 1_000_000,
      tanggal: "2026-06-10",
      keterangan: "to delete",
    });
    await removeRealisasiRab(created.id);
    const after = await listRealisasiRab();
    expect(after.find((r) => r.id === created.id)).toBeUndefined();
  });

  it("throws for unknown id", async () => {
    await expect(removeRealisasiRab("RRB-9999")).rejects.toThrow("tidak ditemukan");
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/realisasi-rab-data.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/realisasi-rab.ts src/lib/fixtures/realisasi-rab.ts src/lib/data/realisasi-rab.ts src/lib/query/realisasi-rab.ts src/lib/__tests__/realisasi-rab-data.test.ts
git commit -m "feat(dasbor): add Realisasi RAB data layer with fixtures + tests"
```

---

### Task 2: Expense-nature flag module

Classifies each cashflow category as **HPP** (COGS), **Operasional** (Opex), or **Non-Laba-Rugi** (settlements / non-expenses), so the P&L engine can split costs correctly (spec §4.2). Sensible defaults applied to existing categories; editable later in Settings.

**Files:**
- Create: `src/lib/schemas/expense-nature.ts`
- Create: `src/lib/fixtures/expense-nature.ts`
- Create: `src/lib/data/expense-nature.ts`
- Create: `src/lib/query/expense-nature.ts`
- Test: `src/lib/__tests__/expense-nature-data.test.ts`

**Interfaces:**
- Consumes: `delay` from `@/lib/data/_delay`.
- Produces:
  - `sifatBeban` (Zod enum `["hpp", "operasional", "non_laba_rugi"]`), type `SifatBeban`
  - `expenseNatureEntrySchema`, type `ExpenseNatureEntry = { kategori: string; sifat: SifatBeban }`
  - `expenseNatureFixtures: ExpenseNatureEntry[]`, `DEFAULT_SIFAT: SifatBeban` (= `"operasional"`)
  - `listExpenseNature(): Promise<ExpenseNatureEntry[]>`
  - `getSifatBeban(kategori: string): Promise<SifatBeban>` — returns the mapped value or `DEFAULT_SIFAT`
  - `setSifatBeban(kategori: string, sifat: SifatBeban): Promise<ExpenseNatureEntry>` — upsert
  - Hooks: `useExpenseNatureList`, `useSetSifatBeban`

**Rationale for defaults (BR-14 critical):** Project personil/langsung cost reaches the P&L only via Realisasi RAB (Task 1), so the cashflow `penggajian` category is overhead → `operasional` (never `hpp`, to avoid double-counting). `pajak` → `non_laba_rugi` (PPN deposits are titipan, PPh 23 is a credit/asset — must NOT be an expense). `faktur` is income, not an expense, but is mapped `non_laba_rugi` defensively so it can never leak into cost.

- [ ] **Step 1: Write the schema**

Create `src/lib/schemas/expense-nature.ts`:

```ts
import { z } from "zod";

/** Expense nature for P&L classification: COGS / Opex / non-P&L. */
export const sifatBeban = z.enum(["hpp", "operasional", "non_laba_rugi"]);
export type SifatBeban = z.infer<typeof sifatBeban>;

export const expenseNatureEntrySchema = z.object({
  kategori: z.string(),
  sifat: sifatBeban,
});
export type ExpenseNatureEntry = z.infer<typeof expenseNatureEntrySchema>;
```

- [ ] **Step 2: Write the fixtures**

Create `src/lib/fixtures/expense-nature.ts`:

```ts
import type { ExpenseNatureEntry, SifatBeban } from "@/lib/schemas/expense-nature";

/** Fallback when a category has no explicit mapping. */
export const DEFAULT_SIFAT: SifatBeban = "operasional";

/**
 * Defaults for known cashflow categories.
 * - faktur: income (mapped non_laba_rugi defensively — never a cost)
 * - penggajian: overhead opex (project cost comes from Realisasi RAB, not here)
 * - pajak: PPN titipan + PPh 23 credit -> non_laba_rugi (BR-14)
 * - bonus: opex
 * - manual examples seen in fixtures kept aligned with their intent
 */
export const expenseNatureFixtures: ExpenseNatureEntry[] = [
  { kategori: "faktur", sifat: "non_laba_rugi" },
  { kategori: "penggajian", sifat: "operasional" },
  { kategori: "pajak", sifat: "non_laba_rugi" },
  { kategori: "bonus", sifat: "operasional" },
  { kategori: "Operasional", sifat: "operasional" },
  { kategori: "Sewa Kantor", sifat: "operasional" },
  { kategori: "Biaya Proyek", sifat: "hpp" },
];
```

- [ ] **Step 3: Write the data layer**

Create `src/lib/data/expense-nature.ts`:

```ts
import { delay } from "@/lib/data/_delay";
import { expenseNatureFixtures, DEFAULT_SIFAT } from "@/lib/fixtures/expense-nature";
import {
  expenseNatureEntrySchema,
  type ExpenseNatureEntry,
  type SifatBeban,
} from "@/lib/schemas/expense-nature";

export async function listExpenseNature(): Promise<ExpenseNatureEntry[]> {
  await delay();
  return expenseNatureEntrySchema.array().parse(expenseNatureFixtures);
}

export async function getSifatBeban(kategori: string): Promise<SifatBeban> {
  await delay();
  const found = expenseNatureFixtures.find((e) => e.kategori === kategori);
  return found ? found.sifat : DEFAULT_SIFAT;
}

export async function setSifatBeban(kategori: string, sifat: SifatBeban): Promise<ExpenseNatureEntry> {
  await delay(300);
  const existing = expenseNatureFixtures.find((e) => e.kategori === kategori);
  if (existing) {
    existing.sifat = sifat;
    return expenseNatureEntrySchema.parse(existing);
  }
  const entry = expenseNatureEntrySchema.parse({ kategori, sifat });
  expenseNatureFixtures.push(entry);
  return entry;
}
```

- [ ] **Step 4: Write the query hooks**

Create `src/lib/query/expense-nature.ts`:

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listExpenseNature, setSifatBeban } from "@/lib/data/expense-nature";
import type { SifatBeban } from "@/lib/schemas/expense-nature";

export function useExpenseNatureList() {
  return useQuery({ queryKey: ["expense-nature"], queryFn: listExpenseNature });
}

export function useSetSifatBeban() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kategori, sifat }: { kategori: string; sifat: SifatBeban }) =>
      setSifatBeban(kategori, sifat),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-nature"] });
      toast.success("Sifat beban kategori diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui sifat beban. Coba lagi.");
    },
  });
}
```

- [ ] **Step 5: Write the failing tests**

Create `src/lib/__tests__/expense-nature-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  listExpenseNature,
  getSifatBeban,
  setSifatBeban,
} from "@/lib/data/expense-nature";

describe("listExpenseNature", () => {
  it("returns seeded category mappings", async () => {
    const rows = await listExpenseNature();
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
});

describe("getSifatBeban — BR-14 defaults", () => {
  it("maps pajak to non_laba_rugi (PPh 23 / PPN are not expenses)", async () => {
    expect(await getSifatBeban("pajak")).toBe("non_laba_rugi");
  });

  it("maps penggajian to operasional, not hpp (avoids double count)", async () => {
    expect(await getSifatBeban("penggajian")).toBe("operasional");
  });

  it("falls back to operasional for unknown categories", async () => {
    expect(await getSifatBeban("Kategori Tak Dikenal")).toBe("operasional");
  });
});

describe("setSifatBeban", () => {
  it("updates an existing category mapping", async () => {
    const updated = await setSifatBeban("Operasional", "hpp");
    expect(updated.sifat).toBe("hpp");
    expect(await getSifatBeban("Operasional")).toBe("hpp");
  });

  it("inserts a mapping for a new category", async () => {
    const created = await setSifatBeban("Konsultan Eksternal", "hpp");
    expect(created.kategori).toBe("Konsultan Eksternal");
    expect(await getSifatBeban("Konsultan Eksternal")).toBe("hpp");
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/expense-nature-data.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/expense-nature.ts src/lib/fixtures/expense-nature.ts src/lib/data/expense-nature.ts src/lib/query/expense-nature.ts src/lib/__tests__/expense-nature-data.test.ts
git commit -m "feat(dasbor): add expense-nature flag data layer with BR-14 defaults + tests"
```

---

### Task 3: Pajak (PPh Badan) config module

Single configurable record driving the income-tax (PPh Badan) line of the P&L (spec §4.4). Method is **PPh Final 0.5% of revenue** (PP 55/2022) OR **PPh Badan 22% of taxable profit**; carries the Rp 4.8B/year threshold; when 22% is selected, accumulated PPh 23 credit is applied (the application itself happens in the engine, plan 2 — this task only stores the config).

**Files:**
- Create: `src/lib/schemas/pajak-config.ts`
- Create: `src/lib/fixtures/pajak-config.ts`
- Create: `src/lib/data/pajak-config.ts`
- Create: `src/lib/query/pajak-config.ts`
- Test: `src/lib/__tests__/pajak-config-data.test.ts`

**Interfaces:**
- Consumes: `delay` from `@/lib/data/_delay`.
- Produces:
  - `pphBadanMetode` (Zod enum `["final_05", "badan_22"]`), type `PphBadanMetode`
  - `pajakConfigSchema`, type `PajakConfig = { metode: PphBadanMetode; tarifFinalPersen: number; tarifBadanPersen: number; ambangOmzet: number }`
  - `pajakConfigFixture: PajakConfig` (default: `{ metode: "final_05", tarifFinalPersen: 0.5, tarifBadanPersen: 22, ambangOmzet: 4_800_000_000 }`)
  - `getPajakConfig(): Promise<PajakConfig>`
  - `updatePajakConfig(input: PajakConfig): Promise<PajakConfig>`
  - Hooks: `usePajakConfig`, `useUpdatePajakConfig`

- [ ] **Step 1: Write the schema**

Create `src/lib/schemas/pajak-config.ts`:

```ts
import { z } from "zod";

/** Income-tax (PPh Badan) computation method. */
export const pphBadanMetode = z.enum(["final_05", "badan_22"]);
export type PphBadanMetode = z.infer<typeof pphBadanMetode>;

export const pajakConfigSchema = z.object({
  metode: pphBadanMetode,
  /** PPh Final rate as a percent of revenue (PP 55/2022), e.g. 0.5. */
  tarifFinalPersen: z.number().nonnegative(),
  /** PPh Badan rate as a percent of taxable profit, e.g. 22. */
  tarifBadanPersen: z.number().nonnegative(),
  /** Annual revenue threshold (IDR) — Rp 4.8B. */
  ambangOmzet: z.number().nonnegative(),
});
export type PajakConfig = z.infer<typeof pajakConfigSchema>;
```

- [ ] **Step 2: Write the fixtures**

Create `src/lib/fixtures/pajak-config.ts`:

```ts
import type { PajakConfig } from "@/lib/schemas/pajak-config";

/** Mutable singleton holder so updates persist within the session. */
export const pajakConfigFixture: { current: PajakConfig } = {
  current: {
    metode: "final_05",
    tarifFinalPersen: 0.5,
    tarifBadanPersen: 22,
    ambangOmzet: 4_800_000_000,
  },
};
```

- [ ] **Step 3: Write the data layer**

Create `src/lib/data/pajak-config.ts`:

```ts
import { delay } from "@/lib/data/_delay";
import { pajakConfigFixture } from "@/lib/fixtures/pajak-config";
import { pajakConfigSchema, type PajakConfig } from "@/lib/schemas/pajak-config";

export async function getPajakConfig(): Promise<PajakConfig> {
  await delay();
  return pajakConfigSchema.parse(pajakConfigFixture.current);
}

export async function updatePajakConfig(input: PajakConfig): Promise<PajakConfig> {
  await delay(400);
  const parsed = pajakConfigSchema.parse(input);
  pajakConfigFixture.current = parsed;
  return parsed;
}
```

- [ ] **Step 4: Write the query hooks**

Create `src/lib/query/pajak-config.ts`:

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPajakConfig, updatePajakConfig } from "@/lib/data/pajak-config";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

export function usePajakConfig() {
  return useQuery({ queryKey: ["pajak-config"], queryFn: getPajakConfig });
}

export function useUpdatePajakConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PajakConfig) => updatePajakConfig(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pajak-config"] });
      toast.success("Konfigurasi pajak diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui konfigurasi pajak. Coba lagi.");
    },
  });
}
```

- [ ] **Step 5: Write the failing tests**

Create `src/lib/__tests__/pajak-config-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getPajakConfig, updatePajakConfig } from "@/lib/data/pajak-config";

describe("getPajakConfig", () => {
  it("defaults to PPh Final 0.5% with Rp 4.8B threshold", async () => {
    const cfg = await getPajakConfig();
    expect(cfg.metode).toBe("final_05");
    expect(cfg.tarifFinalPersen).toBe(0.5);
    expect(cfg.ambangOmzet).toBe(4_800_000_000);
  });
});

describe("updatePajakConfig", () => {
  it("switches to PPh Badan 22% and persists", async () => {
    const updated = await updatePajakConfig({
      metode: "badan_22",
      tarifFinalPersen: 0.5,
      tarifBadanPersen: 22,
      ambangOmzet: 4_800_000_000,
    });
    expect(updated.metode).toBe("badan_22");
    const again = await getPajakConfig();
    expect(again.metode).toBe("badan_22");
  });
});
```

> Note: tests share a module-level singleton; the `updatePajakConfig` test mutates it. Keep these two `describe` blocks in this file order so the default assertion runs first.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/pajak-config-data.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/pajak-config.ts src/lib/fixtures/pajak-config.ts src/lib/data/pajak-config.ts src/lib/query/pajak-config.ts src/lib/__tests__/pajak-config-data.test.ts
git commit -m "feat(dasbor): add PPh Badan config data layer + tests"
```

---

### Task 4: Kewajiban Pajak (tax obligations) module

Minimal Tax Center data — tax/BPJS obligations with due dates and settlement status — feeding the forecast engine's outflows (spec §5.3) and the alert engine's "due H-3 / overdue" + "PPh 23 bukti potong not collected" items (spec §5.4). The full Tax Center (EP-08) is its own epic; this is the slice the dashboard engines need.

**Files:**
- Create: `src/lib/schemas/kewajiban-pajak.ts`
- Create: `src/lib/fixtures/kewajiban-pajak.ts`
- Create: `src/lib/data/kewajiban-pajak.ts`
- Create: `src/lib/query/kewajiban-pajak.ts`
- Test: `src/lib/__tests__/kewajiban-pajak-data.test.ts`

**Interfaces:**
- Consumes: `delay` from `@/lib/data/_delay`.
- Produces:
  - `kewajibanJenis` (Zod enum `["ppn", "pph21", "pph23", "bpjs", "pph_badan"]`), type `KewajibanJenis`
  - `kewajibanStatus` (Zod enum `["belum_setor", "disetor"]`), type `KewajibanStatus`
  - `kewajibanPajakSchema`, type `KewajibanPajak = { id: string; jenis: KewajibanJenis; periode: string; jumlah: number; jatuhTempo: string; status: KewajibanStatus; buktiPotongDiterima: boolean; keterangan: string }`
  - `kewajibanPajakFixtures: KewajibanPajak[]`, `bumpSeq(): number`
  - `listKewajibanPajak(): Promise<KewajibanPajak[]>`
  - `setKewajibanStatus(id: string, status: KewajibanStatus): Promise<KewajibanPajak>`
  - Hooks: `useKewajibanPajakList`, `useSetKewajibanStatus`

> `buktiPotongDiterima` is meaningful only for `jenis === "pph23"` (whether the client's withholding slip has been received → tax credit secured). For other jenis it stays `true` (no slip concept), so the alert engine flags only un-received PPh 23 slips.

- [ ] **Step 1: Write the schema**

Create `src/lib/schemas/kewajiban-pajak.ts`:

```ts
import { z } from "zod";

export const kewajibanJenis = z.enum(["ppn", "pph21", "pph23", "bpjs", "pph_badan"]);
export type KewajibanJenis = z.infer<typeof kewajibanJenis>;

export const kewajibanStatus = z.enum(["belum_setor", "disetor"]);
export type KewajibanStatus = z.infer<typeof kewajibanStatus>;

export const kewajibanPajakSchema = z.object({
  id: z.string(),
  jenis: kewajibanJenis,
  /** Tax period, e.g. "2026-06". */
  periode: z.string(),
  jumlah: z.number().nonnegative(),
  jatuhTempo: z.string(),
  status: kewajibanStatus,
  /** PPh 23 withholding slip received (credit secured). Always true for non-pph23. */
  buktiPotongDiterima: z.boolean(),
  keterangan: z.string(),
});
export type KewajibanPajak = z.infer<typeof kewajibanPajakSchema>;
```

- [ ] **Step 2: Write the fixtures**

Create `src/lib/fixtures/kewajiban-pajak.ts`. Dates straddle the current date (today = 2026-06-22) so the alert engine has overdue, due-soon, and future items to surface:

```ts
import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";

let seq = 0;
function nextId(): string {
  return `KWP-${String(++seq).padStart(4, "0")}`;
}

export function bumpSeq(): number {
  return ++seq;
}

export const kewajibanPajakFixtures: KewajibanPajak[] = [
  {
    id: nextId(), jenis: "ppn", periode: "2026-05", jumlah: 12_500_000,
    jatuhTempo: "2026-06-15", status: "belum_setor", buktiPotongDiterima: true,
    keterangan: "PPN Masa Mei 2026 — terlambat",
  },
  {
    id: nextId(), jenis: "pph21", periode: "2026-05", jumlah: 4_200_000,
    jatuhTempo: "2026-06-10", status: "disetor", buktiPotongDiterima: true,
    keterangan: "PPh 21 Masa Mei 2026",
  },
  {
    id: nextId(), jenis: "bpjs", periode: "2026-06", jumlah: 3_800_000,
    jatuhTempo: "2026-06-24", status: "belum_setor", buktiPotongDiterima: true,
    keterangan: "BPJS Juni 2026 — jatuh tempo H-2",
  },
  {
    id: nextId(), jenis: "pph23", periode: "2026-05", jumlah: 2_000_000,
    jatuhTempo: "2026-06-20", status: "belum_setor", buktiPotongDiterima: false,
    keterangan: "PPh 23 dipotong klien — bukti potong belum diterima",
  },
  {
    id: nextId(), jenis: "ppn", periode: "2026-06", jumlah: 9_750_000,
    jatuhTempo: "2026-07-15", status: "belum_setor", buktiPotongDiterima: true,
    keterangan: "PPN Masa Juni 2026 — mendatang",
  },
];
```

- [ ] **Step 3: Write the data layer**

Create `src/lib/data/kewajiban-pajak.ts`:

```ts
import { delay } from "@/lib/data/_delay";
import { kewajibanPajakFixtures } from "@/lib/fixtures/kewajiban-pajak";
import {
  kewajibanPajakSchema,
  type KewajibanPajak,
  type KewajibanStatus,
} from "@/lib/schemas/kewajiban-pajak";

export async function listKewajibanPajak(): Promise<KewajibanPajak[]> {
  await delay();
  return kewajibanPajakSchema.array().parse(kewajibanPajakFixtures);
}

export async function setKewajibanStatus(id: string, status: KewajibanStatus): Promise<KewajibanPajak> {
  await delay(300);
  const item = kewajibanPajakFixtures.find((k) => k.id === id);
  if (!item) throw new Error(`Kewajiban ${id} tidak ditemukan.`);
  item.status = status;
  return kewajibanPajakSchema.parse(item);
}
```

- [ ] **Step 4: Write the query hooks**

Create `src/lib/query/kewajiban-pajak.ts`:

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listKewajibanPajak, setKewajibanStatus } from "@/lib/data/kewajiban-pajak";
import type { KewajibanStatus } from "@/lib/schemas/kewajiban-pajak";

export function useKewajibanPajakList() {
  return useQuery({ queryKey: ["kewajiban-pajak"], queryFn: listKewajibanPajak });
}

export function useSetKewajibanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: KewajibanStatus }) =>
      setKewajibanStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kewajiban-pajak"] });
      toast.success("Status kewajiban pajak diperbarui.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status.");
    },
  });
}
```

- [ ] **Step 5: Write the failing tests**

Create `src/lib/__tests__/kewajiban-pajak-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { listKewajibanPajak, setKewajibanStatus } from "@/lib/data/kewajiban-pajak";

describe("listKewajibanPajak", () => {
  it("returns seeded obligations", async () => {
    const rows = await listKewajibanPajak();
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it("includes an unsettled PPh 23 with bukti potong not yet received", async () => {
    const rows = await listKewajibanPajak();
    const pph23 = rows.find((k) => k.jenis === "pph23");
    expect(pph23).toBeDefined();
    expect(pph23!.buktiPotongDiterima).toBe(false);
  });

  it("includes both overdue and future due dates relative to 2026-06-22", async () => {
    const rows = await listKewajibanPajak();
    expect(rows.some((k) => k.jatuhTempo < "2026-06-22")).toBe(true);
    expect(rows.some((k) => k.jatuhTempo > "2026-06-22")).toBe(true);
  });
});

describe("setKewajibanStatus", () => {
  it("marks an obligation as disetor", async () => {
    const rows = await listKewajibanPajak();
    const target = rows.find((k) => k.status === "belum_setor")!;
    const updated = await setKewajibanStatus(target.id, "disetor");
    expect(updated.status).toBe("disetor");
  });

  it("throws for unknown id", async () => {
    await expect(setKewajibanStatus("KWP-9999", "disetor")).rejects.toThrow("tidak ditemukan");
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/kewajiban-pajak-data.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 7: Run the full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors. (Confirms the four new modules integrate without breaking existing tests.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas/kewajiban-pajak.ts src/lib/fixtures/kewajiban-pajak.ts src/lib/data/kewajiban-pajak.ts src/lib/query/kewajiban-pajak.ts src/lib/__tests__/kewajiban-pajak-data.test.ts
git commit -m "feat(dasbor): add tax-obligations (Tax Center slice) data layer + tests"
```

---

## What this plan deliberately defers (to plans 2–5)

- **Revenue recognition rule (§4.3):** a computation, not stored data — lives in the Profitability Engine (plan 2). Revenue = invoice service value ex-PPN at issuance; PPh 23 is NOT subtracted.
- **The three engines (§5):** Profitability (plan 2), Forecast + Alert (plan 3) — pure functions consuming this plan's outputs.
- **Surfaces (§6):** Owner Command Center + charts/drilldown (plan 4), role switcher + per-role filtering (plan 5).
- **Realisasi RAB entry UI** (where it lives in Project detail per open item §9) — plan 4.
- **Settings UI** for expense-nature map and pajak-config edits — plan 4.

## Self-Review

- **Spec coverage (this plan's slice = §4 + data prereqs for §5):** §4.1 Realisasi RAB → Task 1 ✓; §4.2 expense-nature flag → Task 2 ✓; §4.4 income-tax config → Task 3 ✓; tax due-dates + PPh 23 bukti-potong needed by §5.3/§5.4 → Task 4 ✓. §4.3 revenue recognition correctly deferred (it is computation, not storage) and noted. BR-14 enforced via Task 2 defaults + test.
- **Placeholder scan:** no TBD/TODO; every code step shows complete content; every test step shows full assertions; every command has expected output.
- **Type consistency:** `bumpSeq()` used identically in Tasks 1 & 4; `delay`/`delay(ms)` matches `_delay` usage; enum member names (`personil`/`langsung`, `hpp`/`operasional`/`non_laba_rugi`, `final_05`/`badan_22`, `belum_setor`/`disetor`) are referenced identically in fixtures, data, and tests; `RealisasiRabFormValues` omits `id` and matches the `createRealisasiRab` signature.
