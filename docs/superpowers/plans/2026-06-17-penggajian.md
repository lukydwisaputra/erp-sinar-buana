# Penggajian (Payroll) Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Penggajian module — batch payroll run, inline-editable slip table, slip document builder, and status workflow (menunggu_pembayaran → sudah_dibayar).

**Architecture:** `PenggajianBatch` embeds `SlipGaji[]` (same pattern as Proyek/milestones). Data layer in `src/lib/data/penggajian.ts`, query hooks in `src/lib/query/penggajian.ts`. Four pages: batch list, create (two-phase: select → inline table), batch detail (inline table with save-on-blur), slip document (read-only, printable). Derived fields (gajiPokokEfektif, penggajianKotor, penggajianBersih) are computed on-the-fly via `calcSlip()`, not stored.

**Tech Stack:** TypeScript · Next.js App Router (client pages, useParams) · TanStack Query · Zod · shadcn/ui (DataTable, Badge, Button, AlertDialog, Checkbox) · `formatRupiah`/`formatRupiahCompact` · Lucide · Vitest · `DocumentPage` + `DocumentLetterhead` (existing shared components)

**Spec:** [docs/superpowers/specs/2026-06-17-penggajian-design.md](../specs/2026-06-17-penggajian-design.md)

## Global Constraints

- All UI copy in Bahasa Indonesia; money in IDR (`formatRupiah` / `formatRupiahCompact`)
- Inline number inputs: `type="number"`, `min={0}`; save on blur (same pattern as milestone rows)
- `pph21` may be 0 — do not reject (BR-3)
- `penggajianBersih` must be ≥ 0; show red if negative, disable "Simpan" button
- Slips locked (all fields read-only) once `sudah_dibayar`
- Arus Kas: stub log only — `ArusKasLogEntry` in-memory store, not wired to Arus Kas module
- Existing 82 passing tests must stay passing; current 3 failures are pre-existing (do not fix)
- Follow `encodeKaryawan` / hashids pattern from `src/lib/id-generator.ts` for IDs
- Pages are **client components** using `useParams` (same pattern as `src/app/(app)/proyek/[id]/page.tsx`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/schemas/penggajian.ts` | CREATE | Zod schemas + `calcSlip()` helper |
| `src/lib/fixtures/penggajian.ts` | CREATE | Two seed batches with 5+3 slips |
| `src/lib/data/penggajian.ts` | CREATE | Data functions + arus kas log store |
| `src/lib/query/penggajian.ts` | CREATE | TanStack Query hooks |
| `src/lib/__tests__/penggajian-data.test.ts` | CREATE | Data layer tests (TDD) |
| `src/app/(app)/penggajian/page.tsx` | REPLACE | Batch list (replaces placeholder) |
| `src/app/(app)/penggajian/baru/page.tsx` | CREATE | Create page wrapper |
| `src/app/(app)/penggajian/[batchId]/page.tsx` | CREATE | Batch detail page wrapper |
| `src/app/(app)/penggajian/[batchId]/[slipId]/page.tsx` | CREATE | Slip document page wrapper |
| `src/components/penggajian/penggajian-create.tsx` | CREATE | Two-phase create form + inline table |
| `src/components/penggajian/penggajian-batch.tsx` | CREATE | Batch detail inline table + actions |
| `src/components/penggajian/slip-builder.tsx` | CREATE | Slip document wrapper + toolbar |
| `src/components/penggajian/slip-document.tsx` | CREATE | Printable slip content |

---

## Task 1: Schema + Failing Tests (TDD)

**Files:**
- Create: `src/lib/schemas/penggajian.ts`
- Create: `src/lib/__tests__/penggajian-data.test.ts`

**Interfaces:**
- Produces: `SlipGaji`, `SlipStatus`, `PenggajianBatch` types; `calcSlip(slip)` → `{ gajiPokokEfektif, penggajianKotor, penggajianBersih }`

- [ ] **Step 1: Create schema**

Create `src/lib/schemas/penggajian.ts`:

```ts
import { z } from "zod";

export const slipStatus = z.enum(["menunggu_pembayaran", "sudah_dibayar"]);

export const slipGajiSchema = z.object({
  id: z.string(),
  batchId: z.string(),

  karyawanId: z.string(),
  karyawanNama: z.string(),
  jabatan: z.string(),
  statusKepegawaian: z.enum(["tetap", "kontrak", "probation"]),
  pengali: z.number(),
  gajiPokok: z.number(),
  tunjangan: z.number().min(0),

  lembur: z.number().min(0),
  bonus: z.number().min(0),
  pph21: z.number().min(0),
  bpjsPotongan: z.number().min(0),

  bankNama: z.string(),
  bankNomor: z.string(),
  bankAtasNama: z.string(),

  status: slipStatus,
  paidAt: z.string().nullable(),
});

export const penggajianBatchSchema = z.object({
  id: z.string(),
  periode: z.object({
    mulai: z.string(),
    selesai: z.string(),
  }),
  slips: z.array(slipGajiSchema),
  createdAt: z.string(),
});

export type SlipGaji = z.infer<typeof slipGajiSchema>;
export type SlipStatus = z.infer<typeof slipStatus>;
export type PenggajianBatch = z.infer<typeof penggajianBatchSchema>;

export function calcSlip(slip: Pick<SlipGaji, "gajiPokok" | "pengali" | "tunjangan" | "lembur" | "bonus" | "pph21" | "bpjsPotongan">) {
  const gajiPokokEfektif = slip.gajiPokok * slip.pengali;
  const penggajianKotor = gajiPokokEfektif + slip.tunjangan + slip.lembur + slip.bonus;
  const penggajianBersih = penggajianKotor - slip.pph21 - slip.bpjsPotongan;
  return { gajiPokokEfektif, penggajianKotor, penggajianBersih };
}
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/__tests__/penggajian-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  listBatch, getBatch, getSlip, createBatch, updateSlip, markSlipDibayar,
  listArusKasLog,
} from "@/lib/data/penggajian";
import { calcSlip } from "@/lib/schemas/penggajian";

describe("listBatch", () => {
  it("returns all seeded batches", async () => {
    const rows = await listBatch();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]).toMatchObject({ id: expect.any(String), slips: expect.any(Array) });
  });
});

describe("getBatch", () => {
  it("returns batch with embedded slips", async () => {
    const b = await getBatch("GAJ-001");
    expect(b?.id).toBe("GAJ-001");
    expect(b!.slips.length).toBeGreaterThanOrEqual(1);
  });
  it("returns null for unknown id", async () => {
    expect(await getBatch("NOPE")).toBeNull();
  });
});

describe("getSlip", () => {
  it("returns correct slip", async () => {
    const b = await getBatch("GAJ-001");
    const slipId = b!.slips[0].id;
    const slip = await getSlip("GAJ-001", slipId);
    expect(slip?.id).toBe(slipId);
    expect(slip?.batchId).toBe("GAJ-001");
  });
  it("returns null for unknown slip", async () => {
    expect(await getSlip("GAJ-001", "NOPE")).toBeNull();
  });
});

describe("updateSlip", () => {
  it("patches editable fields", async () => {
    const b = await getBatch("GAJ-001");
    const pending = b!.slips.find((s) => s.status === "menunggu_pembayaran")!;
    await updateSlip("GAJ-001", pending.id, { lembur: 500_000, bonus: 200_000 });
    const updated = await getSlip("GAJ-001", pending.id);
    expect(updated?.lembur).toBe(500_000);
    expect(updated?.bonus).toBe(200_000);
  });
  it("throws if slip is sudah_dibayar", async () => {
    const b = await getBatch("GAJ-001");
    const paid = b!.slips.find((s) => s.status === "sudah_dibayar")!;
    await expect(updateSlip("GAJ-001", paid.id, { lembur: 1 })).rejects.toThrow();
  });
});

describe("markSlipDibayar", () => {
  it("sets status to sudah_dibayar and sets paidAt", async () => {
    const b = await getBatch("GAJ-002");
    const slipId = b!.slips[0].id;
    await markSlipDibayar("GAJ-002", slipId);
    const slip = await getSlip("GAJ-002", slipId);
    expect(slip?.status).toBe("sudah_dibayar");
    expect(slip?.paidAt).not.toBeNull();
  });
  it("appends an arus kas log entry", async () => {
    const b = await getBatch("GAJ-002");
    const slipId = b!.slips[1].id;
    await markSlipDibayar("GAJ-002", slipId);
    const log = await listArusKasLog();
    expect(log.some((e) => e.slipId === slipId)).toBe(true);
    expect(log.find((e) => e.slipId === slipId)?.kategori).toBe("penggajian");
  });
  it("throws if slip is already sudah_dibayar", async () => {
    const b = await getBatch("GAJ-001");
    const paid = b!.slips.find((s) => s.status === "sudah_dibayar")!;
    await expect(markSlipDibayar("GAJ-001", paid.id)).rejects.toThrow();
  });
});

describe("createBatch", () => {
  it("creates a batch with generated id and slips as menunggu_pembayaran", async () => {
    const b = await getBatch("GAJ-001");
    const slip = b!.slips[0];
    const result = await createBatch({
      periode: { mulai: "2026-05-24", selesai: "2026-06-24" },
      slips: [{
        karyawanId: slip.karyawanId,
        karyawanNama: slip.karyawanNama,
        jabatan: slip.jabatan,
        statusKepegawaian: slip.statusKepegawaian,
        pengali: slip.pengali,
        gajiPokok: slip.gajiPokok,
        tunjangan: slip.tunjangan,
        lembur: 0,
        bonus: 0,
        pph21: 0,
        bpjsPotongan: 0,
        bankNama: slip.bankNama,
        bankNomor: slip.bankNomor,
        bankAtasNama: slip.bankAtasNama,
      }],
    });
    expect(result.id).toMatch(/^GAJ-/);
    expect(result.slips[0].status).toBe("menunggu_pembayaran");
    expect(result.slips[0].paidAt).toBeNull();
  });
});

describe("calcSlip", () => {
  it("calculates correctly for probation (pengali 0.8)", () => {
    const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip({
      gajiPokok: 6_500_000, pengali: 0.8,
      tunjangan: 800_000, lembur: 0, bonus: 0,
      pph21: 0, bpjsPotongan: 0,
    });
    expect(gajiPokokEfektif).toBe(5_200_000);
    expect(penggajianKotor).toBe(6_000_000);
    expect(penggajianBersih).toBe(6_000_000);
  });
  it("pph21=0 is valid — bersih equals kotor", () => {
    const { penggajianBersih } = calcSlip({
      gajiPokok: 5_000_000, pengali: 1,
      tunjangan: 0, lembur: 0, bonus: 0,
      pph21: 0, bpjsPotongan: 0,
    });
    expect(penggajianBersih).toBe(5_000_000);
  });
  it("accounts for lembur and bonus in kotor", () => {
    const { penggajianKotor } = calcSlip({
      gajiPokok: 10_000_000, pengali: 1,
      tunjangan: 1_000_000, lembur: 500_000, bonus: 250_000,
      pph21: 0, bpjsPotongan: 0,
    });
    expect(penggajianKotor).toBe(11_750_000);
  });
});
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
npm test -- penggajian-data
```

Expected: all fail with `Cannot find module '@/lib/data/penggajian'`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/penggajian.ts src/lib/__tests__/penggajian-data.test.ts
git commit -m "test(penggajian): failing tests + schema"
```

---

## Task 2: Fixtures + Data Layer

**Files:**
- Create: `src/lib/fixtures/penggajian.ts`
- Create: `src/lib/data/penggajian.ts`

**Interfaces:**
- Consumes: `penggajianBatchSchema`, `slipGajiSchema`, `calcSlip` from `@/lib/schemas/penggajian`; `karyawanFixtures` from `@/lib/fixtures/karyawan`; `delay` from `@/lib/data/_delay`
- Produces:
  - `listBatch(): Promise<PenggajianBatch[]>`
  - `getBatch(id: string): Promise<PenggajianBatch | null>`
  - `getSlip(batchId: string, slipId: string): Promise<SlipGaji | null>`
  - `createBatch(input: CreateBatchInput): Promise<PenggajianBatch>`
  - `updateSlip(batchId: string, slipId: string, patch: SlipEditFields): Promise<SlipGaji>`
  - `markSlipDibayar(batchId: string, slipId: string): Promise<SlipGaji>`
  - `listArusKasLog(): Promise<ArusKasLogEntry[]>`
  - `CreateBatchInput`, `SlipEditFields`, `ArusKasLogEntry` types

- [ ] **Step 1: Create fixtures**

Create `src/lib/fixtures/penggajian.ts`:

```ts
import type { PenggajianBatch } from "@/lib/schemas/penggajian";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";

function makeSlip(
  slipNum: number,
  batchId: string,
  kIdx: number,
  overrides: {
    lembur?: number; bonus?: number; pph21?: number; bpjsPotongan?: number;
    status?: "menunggu_pembayaran" | "sudah_dibayar"; paidAt?: string | null;
  } = {},
) {
  const k = karyawanFixtures[kIdx];
  return {
    id: `SLP-${String(slipNum).padStart(3, "0")}`,
    batchId,
    karyawanId: k.id,
    karyawanNama: k.nama,
    jabatan: k.jabatan,
    statusKepegawaian: k.statusKepegawaian,
    pengali: k.pengali,
    gajiPokok: k.gajiPokok,
    tunjangan: k.tunjangan,
    lembur: overrides.lembur ?? 0,
    bonus: overrides.bonus ?? 0,
    pph21: overrides.pph21 ?? 0,
    bpjsPotongan: overrides.bpjsPotongan ?? 0,
    bankNama: k.bank.nama,
    bankNomor: k.bank.nomor,
    bankAtasNama: k.bank.atasNama,
    status: overrides.status ?? ("menunggu_pembayaran" as const),
    paidAt: overrides.paidAt ?? null,
  };
}

export const penggajianFixtures: PenggajianBatch[] = [
  {
    id: "GAJ-001",
    periode: { mulai: "2026-03-24", selesai: "2026-04-24" },
    createdAt: "2026-04-25T08:00:00.000Z",
    slips: [
      // kIdx 0 = Budi Santoso (Direktur, tetap, 25jt)
      makeSlip(1, "GAJ-001", 0, { pph21: 1_500_000, bpjsPotongan: 250_000, status: "sudah_dibayar", paidAt: "2026-04-25T09:00:00.000Z" }),
      // kIdx 1 = Rina Marlina (Manajer Keuangan, tetap, 14jt)
      makeSlip(2, "GAJ-001", 1, { pph21: 500_000, bpjsPotongan: 140_000, status: "sudah_dibayar", paidAt: "2026-04-25T09:05:00.000Z" }),
      // kIdx 2 = Agus Setiawan (Ketua Tim Teknis, tetap, 12jt)
      makeSlip(3, "GAJ-001", 2, { pph21: 300_000, bpjsPotongan: 120_000 }),
      // kIdx 3 = Dewi Anggraini (Anggota Tim Teknis, kontrak, 8.5jt)
      makeSlip(4, "GAJ-001", 3, { lembur: 500_000, bpjsPotongan: 85_000 }),
      // kIdx 4 = Fajar Ramadhan (Pengendali Dokumen, probation, 0.8x, 6.5jt)
      makeSlip(5, "GAJ-001", 4, {}),
    ],
  },
  {
    id: "GAJ-002",
    periode: { mulai: "2026-04-24", selesai: "2026-05-24" },
    createdAt: "2026-05-25T08:00:00.000Z",
    slips: [
      // kIdx 6 = Hendra Permana (Ahli AMDAL Senior, tetap, 18jt)
      makeSlip(6, "GAJ-002", 6, { pph21: 800_000, bpjsPotongan: 180_000 }),
      // kIdx 8 = Rizky Firmansyah (Insinyur Teknik, tetap, 13jt)
      makeSlip(7, "GAJ-002", 8, { bpjsPotongan: 130_000 }),
      // kIdx 9 = Yuli Astuti (Staf Administrasi, probation, 0.8x, 5.5jt)
      makeSlip(8, "GAJ-002", 9, {}),
    ],
  },
];
```

- [ ] **Step 2: Create data layer**

Create `src/lib/data/penggajian.ts`:

```ts
import { delay } from "@/lib/data/_delay";
import { penggajianFixtures } from "@/lib/fixtures/penggajian";
import {
  penggajianBatchSchema, slipGajiSchema, calcSlip,
  type PenggajianBatch, type SlipGaji,
} from "@/lib/schemas/penggajian";

export type SlipEditFields = {
  tunjangan?: number;
  lembur?: number;
  bonus?: number;
  pph21?: number;
  bpjsPotongan?: number;
};

export type CreateBatchInput = {
  periode: { mulai: string; selesai: string };
  slips: Omit<SlipGaji, "id" | "batchId" | "status" | "paidAt">[];
};

export type ArusKasLogEntry = {
  id: string;
  slipId: string;
  batchId: string;
  karyawanNama: string;
  jumlah: number;
  timestamp: string;
  kategori: "penggajian";
};

const arusKasLog: ArusKasLogEntry[] = [];
let _arusKasId = 1;
let _batchSeq = 3;
let _slipSeq = 9;

function appendArusKas(slip: SlipGaji, batchId: string) {
  const { penggajianBersih } = calcSlip(slip);
  arusKasLog.push({
    id: `AKS-${String(_arusKasId++).padStart(4, "0")}`,
    slipId: slip.id,
    batchId,
    karyawanNama: slip.karyawanNama,
    jumlah: penggajianBersih,
    timestamp: new Date().toISOString(),
    kategori: "penggajian",
  });
}

export async function listBatch(): Promise<PenggajianBatch[]> {
  await delay();
  return penggajianBatchSchema.array().parse(penggajianFixtures);
}

export async function getBatch(id: string): Promise<PenggajianBatch | null> {
  await delay(300);
  const b = penggajianFixtures.find((b) => b.id === id);
  return b ? penggajianBatchSchema.parse(b) : null;
}

export async function getSlip(batchId: string, slipId: string): Promise<SlipGaji | null> {
  await delay(200);
  const b = penggajianFixtures.find((b) => b.id === batchId);
  if (!b) return null;
  const s = b.slips.find((s) => s.id === slipId);
  return s ? slipGajiSchema.parse(s) : null;
}

export async function createBatch(input: CreateBatchInput): Promise<PenggajianBatch> {
  await delay(400);
  const batchId = `GAJ-${String(_batchSeq++).padStart(3, "0")}`;
  const slips: SlipGaji[] = input.slips.map((s) => ({
    ...s,
    id: `SLP-${String(_slipSeq++).padStart(3, "0")}`,
    batchId,
    status: "menunggu_pembayaran" as const,
    paidAt: null,
  }));
  const batch: PenggajianBatch = {
    id: batchId,
    periode: input.periode,
    slips,
    createdAt: new Date().toISOString(),
  };
  penggajianFixtures.push(penggajianBatchSchema.parse(batch));
  return penggajianBatchSchema.parse(penggajianFixtures[penggajianFixtures.length - 1]);
}

export async function updateSlip(
  batchId: string,
  slipId: string,
  patch: SlipEditFields,
): Promise<SlipGaji> {
  await delay(200);
  const bIdx = penggajianFixtures.findIndex((b) => b.id === batchId);
  if (bIdx === -1) throw new Error(`Batch ${batchId} not found`);
  const sIdx = penggajianFixtures[bIdx].slips.findIndex((s) => s.id === slipId);
  if (sIdx === -1) throw new Error(`Slip ${slipId} not found`);
  const current = penggajianFixtures[bIdx].slips[sIdx];
  if (current.status === "sudah_dibayar") throw new Error("Slip sudah dibayar, tidak dapat diubah.");
  const updated = { ...current, ...patch };
  const slips = [...penggajianFixtures[bIdx].slips];
  slips[sIdx] = updated;
  penggajianFixtures[bIdx] = { ...penggajianFixtures[bIdx], slips };
  return slipGajiSchema.parse(updated);
}

export async function markSlipDibayar(batchId: string, slipId: string): Promise<SlipGaji> {
  await delay(300);
  const bIdx = penggajianFixtures.findIndex((b) => b.id === batchId);
  if (bIdx === -1) throw new Error(`Batch ${batchId} not found`);
  const sIdx = penggajianFixtures[bIdx].slips.findIndex((s) => s.id === slipId);
  if (sIdx === -1) throw new Error(`Slip ${slipId} not found`);
  const current = penggajianFixtures[bIdx].slips[sIdx];
  if (current.status === "sudah_dibayar") throw new Error("Slip sudah dibayar.");
  const updated: SlipGaji = { ...current, status: "sudah_dibayar", paidAt: new Date().toISOString() };
  const slips = [...penggajianFixtures[bIdx].slips];
  slips[sIdx] = updated;
  penggajianFixtures[bIdx] = { ...penggajianFixtures[bIdx], slips };
  appendArusKas(updated, batchId);
  return slipGajiSchema.parse(updated);
}

export async function listArusKasLog(): Promise<ArusKasLogEntry[]> {
  await delay(100);
  return [...arusKasLog];
}
```

- [ ] **Step 3: Run penggajian tests — confirm they pass**

```bash
npm test -- penggajian-data
```

Expected: all 12 penggajian tests pass.

- [ ] **Step 4: Run full suite — confirm no regressions**

```bash
npm test
```

Expected: 82 + 12 = 94 passing (3 pre-existing failures unchanged).

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: exit 0, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fixtures/penggajian.ts src/lib/data/penggajian.ts
git commit -m "feat(penggajian): data layer — fixtures, data functions, tests pass"
```

---

## Task 3: Query Hooks

**Files:**
- Create: `src/lib/query/penggajian.ts`

**Interfaces:**
- Consumes: all functions from `@/lib/data/penggajian`; types from `@/lib/schemas/penggajian`
- Produces:
  - `useBatchList()` → `UseQueryResult<PenggajianBatch[]>`
  - `useBatch(id: string)` → `UseQueryResult<PenggajianBatch | null>`
  - `useSlip(batchId: string, slipId: string)` → `UseQueryResult<SlipGaji | null>`
  - `useCreateBatch()` → mutation returning `PenggajianBatch`
  - `useUpdateSlip()` → mutation accepting `{ batchId, slipId, patch: SlipEditFields }`
  - `useMarkSlipDibayar()` → mutation accepting `{ batchId, slipId }`

- [ ] **Step 1: Create query hooks**

Create `src/lib/query/penggajian.ts`:

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listBatch, getBatch, getSlip, createBatch, updateSlip, markSlipDibayar,
  type CreateBatchInput, type SlipEditFields,
} from "@/lib/data/penggajian";

export function useBatchList() {
  return useQuery({ queryKey: ["penggajian"], queryFn: listBatch });
}

export function useBatch(id: string) {
  return useQuery({ queryKey: ["penggajian", id], queryFn: () => getBatch(id) });
}

export function useSlip(batchId: string, slipId: string) {
  return useQuery({
    queryKey: ["penggajian", batchId, slipId],
    queryFn: () => getSlip(batchId, slipId),
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBatchInput) => createBatch(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["penggajian"] }); },
    onError: () => { toast.error("Gagal membuat penggajian. Coba lagi."); },
  });
}

export function useUpdateSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, slipId, patch }: {
      batchId: string; slipId: string; patch: SlipEditFields;
    }) => updateSlip(batchId, slipId, patch),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
    },
    onError: () => { toast.error("Gagal menyimpan perubahan. Coba lagi."); },
  });
}

export function useMarkSlipDibayar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, slipId }: { batchId: string; slipId: string }) =>
      markSlipDibayar(batchId, slipId),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
      qc.invalidateQueries({ queryKey: ["penggajian"] });
    },
    onError: () => { toast.error("Gagal menandai dibayar. Coba lagi."); },
  });
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/query/penggajian.ts
git commit -m "feat(penggajian): query hooks"
```

---

## Task 4: Batch List Page

**Files:**
- Replace: `src/app/(app)/penggajian/page.tsx`

**Interfaces:**
- Consumes: `useBatchList` from `@/lib/query/penggajian`; `PenggajianBatch` type

- [ ] **Step 1: Replace the placeholder page**

Replace all contents of `src/app/(app)/penggajian/page.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Wallet, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBatchList } from "@/lib/query/penggajian";
import type { PenggajianBatch } from "@/lib/schemas/penggajian";

function periodStr(p: PenggajianBatch["periode"]) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(p.mulai)} – ${fmt(p.selesai)}`;
}

export default function PenggajianPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useBatchList();

  const columns: ColumnDef<PenggajianBatch>[] = [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button"
          onClick={() => router.push(`/penggajian/${row.original.id}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "periode", header: "Periode",
      cell: ({ row }) => periodStr(row.original.periode),
    },
    {
      id: "jumlahKaryawan", header: "Karyawan",
      cell: ({ row }) => row.original.slips.length,
    },
    {
      id: "sudahDibayar", header: "Sudah Dibayar",
      cell: ({ row }) => {
        const paid = row.original.slips.filter((s) => s.status === "sudah_dibayar").length;
        const total = row.original.slips.length;
        const all = paid === total;
        return (
          <Badge variant={all ? "success" : paid > 0 ? "warning" : "secondary"}>
            {paid}/{total}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt", header: "Dibuat",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("id-ID", {
          day: "numeric", month: "long", year: "numeric",
        }),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Penggajian</h1>
        </div>
        <Button size="sm" onClick={() => router.push("/penggajian/baru")}>
          <Plus className="size-4 mr-1.5" /> Buat Penggajian
        </Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="id"
          searchPlaceholder="Cari ID penggajian…"
          emptyMessage="Belum ada penggajian"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/penggajian/page.tsx"
git commit -m "feat(penggajian): batch list page"
```

---

## Task 5: Create Page

**Files:**
- Create: `src/components/penggajian/penggajian-create.tsx`
- Create: `src/app/(app)/penggajian/baru/page.tsx`

**Interfaces:**
- Consumes: `useCreateBatch` from `@/lib/query/penggajian`; `karyawanFixtures` from `@/lib/fixtures/karyawan`; `calcSlip` from `@/lib/schemas/penggajian`; `formatRupiahCompact` from `@/lib/format`; `SectionLabel` from `@/components/shared/detail-drawer`

- [ ] **Step 1: Create the PenggajianCreate component**

Create `src/components/penggajian/penggajian-create.tsx`:

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiahCompact } from "@/lib/format";
import { calcSlip } from "@/lib/schemas/penggajian";
import { useCreateBatch } from "@/lib/query/penggajian";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";

const activeKaryawan = karyawanFixtures.filter((k) => k.status === "aktif");

type SlipRow = {
  karyawanId: string;
  tunjangan: number;
  lembur: number;
  bonus: number;
  pph21: number;
  bpjsPotongan: number;
};

function makeDefaultRow(karyawanId: string): SlipRow {
  const k = activeKaryawan.find((k) => k.id === karyawanId)!;
  return { karyawanId, tunjangan: k.tunjangan, lembur: 0, bonus: 0, pph21: 0, bpjsPotongan: 0 };
}

const colGrid = "160px 100px 90px 80px 80px 90px 90px 110px 110px";
const inputCls =
  "w-full rounded px-1.5 py-0.5 text-right text-sm font-mono bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors";

export function PenggajianCreate() {
  const router = useRouter();
  const createBatch = useCreateBatch();

  const [mulai, setMulai] = React.useState("");
  const [selesai, setSelesai] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [phase, setPhase] = React.useState<"select" | "table">("select");
  const [rows, setRows] = React.useState<SlipRow[]>([]);

  const toggleKaryawan = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleLanjut = () => {
    setRows(selectedIds.map(makeDefaultRow));
    setPhase("table");
  };

  const updateRow = (idx: number, patch: Partial<SlipRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const numInput = (val: number, onChange: (v: number) => void) => (
    <input
      type="number"
      min={0}
      value={val === 0 ? "" : val}
      placeholder="0"
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className={inputCls}
    />
  );

  const rowsValid = rows.every((row) => {
    const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
    const { penggajianBersih } = calcSlip({ ...k, ...row });
    return penggajianBersih >= 0;
  });

  const handleSimpan = async () => {
    const slips = rows.map((row) => {
      const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
      return {
        karyawanId: k.id, karyawanNama: k.nama, jabatan: k.jabatan,
        statusKepegawaian: k.statusKepegawaian, pengali: k.pengali, gajiPokok: k.gajiPokok,
        tunjangan: row.tunjangan, lembur: row.lembur, bonus: row.bonus,
        pph21: row.pph21, bpjsPotongan: row.bpjsPotongan,
        bankNama: k.bank.nama, bankNomor: k.bank.nomor, bankAtasNama: k.bank.atasNama,
      };
    });
    const batch = await createBatch.mutateAsync({ periode: { mulai, selesai }, slips });
    router.push(`/penggajian/${batch.id}`);
  };

  const periodeValid = mulai && selesai && mulai <= selesai;
  const canLanjut = !!periodeValid && selectedIds.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Buat Penggajian</h1>
        </div>
      </div>

      <div className="space-y-4">
        <section>
          <SectionLabel>Periode</SectionLabel>
          <div className="flex items-center gap-3">
            <Input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className="w-44" />
            <span className="text-muted-foreground text-sm">–</span>
            <Input type="date" value={selesai} onChange={(e) => setSelesai(e.target.value)} className="w-44" />
          </div>
        </section>

        <section>
          <SectionLabel>Pilih Karyawan</SectionLabel>
          <div className="space-y-2">
            {activeKaryawan.map((k) => (
              <label key={k.id} className="flex cursor-pointer items-center gap-2.5">
                <Checkbox checked={selectedIds.includes(k.id)} onCheckedChange={() => toggleKaryawan(k.id)} />
                <span className="text-sm font-medium">{k.nama}</span>
                <span className="text-xs text-muted-foreground">{k.jabatan}</span>
                <Badge
                  variant={k.statusKepegawaian === "tetap" ? "success" : k.statusKepegawaian === "kontrak" ? "info" : "warning"}
                  className="ml-auto text-xs"
                >
                  {k.statusKepegawaian} ×{k.pengali}
                </Badge>
              </label>
            ))}
          </div>
        </section>

        {phase === "select" && (
          <Button disabled={!canLanjut} onClick={handleLanjut}>
            Lanjut <ChevronRight className="size-4 ml-1" />
          </Button>
        )}
      </div>

      {phase === "table" && (
        <div className="space-y-3">
          <SectionLabel>Komponen Gaji</SectionLabel>
          <div className="overflow-x-auto rounded-lg border border-border">
            <div
              className="grid items-center gap-1 px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: colGrid }}
            >
              <span>Nama</span>
              <span className="text-right">Gaji Efektif</span>
              <span className="text-right">Tunjangan</span>
              <span className="text-right">Lembur</span>
              <span className="text-right">Bonus</span>
              <span className="text-right">PPh 21</span>
              <span className="text-right">BPJS</span>
              <span className="text-right">Kotor</span>
              <span className="text-right">Bersih</span>
            </div>
            {rows.map((row, idx) => {
              const k = activeKaryawan.find((k) => k.id === row.karyawanId)!;
              const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip({ ...k, ...row });
              return (
                <div
                  key={row.karyawanId}
                  className="grid items-center gap-1 border-t border-border px-2 py-1.5"
                  style={{ gridTemplateColumns: colGrid }}
                >
                  <div>
                    <p className="text-sm font-medium truncate">{k.nama}</p>
                    <p className="text-xs text-muted-foreground">{k.statusKepegawaian}</p>
                  </div>
                  <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(gajiPokokEfektif)}</span>
                  {numInput(row.tunjangan, (v) => updateRow(idx, { tunjangan: v }))}
                  {numInput(row.lembur, (v) => updateRow(idx, { lembur: v }))}
                  {numInput(row.bonus, (v) => updateRow(idx, { bonus: v }))}
                  {numInput(row.pph21, (v) => updateRow(idx, { pph21: v }))}
                  {numInput(row.bpjsPotongan, (v) => updateRow(idx, { bpjsPotongan: v }))}
                  <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(penggajianKotor)}</span>
                  <span className={`text-right text-sm font-mono tabular-nums font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>
                    {formatRupiahCompact(penggajianBersih)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outline" onClick={() => setPhase("select")}>← Ubah Pilihan</Button>
            <Button
              onClick={handleSimpan}
              disabled={!rowsValid || createBatch.isPending}
              loading={createBatch.isPending}
            >
              Simpan Penggajian
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

Create `src/app/(app)/penggajian/baru/page.tsx`:

```tsx
import { PenggajianCreate } from "@/components/penggajian/penggajian-create";

export default function Page() {
  return <PenggajianCreate />;
}
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/penggajian/penggajian-create.tsx "src/app/(app)/penggajian/baru/page.tsx"
git commit -m "feat(penggajian): create page — period + karyawan select + inline table"
```

---

## Task 6: Batch Detail Page

**Files:**
- Create: `src/components/penggajian/penggajian-batch.tsx`
- Create: `src/app/(app)/penggajian/[batchId]/page.tsx`

**Interfaces:**
- Consumes: `useBatch`, `useUpdateSlip`, `useMarkSlipDibayar` from `@/lib/query/penggajian`; `calcSlip`, `PenggajianBatch`, `SlipGaji` from `@/lib/schemas/penggajian`; `formatRupiahCompact`, `formatRupiah` from `@/lib/format`

- [ ] **Step 1: Create PenggajianBatch component**

Create `src/components/penggajian/penggajian-batch.tsx`:

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wallet, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { calcSlip, type PenggajianBatch, type SlipGaji } from "@/lib/schemas/penggajian";
import { useBatch, useUpdateSlip, useMarkSlipDibayar } from "@/lib/query/penggajian";

function periodStr(p: PenggajianBatch["periode"]) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(p.mulai)} – ${fmt(p.selesai)}`;
}

const colGrid = "160px 100px 90px 80px 80px 90px 90px 110px 110px 130px 80px";
const inputCls =
  "w-full rounded px-1.5 py-0.5 text-right text-sm font-mono bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

function SlipRow({ slip, batchId }: { slip: SlipGaji; batchId: string }) {
  const updateSlip = useUpdateSlip();
  const markDibayar = useMarkSlipDibayar();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const locked = slip.status === "sudah_dibayar";

  const [tunjangan, setTunjangan] = React.useState(String(slip.tunjangan));
  const [lembur, setLembur]       = React.useState(String(slip.lembur));
  const [bonus, setBonus]         = React.useState(String(slip.bonus));
  const [pph21, setPph21]         = React.useState(String(slip.pph21));
  const [bpjs, setBpjs]           = React.useState(String(slip.bpjsPotongan));

  React.useEffect(() => { setTunjangan(String(slip.tunjangan)); }, [slip.tunjangan]);
  React.useEffect(() => { setLembur(String(slip.lembur)); }, [slip.lembur]);
  React.useEffect(() => { setBonus(String(slip.bonus)); }, [slip.bonus]);
  React.useEffect(() => { setPph21(String(slip.pph21)); }, [slip.pph21]);
  React.useEffect(() => { setBpjs(String(slip.bpjsPotongan)); }, [slip.bpjsPotongan]);

  const save = (patch: Parameters<typeof updateSlip.mutate>[0]["patch"]) =>
    updateSlip.mutate({ batchId, slipId: slip.id, patch });

  const toNum = (s: string) => Math.max(0, Number(s) || 0);
  const localSlip = {
    ...slip,
    tunjangan: toNum(tunjangan),
    lembur: toNum(lembur),
    bonus: toNum(bonus),
    pph21: toNum(pph21),
    bpjsPotongan: toNum(bpjs),
  };
  const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip(localSlip);

  const numField = (
    val: string,
    setVal: (v: string) => void,
    field: keyof typeof localSlip & ("tunjangan" | "lembur" | "bonus" | "pph21" | "bpjsPotongan"),
    original: number,
  ) => (
    <input
      type="number" min={0} disabled={locked}
      value={val}
      placeholder="0"
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const v = toNum(val);
        if (v !== original) save({ [field]: v });
      }}
      className={inputCls}
    />
  );

  return (
    <>
      <div
        className="grid items-center gap-1 border-b border-border px-2 py-2 last:border-0"
        style={{ gridTemplateColumns: colGrid }}
      >
        <div>
          <p className="text-sm font-medium truncate">{slip.karyawanNama}</p>
          <p className="text-xs text-muted-foreground truncate">{slip.jabatan}</p>
        </div>
        <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(gajiPokokEfektif)}</span>
        {numField(tunjangan, setTunjangan, "tunjangan", slip.tunjangan)}
        {numField(lembur, setLembur, "lembur", slip.lembur)}
        {numField(bonus, setBonus, "bonus", slip.bonus)}
        {numField(pph21, setPph21, "pph21", slip.pph21)}
        {numField(bpjs, setBpjs, "bpjsPotongan", slip.bpjsPotongan)}
        <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(penggajianKotor)}</span>
        <span className={`text-right text-sm font-mono tabular-nums font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>
          {formatRupiahCompact(penggajianBersih)}
        </span>
        <div className="flex items-center justify-center">
          {locked
            ? <Badge variant="success" className="text-xs">Dibayar</Badge>
            : <Badge variant="warning" className="text-xs">Menunggu</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/penggajian/${batchId}/${slip.id}`}>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1">
              <ExternalLink className="size-3" /> Slip
            </Button>
          </Link>
          {!locked && (
            <Button variant="outline" size="sm" className="h-6 px-1.5 text-xs"
              onClick={() => setConfirmOpen(true)}>
              Bayar
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai sudah dibayar?</AlertDialogTitle>
            <AlertDialogDescription>
              Slip gaji <strong>{slip.karyawanNama}</strong> akan ditandai sudah dibayar sebesar{" "}
              <strong>{formatRupiah(penggajianBersih)}</strong> (take-home). Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={markDibayar.isPending}
              onClick={() => {
                markDibayar.mutate({ batchId, slipId: slip.id }, {
                  onSuccess: () => {
                    toast.success(`${slip.karyawanNama} — slip ditandai sudah dibayar.`);
                    setConfirmOpen(false);
                  },
                });
              }}
            >
              Tandai Dibayar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PenggajianBatchDetail({ batchId }: { batchId: string }) {
  const { data: batch, isLoading } = useBatch(batchId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <Skeleton className="h-7 w-56" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Wallet className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Batch tidak ditemukan</p>
      </div>
    );
  }

  const paid = batch.slips.filter((s) => s.status === "sudah_dibayar").length;
  const total = batch.slips.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight">{batch.id}</h1>
            <Badge variant={paid === total ? "success" : paid > 0 ? "warning" : "secondary"}>
              {paid}/{total} Dibayar
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pl-7">{periodStr(batch.periode)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div
          className="grid items-center gap-1 px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: colGrid }}
        >
          <span>Nama</span>
          <span className="text-right">Gaji Efektif</span>
          <span className="text-right">Tunjangan</span>
          <span className="text-right">Lembur</span>
          <span className="text-right">Bonus</span>
          <span className="text-right">PPh 21</span>
          <span className="text-right">BPJS</span>
          <span className="text-right">Kotor</span>
          <span className="text-right">Bersih</span>
          <span className="text-center">Status</span>
          <span />
        </div>
        <div>
          {batch.slips.map((slip) => (
            <SlipRow key={slip.id} slip={slip} batchId={batch.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the page**

Create `src/app/(app)/penggajian/[batchId]/page.tsx`:

```tsx
"use client";
import { useParams } from "next/navigation";
import { PenggajianBatchDetail } from "@/components/penggajian/penggajian-batch";

export default function Page() {
  const { batchId } = useParams<{ batchId: string }>();
  return <PenggajianBatchDetail batchId={batchId} />;
}
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/penggajian/penggajian-batch.tsx "src/app/(app)/penggajian/[batchId]/page.tsx"
git commit -m "feat(penggajian): batch detail — inline table, save-on-blur, tandai dibayar"
```

---

## Task 7: Slip Document

**Files:**
- Create: `src/components/penggajian/slip-document.tsx`
- Create: `src/components/penggajian/slip-builder.tsx`
- Create: `src/app/(app)/penggajian/[batchId]/[slipId]/page.tsx`

**Interfaces:**
- Consumes: `useSlip`, `useMarkSlipDibayar` from `@/lib/query/penggajian`; `calcSlip`, `SlipGaji`, `PenggajianBatch` from `@/lib/schemas/penggajian`; `DocumentPage`, `DocumentLetterhead` from `@/components/shared/document/`; `formatRupiah` from `@/lib/format`; `companyProfile` from `@/lib/company-profile`

- [ ] **Step 1: Create SlipDocument (printable content)**

Create `src/components/penggajian/slip-document.tsx`:

```tsx
import { companyProfile } from "@/lib/company-profile";
import { formatRupiah } from "@/lib/format";
import { calcSlip, type SlipGaji } from "@/lib/schemas/penggajian";
import { DocumentPage } from "@/components/shared/document/document-page";
import { DocumentLetterhead } from "@/components/shared/document/document-letterhead";

function tglPanjang(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function periodStr(mulai: string, selesai: string) {
  return `${tglPanjang(mulai)} – ${tglPanjang(selesai)}`;
}

function rupiah(v: number) {
  return v === 0 ? "–" : formatRupiah(v);
}

const cell = "px-4 py-1 text-[11px]";
const cellR = `${cell} text-right font-mono tabular-nums`;
const divider = "border-t border-[var(--doc-rule)]";

export function SlipDocument({
  slip,
  periode,
}: {
  slip: SlipGaji;
  periode: { mulai: string; selesai: string };
}) {
  const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip(slip);
  const totalPotongan = slip.pph21 + slip.bpjsPotongan;
  const tglPaid = slip.paidAt ? tglPanjang(slip.paidAt) : tglPanjang(new Date().toISOString());

  return (
    <DocumentPage header={<DocumentLetterhead />}>
      <div className="px-8 py-4 text-[11px] leading-snug space-y-4">
        {/* Title */}
        <div className="text-center space-y-0.5">
          <p className="text-base font-bold tracking-[0.25em]">SLIP GAJI</p>
          <p className="text-[11px] text-muted-foreground">Periode: {periodStr(periode.mulai, periode.selesai)}</p>
        </div>

        {/* Employee meta */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 border border-[var(--doc-rule)] rounded p-3">
          <div className="space-y-0.5">
            <div className="flex gap-2"><span className="w-20 text-muted-foreground">Nama</span><span>: {slip.karyawanNama}</span></div>
            <div className="flex gap-2"><span className="w-20 text-muted-foreground">Jabatan</span><span>: {slip.jabatan}</span></div>
            <div className="flex gap-2"><span className="w-20 text-muted-foreground">Status</span><span>: {slip.statusKepegawaian} (×{slip.pengali})</span></div>
          </div>
          <div className="space-y-0.5 text-right">
            <div><span className="text-muted-foreground">No. Slip </span><span className="font-mono">{slip.id}</span></div>
            <div><span className="text-muted-foreground">ID Karyawan </span><span className="font-mono">{slip.karyawanId}</span></div>
          </div>
        </div>

        {/* Earnings table */}
        <table className="w-full border-collapse border border-[var(--doc-rule)]">
          <thead>
            <tr className="bg-[var(--doc-blue-soft)]">
              <th className={`${cell} text-left font-bold`} colSpan={2}>PENDAPATAN</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className={cell}>Gaji Pokok</td><td className={cellR}>{formatRupiah(slip.gajiPokok)}</td></tr>
            <tr className="text-muted-foreground">
              <td className={cell}>Pengali ({slip.statusKepegawaian} ×{slip.pengali})</td>
              <td className={cellR} />
            </tr>
            <tr className="font-medium">
              <td className={cell}>Gaji Pokok Efektif</td>
              <td className={cellR}>{formatRupiah(gajiPokokEfektif)}</td>
            </tr>
            <tr><td className={cell}>Tunjangan</td><td className={cellR}>{formatRupiah(slip.tunjangan)}</td></tr>
            <tr><td className={cell}>Lembur</td><td className={cellR}>{rupiah(slip.lembur)}</td></tr>
            <tr><td className={cell}>Bonus</td><td className={cellR}>{rupiah(slip.bonus)}</td></tr>
            <tr className={`${divider} font-bold bg-[var(--doc-blue-soft)]`}>
              <td className={cell}>PENGGAJIAN KOTOR</td>
              <td className={cellR}>{formatRupiah(penggajianKotor)}</td>
            </tr>
          </tbody>
        </table>

        {/* Deductions */}
        <table className="w-full border-collapse border border-[var(--doc-rule)]">
          <thead>
            <tr className="bg-[var(--doc-blue-soft)]">
              <th className={`${cell} text-left font-bold`} colSpan={2}>POTONGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className={cell}>PPh 21</td><td className={cellR}>{formatRupiah(slip.pph21)}</td></tr>
            <tr><td className={cell}>BPJS (porsi karyawan)</td><td className={cellR}>{formatRupiah(slip.bpjsPotongan)}</td></tr>
            <tr className={`${divider} font-bold bg-[var(--doc-blue-soft)]`}>
              <td className={cell}>TOTAL POTONGAN</td>
              <td className={cellR}>{formatRupiah(totalPotongan)}</td>
            </tr>
          </tbody>
        </table>

        {/* Net pay */}
        <table className="w-full border-collapse border border-[var(--doc-rule)]">
          <tbody>
            <tr className="bg-[var(--doc-blue)] text-white font-bold text-[12px]">
              <td className={cell}>PENGGAJIAN BERSIH (Take-Home)</td>
              <td className={cellR}>{formatRupiah(penggajianBersih)}</td>
            </tr>
          </tbody>
        </table>

        {/* Bank */}
        <div className="border border-[var(--doc-rule)] rounded p-3 space-y-0.5">
          <p className="font-medium">Dibayarkan ke:</p>
          <p>{slip.bankNama} &bull; {slip.bankNomor} &bull; a/n {slip.bankAtasNama}</p>
        </div>

        {/* Signature */}
        <div className="flex justify-between items-end pt-4">
          <div />
          <div className="text-center space-y-8">
            <p>{companyProfile.kota}, {tglPaid}</p>
            <div>
              <div className="border-b border-[var(--doc-rule)] w-40 mx-auto" />
              <p className="font-medium mt-1">{companyProfile.direktur.nama}</p>
              <p className="text-muted-foreground">{companyProfile.direktur.jabatan}</p>
            </div>
          </div>
        </div>
      </div>
    </DocumentPage>
  );
}
```

- [ ] **Step 2: Create SlipBuilder (wrapper with toolbar)**

Create `src/components/penggajian/slip-builder.tsx`:

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { SlipDocument } from "@/components/penggajian/slip-document";
import { calcSlip } from "@/lib/schemas/penggajian";
import { formatRupiah } from "@/lib/format";
import { useSlip, useMarkSlipDibayar } from "@/lib/query/penggajian";
import { useBatch } from "@/lib/query/penggajian";

export function SlipBuilder({ batchId, slipId }: { batchId: string; slipId: string }) {
  const { data: batch } = useBatch(batchId);
  const { data: slip, isLoading } = useSlip(batchId, slipId);
  const markDibayar = useMarkSlipDibayar();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (!slip || !batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Wallet className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Slip tidak ditemukan</p>
      </div>
    );
  }

  const { penggajianBersih } = calcSlip(slip);
  const locked = slip.status === "sudah_dibayar";

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Link href={`/penggajian/${batchId}`}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="size-4" /> Kembali ke Batch
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{slip.id}</span>
                <Badge variant={locked ? "success" : "warning"}>
                  {locked ? "Sudah Dibayar" : "Menunggu Pembayaran"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{slip.karyawanNama}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!locked && (
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
                Tandai Dibayar
              </Button>
            )}
            <Button size="sm" onClick={() => window.print()}>
              <Download className="size-4 mr-1.5" /> Unduh
            </Button>
          </div>
        </div>

        {/* Document preview */}
        <ScaleToFit>
          <SlipDocument slip={slip} periode={batch.periode} />
        </ScaleToFit>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai sudah dibayar?</AlertDialogTitle>
            <AlertDialogDescription>
              Slip gaji <strong>{slip.karyawanNama}</strong> sebesar{" "}
              <strong>{formatRupiah(penggajianBersih)}</strong> akan ditandai sudah dibayar. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={markDibayar.isPending}
              onClick={() => {
                markDibayar.mutate({ batchId, slipId }, {
                  onSuccess: () => {
                    toast.success("Slip ditandai sudah dibayar.");
                    setConfirmOpen(false);
                  },
                });
              }}
            >
              Tandai Dibayar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 3: Create the slip document page**

Create `src/app/(app)/penggajian/[batchId]/[slipId]/page.tsx`:

```tsx
"use client";
import { useParams } from "next/navigation";
import { SlipBuilder } from "@/components/penggajian/slip-builder";

export default function Page() {
  const { batchId, slipId } = useParams<{ batchId: string; slipId: string }>();
  return <SlipBuilder batchId={batchId} slipId={slipId} />;
}
```

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: exit 0, no type errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: 94 passing (12 new + 82 existing), 3 pre-existing failures unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/penggajian/slip-document.tsx src/components/penggajian/slip-builder.tsx "src/app/(app)/penggajian/[batchId]/[slipId]/page.tsx"
git commit -m "feat(penggajian): slip document builder + print view"
```

---

## Task 8: Human Review Gate

- [ ] **Step 1:** Run `npm run dev`. Navigate to `/penggajian` — confirm 2 seeded batches (GAJ-001 with 2/5 dibayar badge, GAJ-002 with 0/3).

- [ ] **Step 2:** Click "Buat Penggajian". Select a periode and 2–3 karyawan. Click "Lanjut". Confirm inline table appears with auto-calculated Gaji Efektif (Probation rows show 0.8× applied). Edit PPh21 on one row — Bersih updates live. Click "Simpan Penggajian". Confirm redirect to new batch detail.

- [ ] **Step 3:** Navigate to `/penggajian/GAJ-001`. Confirm 5 rows; SLP-001 and SLP-002 rows are locked (all inputs disabled, "Dibayar" badge). Edit Lembur on SLP-003 → click away → value persists after tab change. Click "Bayar" on SLP-004 → confirmation dialog → confirm → badge turns green, row locks.

- [ ] **Step 4:** Click "Slip" on any row → navigate to `/penggajian/GAJ-001/SLP-003`. Confirm slip renders correctly: company letterhead, employee name/jabatan, Probation ×0.8 for Fajar's slip (SLP-005), PPh21 row shows "–" if 0. Click "Unduh" → browser print dialog opens.

- [ ] **Step 5:** Kill dev server. Fix any issues found.

---

## Self-Review

**Spec coverage:**
- FR-06.1 Buat penggajian per periode rentang kustom → Task 5 create page ✓
- FR-06.2 Tarik gaji pokok, pengali, tunjangan default dari EP-02 → `makeDefaultRow` in create, fixtures from `karyawanFixtures` ✓
- FR-06.3 Penggajian Kotor = efektif + tunjangan + lembur + bonus → `calcSlip` ✓
- FR-06.4 PPh 21 manual, boleh 0 (BR-3) → manual input field + test `pph21=0 is valid` ✓
- FR-06.5 Penggajian Bersih = Kotor − PPh21 − potongan → `calcSlip` ✓
- FR-06.6 Draf & pratinjau sebelum bayar → batch detail editable until dibayar; slip doc page ✓
- FR-06.7 Sudah Dibayar → arus kas stub → `appendArusKas` in `markSlipDibayar` ✓
- FR-06.8 PPh21/BPJS kewajiban Tax Center → stub (out of scope per spec §10) ✓ (documented)
- FR-06.9 Slip rahasia → out of scope for prototype (no RBAC) ✓ (documented)
- FR-06.10 Kirim WA/Email → out of scope ✓ (documented)

**Type consistency verified:**
- `calcSlip` takes `Pick<SlipGaji, ...>` — used in `penggajian-create.tsx`, `penggajian-batch.tsx`, `slip-document.tsx`, `slip-builder.tsx`
- `SlipEditFields` defined in `data/penggajian.ts`, re-exported via `query/penggajian.ts`
- `CreateBatchInput.slips` = `Omit<SlipGaji, "id" | "batchId" | "status" | "paidAt">[]` — matches `handleSimpan` in `penggajian-create.tsx`
- `useBatch(id)` queryKey `["penggajian", id]` — invalidated by `useMarkSlipDibayar` ✓
- `useSlip(batchId, slipId)` queryKey `["penggajian", batchId, slipId]` ✓
