# Faktur–Deal Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an SPH becomes a Deal all termin fakturs are auto-created with derived IDs; the faktur list shows one merged row per deal with after-tax totals; the SPH document gains a per-termin after-tax breakdown using PPN/PPH settings stored on the SPH itself; the penawaran list gains a status-change action menu with confirmation dialogs.

**Architecture:** Extend the SPH schema with PPN/PPH fields; derive faktur IDs from the SPH sequence+year; auto-create all termin fakturs (Draft) by mutating the in-memory fixture arrays when SPH status changes to "deal"; update `groupFakturByDeal` to carry after-tax amounts and a `latestFaktur` pointer; drive the faktur list, deal termin card, and SPH document from those computed fields.

**Tech Stack:** Next.js 15 App Router, TypeScript, Zod, React Hook Form, TanStack Query v5, Vitest, Tailwind CSS, shadcn/ui

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/schemas/penawaran.ts` | Modify | Add `ppnAktif/Persen`, `pph23Aktif/Persen` to `sphFormSchema` |
| `src/lib/fixtures/penawaran.ts` | Modify | Seed tax defaults on all existing SPH fixtures |
| `src/lib/fixtures/faktur.ts` | Modify | New ID format + all termins pre-created for each deal |
| `src/lib/faktur-id.ts` | Create | `sphIdToInvBase`, `terminFakturId` |
| `src/lib/faktur.ts` | Modify | `afterTaxAmount`, `DealTerminRow.nilaiAfterTax`, `DealRekap.totalAfterTax/latestFaktur` |
| `src/lib/data/faktur.ts` | Modify | `createFakturSetFromSph` — builds and pushes termin fakturs |
| `src/lib/data/penawaran.ts` | Modify | `updatePenawaranStatus` — mutates fixture + calls `createFakturSetFromSph` |
| `src/lib/query/penawaran.ts` | Modify | `useUpdatePenawaranStatus` mutation with dual query invalidation |
| `src/lib/faktur-source.ts` | Delete | No longer needed — fakturs are auto-created, not manually sourced |
| `src/components/penawaran/sph-form.tsx` | Modify | Add "Pajak" section with PPN/PPH toggles |
| `src/components/penawaran/sph-builder.tsx` | Modify | Read-only layout when `existing.status === "deal"` |
| `src/components/penawaran/sph-cover-letter.tsx` | Modify | Per-termin after-tax rows + Total Biaya Setelah Pajak |
| `src/components/faktur/deal-termin-card.tsx` | Modify | Show `nilaiAfterTax`, badge left-aligned beside faktur ID |
| `src/components/faktur/faktur-builder.tsx` | Modify | Remove `initialSphId/TerminIndex` params and `fakturValuesFromSph` import |
| `src/components/faktur/faktur-form.tsx` | Modify | Remove SPH picker; show `sphId` as read-only |
| `src/app/(app)/penawaran/page.tsx` | Modify | Custom action column: Ubah Status + Edit + Hapus with confirm dialogs |
| `src/app/(app)/faktur/page.tsx` | Modify | One row per deal via `groupFakturByDeal` |
| `src/app/(app)/faktur/baru/page.tsx` | Modify | Redirect to `/faktur` |
| `src/lib/__tests__/faktur-id.test.ts` | Create | Tests for ID derivation helpers |
| `src/lib/__tests__/faktur-rekap.test.ts` | Modify | Update for after-tax values and new fixture IDs |
| `src/lib/__tests__/faktur-data.test.ts` | Modify | Update for new fixture IDs |

---

## Task 1: SPH Schema — Add PPN/PPH Fields

**Files:**
- Modify: `src/lib/schemas/penawaran.ts`
- Modify: `src/lib/fixtures/penawaran.ts`
- Modify: `src/components/penawaran/sph-builder.tsx`

- [ ] **Step 1.1: Add four fields to `sphFormSchema`**

In `src/lib/schemas/penawaran.ts`, add after the `catatan` field inside `sphFormSchema`:

```ts
ppnAktif: z.boolean().default(false),
ppnPersen: z.coerce.number().default(12),
pph23Aktif: z.boolean().default(false),
pph23Persen: z.coerce.number().default(2),
```

The complete `sphFormSchema` becomes:

```ts
export const sphFormSchema = z.object({
  perusahaanId: z.string().min(1, "Perusahaan wajib dipilih."),
  perusahaanNama: z.string(),
  alamat: z.string(),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  masaBerlakuAktif: z.boolean(),
  masaBerlakuHari: z.coerce.number(),
  kalimatPembuka: z.string(),
  lampiran: z.string(),
  rincianAktif: z.boolean().default(true),
  items: z.array(sphItemSchema).min(1, "Tambahkan minimal satu layanan."),
  termin: z.array(sphTerminSchema),
  catatan: z.array(z.string()),
  ppnAktif: z.boolean().default(false),
  ppnPersen: z.coerce.number().default(12),
  pph23Aktif: z.boolean().default(false),
  pph23Persen: z.coerce.number().default(2),
});
```

- [ ] **Step 1.2: Seed tax defaults on penawaran fixtures**

In `src/lib/fixtures/penawaran.ts`, add to **every** SPH fixture object (all 5 entries), alongside their existing `catatan`:

```ts
ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
```

- [ ] **Step 1.3: Update `SphBuilder` defaultValues**

In `src/components/penawaran/sph-builder.tsx`, add to `emptyValues`:

```ts
ppnAktif: false,
ppnPersen: 12,
pph23Aktif: false,
pph23Persen: 2,
```

And in the `existing ? { ... }` branch of `defaultValues`, add:

```ts
ppnAktif: existing.ppnAktif,
ppnPersen: existing.ppnPersen,
pph23Aktif: existing.pph23Aktif,
pph23Persen: existing.pph23Persen,
```

- [ ] **Step 1.4: Run tests**

```bash
npm test
```

Expected: all tests pass (new fields have schema defaults so backwards-compatible).

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/schemas/penawaran.ts src/lib/fixtures/penawaran.ts src/components/penawaran/sph-builder.tsx
git commit -m "feat(sph): add PPN/PPH tax settings to SPH schema and fixtures"
```

---

## Task 2: Faktur ID Derivation Module

**Files:**
- Create: `src/lib/faktur-id.ts`
- Create: `src/lib/__tests__/faktur-id.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `src/lib/__tests__/faktur-id.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sphIdToInvBase, terminFakturId } from "@/lib/faktur-id";

describe("sphIdToInvBase", () => {
  it("extracts sequence and year from SPH/001/5.2026", () => {
    expect(sphIdToInvBase("SPH/001/5.2026")).toBe("INV/001/2026");
  });
  it("handles two-digit month SPH/002/11.2026", () => {
    expect(sphIdToInvBase("SPH/002/11.2026")).toBe("INV/002/2026");
  });
  it("handles sequence SPH/004/6.2026", () => {
    expect(sphIdToInvBase("SPH/004/6.2026")).toBe("INV/004/2026");
  });
});

describe("terminFakturId", () => {
  it("adds -T1 suffix for terminIndex 0", () => {
    expect(terminFakturId("INV/001/2026", 0)).toBe("INV/001/2026-T1");
  });
  it("adds -T3 suffix for terminIndex 2", () => {
    expect(terminFakturId("INV/001/2026", 2)).toBe("INV/001/2026-T3");
  });
});
```

- [ ] **Step 2.2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose src/lib/__tests__/faktur-id.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/faktur-id'"

- [ ] **Step 2.3: Implement `src/lib/faktur-id.ts`**

```ts
/**
 * Derives invoice identifiers from an SPH ID.
 *
 * SPH format:  SPH/{seq}/{month}.{year}  e.g. "SPH/001/5.2026"
 * Inv base:    INV/{seq}/{year}           e.g. "INV/001/2026"
 * Termin ID:   {base}-T{terminIndex + 1} e.g. "INV/001/2026-T1"
 */
export function sphIdToInvBase(sphId: string): string {
  const parts = sphId.split("/");
  const seq = parts[1];
  const year = parts[2].split(".")[1];
  return `INV/${seq}/${year}`;
}

export function terminFakturId(invBase: string, terminIndex: number): string {
  return `${invBase}-T${terminIndex + 1}`;
}
```

- [ ] **Step 2.4: Run tests to confirm they pass**

```bash
npm test -- --reporter=verbose src/lib/__tests__/faktur-id.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/faktur-id.ts src/lib/__tests__/faktur-id.test.ts
git commit -m "feat(faktur): SPH→INV ID derivation helpers"
```

---

## Task 3: Update Fixtures + Data Layer — Auto-Create Fakturs on Deal

**Files:**
- Modify: `src/lib/fixtures/faktur.ts`
- Modify: `src/lib/data/faktur.ts`
- Modify: `src/lib/data/penawaran.ts`
- Modify: `src/lib/__tests__/faktur-data.test.ts`

- [ ] **Step 3.1: Update faktur fixtures to new ID format**

Replace the entire contents of `src/lib/fixtures/faktur.ts`. IDs now follow `INV/{seq}/{year}-T{n}`. All termins per deal are pre-created; un-sent ones are `draft` with empty `tanggal`/`jatuhTempo`.

```ts
import type { Faktur } from "@/lib/schemas/faktur";

const dealA = {
  sphId: "SPH/001/5.2026",
  perusahaanId: "PRSH-001", perusahaanNama: "PT Maju Bersama Industri",
  alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22, Jakarta Selatan",
  kota: "Jakarta", npwp: "0123456789010000",
  items: [
    { uraian: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket" },
    { uraian: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket" },
  ],
  terminList: [
    { label: "Termin I", persen: 40, pemicu: "Mulai" },
    { label: "Termin II", persen: 30, pemicu: "Pertek selesai" },
    { label: "Termin III", persen: 30, pemicu: "Pelunasan" },
  ],
};
const dealB = {
  sphId: "SPH/002/5.2026",
  perusahaanId: "PRSH-003", perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
  alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
  kota: "Surabaya", npwp: "0345678901230000",
  items: [{ uraian: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }],
  terminList: [
    { label: "Termin I", persen: 50, pemicu: "Mulai" },
    { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
  ],
};
const dealC = {
  sphId: "SPH/004/6.2026",
  perusahaanId: "PRSH-006", perusahaanNama: "PT Cahaya Teknik Mandiri",
  alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
  kota: "Medan", npwp: "0678901234560000",
  items: [{ uraian: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
  terminList: [
    { label: "Termin I", persen: 40, pemicu: "Mulai" },
    { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
  ],
};

const tax = { ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 } as const;

export const fakturFixtures: Faktur[] = [
  // Deal A (SPH/001/5.2026) — T1 & T2 lunas, T3 terkirim
  {
    id: "INV/001/2026-T1", ...dealA, ...tax,
    tanggal: "2026-04-08", jatuhTempo: "2026-05-08", terminIndex: 0,
    catatan: [], status: "lunas", tanggalBayar: "2026-04-20",
  },
  {
    id: "INV/001/2026-T2", ...dealA, ...tax,
    tanggal: "2026-05-02", jatuhTempo: "2026-06-02", terminIndex: 1,
    catatan: [], status: "lunas", tanggalBayar: "2026-05-14",
  },
  {
    id: "INV/001/2026-T3", ...dealA, ...tax,
    tanggal: "2026-05-22", jatuhTempo: "2026-06-22", terminIndex: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
  // Deal B (SPH/002/5.2026) — T1 lunas; T2 draft (auto-created at deal time)
  {
    id: "INV/002/2026-T1", ...dealB, ...tax,
    tanggal: "2026-05-10", jatuhTempo: "2026-06-10", terminIndex: 0,
    catatan: ["Mohon transfer ke rekening perusahaan"], status: "lunas", tanggalBayar: "2026-05-28",
  },
  {
    id: "INV/002/2026-T2", ...dealB, ...tax,
    tanggal: "", jatuhTempo: "", terminIndex: 1,
    catatan: [], status: "draft", tanggalBayar: "",
  },
  // Deal C (SPH/004/6.2026) — T1 terkirim & overdue; T2 draft
  {
    id: "INV/004/2026-T1", ...dealC, ...tax,
    tanggal: "2026-03-01", jatuhTempo: "2026-04-01", terminIndex: 0,
    catatan: ["Mohon segera diselesaikan pembayaran"], status: "terkirim", tanggalBayar: "",
  },
  {
    id: "INV/004/2026-T2", ...dealC, ...tax,
    tanggal: "", jatuhTempo: "", terminIndex: 1,
    catatan: [], status: "draft", tanggalBayar: "",
  },
];
```

- [ ] **Step 3.2: Update `faktur-data.test.ts` for new IDs**

Replace `src/lib/__tests__/faktur-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { listFaktur, getFaktur } from "@/lib/data/faktur";

describe("faktur data", () => {
  it("parses all fixtures", async () => {
    const rows = await listFaktur();
    expect(rows.length).toBeGreaterThanOrEqual(7);
  });
  it("gets one by new ID format", async () => {
    const f = await getFaktur("INV/001/2026-T2");
    expect(f?.perusahaanNama).toContain("PT");
  });
  it("returns null for unknown id", async () => {
    const f = await getFaktur("INV/999/2099-T9");
    expect(f).toBeNull();
  });
});
```

- [ ] **Step 3.3: Add `createFakturSetFromSph` to `src/lib/data/faktur.ts`**

Replace the entire file:

```ts
import { delay } from "@/lib/data/_delay";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { fakturSchema, type Faktur } from "@/lib/schemas/faktur";
import { sphIdToInvBase, terminFakturId } from "@/lib/faktur-id";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import type { Sph } from "@/lib/schemas/penawaran";

export type ListFakturParams = { q?: string };

export async function listFaktur(params: ListFakturParams = {}): Promise<Faktur[]> {
  await delay();
  const rows = fakturSchema.array().parse(fakturFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) => r.id.toLowerCase().includes(q) || r.perusahaanNama.toLowerCase().includes(q),
  );
}

export async function getFaktur(id: string): Promise<Faktur | null> {
  await delay(300);
  const row = fakturFixtures.find((r) => r.id === id);
  return row ? fakturSchema.parse(row) : null;
}

/**
 * Build all termin fakturs for a deal SPH and push them into the in-memory
 * store. Idempotent — skips any ID that already exists.
 */
export function createFakturSetFromSph(sph: Sph): void {
  const invBase = sphIdToInvBase(sph.id);
  const perusahaan = perusahaanFixtures.find((p) => p.id === sph.perusahaanId);
  const terminList = sph.termin.map((t) => ({
    label: t.label,
    persen: t.persen,
    pemicu: t.pemicu,
  }));

  for (let i = 0; i < sph.termin.length; i++) {
    const id = terminFakturId(invBase, i);
    if (fakturFixtures.some((f) => f.id === id)) continue;

    const faktur: Faktur = {
      id,
      sphId: sph.id,
      perusahaanId: sph.perusahaanId,
      perusahaanNama: sph.perusahaanNama,
      alamat: sph.alamat,
      kota: perusahaan?.kota ?? "",
      npwp: perusahaan?.npwp ?? "",
      items: sph.items.map((it) => ({
        uraian: it.nama,
        volume: it.volume,
        harga: it.harga,
        satuan: it.satuan,
      })),
      terminList,
      terminIndex: i,
      ppnAktif: sph.ppnAktif,
      ppnPersen: sph.ppnPersen,
      pph23Aktif: sph.pph23Aktif,
      pph23Persen: sph.pph23Persen,
      tanggal: "",
      jatuhTempo: "",
      status: "draft",
      catatan: [],
      tanggalBayar: "",
    };

    fakturFixtures.push(faktur);
  }
}
```

- [ ] **Step 3.4: Add `updatePenawaranStatus` to `src/lib/data/penawaran.ts`**

Replace the entire file:

```ts
import { delay } from "@/lib/data/_delay";
import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { sphSchema, type Sph, type SphStatus } from "@/lib/schemas/penawaran";
import { createFakturSetFromSph } from "@/lib/data/faktur";

export type ListPenawaranParams = { q?: string };

export async function listPenawaran(params: ListPenawaranParams = {}): Promise<Sph[]> {
  await delay();
  const rows = sphSchema.array().parse(penawaranFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) => r.id.toLowerCase().includes(q) || r.perusahaanNama.toLowerCase().includes(q),
  );
}

export async function getPenawaran(id: string): Promise<Sph | null> {
  await delay(300);
  const row = penawaranFixtures.find((r) => r.id === id);
  return row ? sphSchema.parse(row) : null;
}

export async function updatePenawaranStatus(id: string, newStatus: SphStatus): Promise<void> {
  await delay(300);
  const idx = penawaranFixtures.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`SPH ${id} not found`);
  penawaranFixtures[idx] = { ...penawaranFixtures[idx], status: newStatus };
  if (newStatus === "deal") {
    createFakturSetFromSph(penawaranFixtures[idx]);
  }
}
```

- [ ] **Step 3.5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3.6: Commit**

```bash
git add src/lib/fixtures/faktur.ts src/lib/data/faktur.ts src/lib/data/penawaran.ts src/lib/__tests__/faktur-data.test.ts
git commit -m "feat(faktur): mutable fixture store + auto-create termin fakturs on deal"
```

---

## Task 4: Query Mutation — `useUpdatePenawaranStatus`

**Files:**
- Modify: `src/lib/query/penawaran.ts`

- [ ] **Step 4.1: Add mutation**

Replace `src/lib/query/penawaran.ts`:

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPenawaran,
  updatePenawaranStatus,
  type ListPenawaranParams,
} from "@/lib/data/penawaran";
import type { SphStatus } from "@/lib/schemas/penawaran";

export function usePenawaranList(params: ListPenawaranParams = {}) {
  return useQuery({
    queryKey: ["penawaran", params],
    queryFn: () => listPenawaran(params),
  });
}

export function useUpdatePenawaranStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SphStatus }) =>
      updatePenawaranStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
      qc.invalidateQueries({ queryKey: ["faktur"] });
    },
  });
}
```

- [ ] **Step 4.2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4.3: Commit**

```bash
git add src/lib/query/penawaran.ts
git commit -m "feat(penawaran): useUpdatePenawaranStatus mutation"
```

---

## Task 5: DealRekap — After-Tax Amounts

**Files:**
- Modify: `src/lib/faktur.ts`
- Modify: `src/lib/__tests__/faktur-rekap.test.ts`

- [ ] **Step 5.1: Write failing tests**

Replace `src/lib/__tests__/faktur-rekap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupFakturByDeal } from "@/lib/faktur";
import { fakturFixtures } from "@/lib/fixtures/faktur";

describe("groupFakturByDeal — after-tax", () => {
  it("terbayar is sum of after-tax amounts for lunas termins (deal A)", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/001/5.2026")!;
    // T1: 40% of 125M = 50M; PPN 12% on DPP 11/12: round(12%*(11/12*50M))=5_500_000; PPH 2%*50M=1M → 54_500_000
    // T2: 30% of 125M = 37.5M; round(12%*(11/12*37.5M))=4_125_000; 2%*37.5M=750_000 → 40_875_000
    expect(d.terbayar).toBe(95_375_000); // T1 + T2 lunas
    expect(d.totalAfterTax).toBe(136_250_000); // T1 + T2 + T3
    expect(Math.round(d.persenTerbayar)).toBe(70);
  });

  it("nilaiAfterTax per termin matches computeFaktur", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/001/5.2026")!;
    expect(d.termins[0].nilaiAfterTax).toBe(54_500_000);
    expect(d.termins[1].nilaiAfterTax).toBe(40_875_000);
    expect(d.termins[2].nilaiAfterTax).toBe(40_875_000);
  });

  it("latestFaktur is the issued termin with highest terminIndex", () => {
    const d = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/001/5.2026")!;
    expect(d.latestFaktur?.id).toBe("INV/001/2026-T3");
  });

  it("deal B: T2 draft is locked while T1 lunas", () => {
    const b = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/002/5.2026")!;
    expect(b.termins[1].status).toBe("draft");
    expect(b.latestFaktur?.id).toBe("INV/002/2026-T1");
  });

  it("deal C: T1 overdue, T2 draft stays locked", () => {
    const c = groupFakturByDeal(fakturFixtures).find((g) => g.sphId === "SPH/004/6.2026")!;
    expect(c.termins[0].overdue).toBe(true);
    expect(c.termins[1].status).toBe("draft");
  });
});
```

- [ ] **Step 5.2: Run tests to confirm they fail**

```bash
npm test -- --reporter=verbose src/lib/__tests__/faktur-rekap.test.ts
```

Expected: FAIL — `nilaiAfterTax`, `totalAfterTax`, `latestFaktur` missing; `terbayar` mismatch.

- [ ] **Step 5.3: Update `src/lib/faktur.ts`**

Replace the entire file:

```ts
import type { Faktur, FakturFormValues } from "@/lib/schemas/faktur";

const num = (n: number) => (Number.isFinite(n) ? n : 0);

export function totalBiaya(items: FakturFormValues["items"]): number {
  return items.reduce((s, it) => s + num(it.volume) * num(it.harga), 0);
}

export type FakturTotals = {
  totalBiaya: number;
  previous: { label: string; persen: number; amount: number }[];
  nilaiTermin: number;
  pemicu: string;
  dpp: number;
  ppn: number;
  pph23: number;
  total: number;
};

/** Per-termin invoice math (DPP nilai lain: PPN base = 11/12 × nilai termin). */
export function computeFaktur(v: FakturFormValues): FakturTotals {
  const total = totalBiaya(v.items);
  const previous = v.terminList.slice(0, v.terminIndex).map((t) => ({
    label: t.label,
    persen: num(t.persen),
    amount: (num(t.persen) / 100) * total,
  }));
  const current = v.terminList[v.terminIndex];
  const nilaiTermin = current ? (num(current.persen) / 100) * total : 0;
  const dpp = (11 / 12) * nilaiTermin;
  const ppn = v.ppnAktif ? Math.round((num(v.ppnPersen) / 100) * dpp) : 0;
  const pph23 = v.pph23Aktif ? (num(v.pph23Persen) / 100) * nilaiTermin : 0;
  return {
    totalBiaya: total,
    previous,
    nilaiTermin,
    pemicu: current?.pemicu ?? "",
    dpp,
    ppn,
    pph23,
    total: nilaiTermin + ppn - pph23,
  };
}

/**
 * Compute after-tax amount for a known nilaiTermin using explicit PPN/PPH
 * settings. Uses DPP nilai lain method for PPN (same as computeFaktur).
 */
export function afterTaxAmount(
  nilaiTermin: number,
  ppnAktif: boolean,
  ppnPersen: number,
  pph23Aktif: boolean,
  pph23Persen: number,
): number {
  const dpp = (11 / 12) * nilaiTermin;
  const ppn = ppnAktif ? Math.round((ppnPersen / 100) * dpp) : 0;
  const pph23 = pph23Aktif ? (pph23Persen / 100) * nilaiTermin : 0;
  return nilaiTermin + ppn - pph23;
}

/** A faktur is overdue when its due date passed and it isn't paid yet. */
export function isFakturOverdue(f: Pick<Faktur, "status" | "jatuhTempo">): boolean {
  return (
    f.status !== "lunas" && !!f.jatuhTempo && new Date(f.jatuhTempo + "T23:59:59") < new Date()
  );
}

export type TerminPaymentStatus = "lunas" | "menunggu" | "draft" | "belum";

function terminStatusOf(f: Faktur | null): TerminPaymentStatus {
  if (!f) return "belum";
  if (f.status === "lunas") return "lunas";
  if (f.status === "draft") return "draft";
  return "menunggu";
}

export type DealTerminRow = {
  index: number;
  label: string;
  persen: number;
  pemicu: string;
  nilai: number;
  nilaiAfterTax: number;
  faktur: Faktur | null;
  status: TerminPaymentStatus;
  overdue: boolean;
  canCreate: boolean;
};

export type DealRekap = {
  key: string;
  sphId: string;
  perusahaanNama: string;
  totalBiaya: number;
  totalAfterTax: number;
  latestFaktur: Faktur | null;
  termins: DealTerminRow[];
  terbayar: number;
  persenTerbayar: number;
};

export function groupFakturByDeal(fakturs: Faktur[]): DealRekap[] {
  const groups = new Map<string, Faktur[]>();
  for (const f of fakturs) {
    const key = f.sphId || f.id;
    const arr = groups.get(key) ?? [];
    arr.push(f);
    groups.set(key, arr);
  }
  return Array.from(groups, ([key, arr]) => {
    const rep = arr[0];
    const total = totalBiaya(rep.items);
    const termins: DealTerminRow[] = rep.terminList.map((t, index) => {
      const faktur = arr.find((f) => f.terminIndex === index) ?? null;
      const nilai = (num(t.persen) / 100) * total;
      const nilaiAfterTax = faktur ? computeFaktur(faktur).total : nilai;
      return {
        index,
        label: t.label,
        persen: num(t.persen),
        pemicu: t.pemicu,
        nilai,
        nilaiAfterTax,
        faktur,
        status: terminStatusOf(faktur),
        overdue: faktur ? isFakturOverdue(faktur) : false,
        canCreate: false,
      };
    });

    let prevAllLunas = true;
    for (const t of termins) {
      t.canCreate = t.status === "belum" && prevAllLunas;
      prevAllLunas = prevAllLunas && t.status === "lunas";
    }

    const terbayar = termins
      .filter((t) => t.status === "lunas")
      .reduce((s, t) => s + t.nilaiAfterTax, 0);
    const totalAfterTax = termins.reduce((s, t) => s + t.nilaiAfterTax, 0);

    // "Latest issued" = faktur with highest terminIndex that has a send date.
    const issuedFakturs = arr.filter((f) => f.tanggal !== "");
    const latestFaktur =
      issuedFakturs.length > 0
        ? issuedFakturs.reduce((max, f) => (f.terminIndex > max.terminIndex ? f : max))
        : null;

    return {
      key,
      sphId: rep.sphId,
      perusahaanNama: rep.perusahaanNama,
      totalBiaya: total,
      totalAfterTax,
      latestFaktur,
      termins,
      terbayar,
      persenTerbayar: totalAfterTax ? (terbayar / totalAfterTax) * 100 : 0,
    };
  });
}

const ROMAN: [number, string][] = [
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
export function toRoman(n: number): string {
  let out = "";
  let x = Math.max(0, Math.floor(n));
  for (const [v, s] of ROMAN) while (x >= v) { out += s; x -= v; }
  return out;
}
```

- [ ] **Step 5.4: Run failing tests until they pass**

```bash
npm test -- --reporter=verbose src/lib/__tests__/faktur-rekap.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5.5: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5.6: Commit**

```bash
git add src/lib/faktur.ts src/lib/__tests__/faktur-rekap.test.ts
git commit -m "feat(faktur): after-tax amounts in DealTerminRow and DealRekap"
```

---

## Task 6: Penawaran List — Row Action Menu

**Files:**
- Modify: `src/app/(app)/penawaran/page.tsx`

- [ ] **Step 6.1: Replace page with custom action column**

Replace the entire file `src/app/(app)/penawaran/page.tsx`:

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText, Plus, EllipsisVerticalIcon, SquarePenIcon, Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRupiah } from "@/lib/format";
import { totalPenawaran } from "@/lib/sph";
import { usePenawaranList, useUpdatePenawaranStatus } from "@/lib/query/penawaran";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

const STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" }> = {
  draft: { label: "Draft", variant: "info" },
  terkirim: { label: "Leads - Terkirim", variant: "warning" },
  deal: { label: "Convert - Deal", variant: "success" },
};

const NEXT_STATUS: Partial<Record<SphStatus, { label: string; next: SphStatus }>> = {
  draft: { label: "Tandai Terkirim", next: "terkirim" },
  terkirim: { label: "Tandai Deal", next: "deal" },
};

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function PenawaranPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePenawaranList();
  const updateStatus = useUpdatePenawaranStatus();

  const [deleteTarget, setDeleteTarget] = React.useState<Sph | null>(null);
  const [dealTarget, setDealTarget] = React.useState<Sph | null>(null);

  const columns: ColumnDef<Sph>[] = [
    {
      accessorKey: "id", header: "No. SPH", meta: { mono: true },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => router.push(`/penawaran/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.id}
        </button>
      ),
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-64" } },
    { accessorKey: "tanggal", header: "Tanggal", cell: ({ row }) => tanggalID(row.original.tanggal) },
    {
      id: "total", header: "Total Penawaran", meta: { mono: true },
      cell: ({ row }) => formatRupiah(totalPenawaran(row.original.items)),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => {
        const s = STATUS[row.original.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "actions", header: "", enableSorting: false,
      meta: { align: "right", collapse: true },
      cell: ({ row }) => {
        const sph = row.original;
        if (sph.status === "deal") return null;
        const nextAction = NEXT_STATUS[sph.status];
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Aksi baris">
                  <EllipsisVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {nextAction && (
                  <DropdownMenuItem
                    onSelect={() => {
                      if (nextAction.next === "deal") {
                        setDealTarget(sph);
                      } else {
                        updateStatus.mutate(
                          { id: sph.id, status: nextAction.next },
                          { onSuccess: () => toast.success(`Status diubah: ${nextAction.label}`) },
                        );
                      }
                    }}
                  >
                    {nextAction.label}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() => router.push(`/penawaran/${encodeURIComponent(sph.id)}`)}
                >
                  <SquarePenIcon className="mr-2 size-4" /> Ubah
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); setDeleteTarget(sph); }}
                >
                  <Trash2Icon className="mr-2 size-4" /> Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Penawaran</h1>
        </div>
        <Button onClick={() => router.push("/penawaran/baru")}>
          <Plus className="size-4" /> Buat SPH
        </Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="perusahaanNama"
          searchPlaceholder="Cari perusahaan…"
          emptyMessage="Belum ada penawaran"
          rowActions={false}
        />
      )}

      {/* Confirm: Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. (Demo: data tidak benar-benar dihapus.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                toast.success("Demo: data tidak dihapus");
                setDeleteTarget(null);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: Tandai Deal */}
      <AlertDialog open={!!dealTarget} onOpenChange={(o) => !o && setDealTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai sebagai Deal?</AlertDialogTitle>
            <AlertDialogDescription>
              Mengubah ke Deal akan membuat faktur otomatis untuk{" "}
              {dealTarget?.termin.length ?? 0} termin. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!dealTarget) return;
                updateStatus.mutate(
                  { id: dealTarget.id, status: "deal" },
                  {
                    onSuccess: () => {
                      toast.success("SPH diubah ke Deal. Faktur termin dibuat otomatis.");
                      setDealTarget(null);
                    },
                  },
                );
              }}
            >
              Tandai Deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 6.2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6.3: Commit**

```bash
git add "src/app/(app)/penawaran/page.tsx"
git commit -m "feat(penawaran): row action menu with status change and delete confirm"
```

---

## Task 7: Penawaran Detail — Read-Only for Deal Status

**Files:**
- Modify: `src/components/penawaran/sph-builder.tsx`

- [ ] **Step 7.1: Add read-only branch before `useForm`**

`DocumentBuilder` requires an `onKirim` callback, so the read-only view uses a simpler custom layout instead.

In `src/components/penawaran/sph-builder.tsx`, add these imports:

```tsx
import { Lock } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
```

Then, directly after the `const noSph = ...` line and **before** the `useForm(...)` call, insert:

```tsx
if (existing?.status === "deal") {
  const frozenValues: SphFormValues = {
    perusahaanId: existing.perusahaanId,
    perusahaanNama: existing.perusahaanNama,
    alamat: existing.alamat,
    tanggal: existing.tanggal,
    masaBerlakuAktif: existing.masaBerlakuAktif,
    masaBerlakuHari: existing.masaBerlakuHari,
    kalimatPembuka: existing.kalimatPembuka,
    lampiran: existing.lampiran,
    rincianAktif: existing.rincianAktif,
    items: existing.items,
    termin: existing.termin,
    catatan: existing.catatan,
    ppnAktif: existing.ppnAktif,
    ppnPersen: existing.ppnPersen,
    pph23Aktif: existing.pph23Aktif,
    pph23Persen: existing.pph23Persen,
  };
  return (
    <div className="space-y-4">
      <Alert>
        <Lock className="size-4" />
        <AlertTitle>Read Only</AlertTitle>
        <AlertDescription>
          Penawaran ini sudah menjadi Deal dan tidak dapat diubah.
        </AlertDescription>
      </Alert>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <p className="text-sm font-semibold">{noSph} — Pratinjau Dokumen</p>
        </div>
        <div className="p-4">
          <ScaleToFit>
            <SphCoverLetter values={frozenValues} noSph={noSph} />
          </ScaleToFit>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7.3: Commit**

```bash
git add src/components/penawaran/sph-builder.tsx
git commit -m "feat(penawaran): read-only layout for Deal status in SphBuilder"
```

---

## Task 8: SPH Form — PPN/PPH Tax Section

**Files:**
- Modify: `src/components/penawaran/sph-form.tsx`

- [ ] **Step 8.1: Add `PajakRow` component and wire into `SphForm`**

In `src/components/penawaran/sph-form.tsx`:

1. Add `PajakRow` at the bottom of the file (after the existing `TerminEditor`):

```tsx
function PajakRow({
  label,
  aktif,
  persen,
  onToggle,
  onPersen,
}: {
  label: string;
  aktif: boolean;
  persen: number;
  onToggle: (v: boolean) => void;
  onPersen: (v: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <label className="flex w-32 items-center gap-2">
        <Checkbox checked={aktif} onCheckedChange={(c) => onToggle(c === true)} />
        {label}
      </label>
      {aktif && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={persen ? String(persen) : ""}
            onChange={(e) => onPersen(Number(e.target.value) || 0)}
            className="w-20 text-right font-mono tabular-nums"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}
```

2. In `SphForm`, after the `<BuilderSection title="Skema Termin">` closing tag, add:

```tsx
<BuilderSection title="Pajak">
  <div className="space-y-3">
    <PajakRow
      label="PPN"
      aktif={values.ppnAktif}
      persen={values.ppnPersen}
      onToggle={(c) => form.setValue("ppnAktif", c)}
      onPersen={(n) => form.setValue("ppnPersen", n)}
    />
    <PajakRow
      label="PPh 23"
      aktif={values.pph23Aktif}
      persen={values.pph23Persen}
      onToggle={(c) => form.setValue("pph23Aktif", c)}
      onPersen={(n) => form.setValue("pph23Persen", n)}
    />
  </div>
</BuilderSection>
```

- [ ] **Step 8.2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8.3: Commit**

```bash
git add src/components/penawaran/sph-form.tsx
git commit -m "feat(sph): PPN/PPH tax section in SPH form"
```

---

## Task 9: Faktur List Page — Merged Deal Rows

**Files:**
- Modify: `src/app/(app)/faktur/page.tsx`

- [ ] **Step 9.1: Rewrite faktur page**

Replace the entire file `src/app/(app)/faktur/page.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptText } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/format";
import { groupFakturByDeal } from "@/lib/faktur";
import type { DealRekap } from "@/lib/faktur";
import { useFakturList } from "@/lib/query/faktur";

function tanggalID(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";
}

function dealStatus(
  deal: DealRekap,
): { label: string; variant: "info" | "warning" | "success" | "destructive" } {
  if (deal.termins.every((t) => t.status === "lunas")) {
    return { label: "Lunas", variant: "success" };
  }
  if (deal.termins.some((t) => t.overdue)) {
    return { label: "Jatuh Tempo", variant: "destructive" };
  }
  if (deal.termins.some((t) => t.status === "menunggu")) {
    return { label: "Belum Lunas", variant: "info" };
  }
  return { label: "Draft", variant: "info" };
}

export default function FakturPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useFakturList();
  const deals = data ? groupFakturByDeal(data) : [];

  const columns: ColumnDef<DealRekap>[] = [
    {
      id: "sphId", header: "No. Faktur", meta: { mono: true },
      cell: ({ row }) => {
        const deal = row.original;
        const latestId = deal.latestFaktur?.id;
        if (!latestId) return <span className="font-mono">{deal.sphId}</span>;
        return (
          <button
            type="button"
            onClick={() => router.push(`/faktur/${encodeURIComponent(latestId)}`)}
            className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {deal.sphId}
          </button>
        );
      },
    },
    {
      id: "perusahaan", header: "Perusahaan",
      accessorKey: "perusahaanNama", meta: { className: "min-w-64" },
    },
    {
      id: "tanggal", header: "Tanggal",
      cell: ({ row }) => tanggalID(row.original.latestFaktur?.tanggal ?? ""),
    },
    {
      id: "jatuhTempo", header: "Jatuh Tempo",
      cell: ({ row }) => tanggalID(row.original.latestFaktur?.jatuhTempo ?? ""),
    },
    {
      id: "termin", header: "Termin", meta: { mono: true },
      cell: ({ row }) => {
        const { termins } = row.original;
        const issued = termins.filter((t) => t.faktur?.tanggal !== "").length;
        return `${issued}/${termins.length}`;
      },
    },
    {
      id: "total", header: "Total Tagihan", meta: { mono: true },
      cell: ({ row }) => formatRupiah(row.original.totalAfterTax),
    },
    {
      id: "status", header: "Status",
      cell: ({ row }) => {
        const s = dealStatus(row.original);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ReceiptText className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Faktur</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={deals}
          loading={isLoading}
          searchColumn="perusahaanNama"
          searchPlaceholder="Cari perusahaan…"
          emptyMessage="Belum ada faktur"
          rowActions={false}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 9.2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 9.3: Commit**

```bash
git add "src/app/(app)/faktur/page.tsx"
git commit -m "feat(faktur): one merged row per deal with after-tax totals"
```

---

## Task 10: Deal Termin Card — After-Tax + Badge Left-Align

**Files:**
- Modify: `src/components/faktur/deal-termin-card.tsx`

- [ ] **Step 10.1: Replace the file**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Eye, Lock } from "lucide-react";

import type { DealRekap, DealTerminRow, TerminPaymentStatus } from "@/lib/faktur";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BadgeVariant = "success" | "warning" | "info" | "secondary" | "destructive";

const TERMIN_BADGE: Record<TerminPaymentStatus, { label: string; variant: BadgeVariant }> = {
  lunas: { label: "Lunas", variant: "success" },
  menunggu: { label: "Menunggu Bayar", variant: "warning" },
  draft: { label: "Draft", variant: "info" },
  belum: { label: "Belum Difakturkan", variant: "secondary" },
};

export function DealTerminCard({ deal, currentId }: { deal: DealRekap; currentId?: string }) {
  const router = useRouter();
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-muted/30 p-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            {deal.sphId || "Faktur Manual"}
          </div>
          <div className="font-medium">{deal.perusahaanNama}</div>
        </div>
        <div className="min-w-48 text-right">
          <div className="text-sm">
            <span className="font-mono font-semibold tabular-nums">
              {formatRupiah(deal.terbayar)}
            </span>
            <span className="text-muted-foreground">
              {" "}/ {formatRupiah(deal.totalAfterTax)} terbayar
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, deal.persenTerbayar))}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {Math.round(deal.persenTerbayar)}%
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {deal.termins.map((t) => (
          <TerminLine
            key={t.index}
            deal={deal.sphId}
            termin={t}
            router={router}
            active={!!currentId && t.faktur?.id === currentId}
          />
        ))}
      </div>
    </div>
  );
}

function TerminLine({
  deal,
  termin: t,
  router,
  active,
}: {
  deal: string;
  termin: DealTerminRow;
  router: ReturnType<typeof useRouter>;
  active: boolean;
}) {
  const badge =
    t.overdue
      ? { label: "Jatuh Tempo", variant: "destructive" as BadgeVariant }
      : TERMIN_BADGE[t.status];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm",
        active && "bg-primary/5",
      )}
    >
      <div className="w-44 font-medium">
        {t.label} <span className="text-muted-foreground">({t.persen}%)</span>
      </div>
      {/* After-tax amount */}
      <div className="w-36 font-mono tabular-nums text-muted-foreground">
        {formatRupiah(t.nilaiAfterTax)}
      </div>
      {/* Faktur ID + status badge — left-aligned together */}
      <div className="flex flex-1 items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{t.faktur?.id ?? "—"}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      {t.faktur ? (
        <Button
          size="xs"
          variant="outline"
          disabled={active}
          onClick={() => router.push(`/faktur/${encodeURIComponent(t.faktur!.id)}`)}
        >
          <Eye /> {active ? "Sedang dibuka" : "Lihat"}
        </Button>
      ) : (
        <Button size="xs" variant="outline" disabled title="Termin belum tersedia">
          <Lock /> Terkunci
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 10.2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 10.3: Commit**

```bash
git add src/components/faktur/deal-termin-card.tsx
git commit -m "feat(faktur): after-tax amounts + badge left-align in deal termin card"
```

---

## Task 11: SPH Cover Letter — Per-Termin After-Tax Rows

**Files:**
- Modify: `src/components/penawaran/sph-cover-letter.tsx`

- [ ] **Step 11.1: Import `afterTaxAmount` and add table rows**

In `src/components/penawaran/sph-cover-letter.tsx`, add to the import list:

```tsx
import { afterTaxAmount } from "@/lib/faktur";
```

Locate the `{/* Total Biaya */}` table row (the `<tr>` that contains "TOTAL BIAYA"). Immediately **after** that `</tr>` and **before** the `{/* Terbilang */}` row, insert:

```tsx
{/* Per-termin after-tax rows (only when termin + any tax active) */}
{values.termin.length > 0 && (values.ppnAktif || values.pph23Aktif) && (
  <>
    {values.termin.map((t, i) => {
      const nilaiTermin = ((Number(t.persen) || 0) / 100) * total;
      const net = afterTaxAmount(
        nilaiTermin,
        values.ppnAktif,
        values.ppnPersen,
        values.pph23Aktif,
        values.pph23Persen,
      );
      return (
        <tr key={i}>
          <td
            colSpan={4}
            className="border border-[var(--doc-rule)] px-2 py-1 text-right"
          >
            {t.label}{t.pemicu ? ` — ${t.pemicu}` : ""}{" "}
            <span className="text-xs">(Termasuk Pajak)</span>
          </td>
          <td className="border border-[var(--doc-rule)] px-2 py-1 text-right font-mono tabular-nums">
            {formatRupiah(net)}
          </td>
        </tr>
      );
    })}
    <tr>
      <td
        colSpan={4}
        className="border border-[var(--doc-rule)] px-2 py-1 text-right font-bold"
      >
        TOTAL BIAYA SETELAH PAJAK
      </td>
      <td className="border border-[var(--doc-rule)] px-2 py-1 text-right font-mono font-bold tabular-nums">
        {formatRupiah(
          values.termin.reduce((s, t) => {
            const nilaiTermin = ((Number(t.persen) || 0) / 100) * total;
            return (
              s +
              afterTaxAmount(
                nilaiTermin,
                values.ppnAktif,
                values.ppnPersen,
                values.pph23Aktif,
                values.pph23Persen,
              )
            );
          }, 0),
        )}
      </td>
    </tr>
  </>
)}
```

- [ ] **Step 11.2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 11.3: Commit**

```bash
git add src/components/penawaran/sph-cover-letter.tsx
git commit -m "feat(sph): per-termin after-tax breakdown in cover letter document"
```

---

## Task 12: Remove Manual Faktur Creation Flow

**Files:**
- Modify: `src/app/(app)/faktur/baru/page.tsx`
- Modify: `src/components/faktur/faktur-builder.tsx`
- Modify: `src/components/faktur/faktur-form.tsx`
- Delete: `src/lib/faktur-source.ts`

- [ ] **Step 12.1: Check all imports of `faktur-source`**

```bash
grep -r "faktur-source" src/ --include="*.ts" --include="*.tsx"
```

Expected: only `faktur-form.tsx` and `faktur-builder.tsx` import from it.

- [ ] **Step 12.2: Replace `faktur/baru/page.tsx` with redirect**

```tsx
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/faktur");
}
```

- [ ] **Step 12.3: Simplify `faktur-builder.tsx`**

Remove the `initialSphId`, `initialTerminIndex` props and the `fakturValuesFromSph` import. The builder now only handles viewing/editing an existing faktur (passed via `existing`).

Replace the entire file:

```tsx
"use client";
import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
import { FakturForm } from "@/components/faktur/faktur-form";
import { FakturDocument } from "@/components/faktur/faktur-document";
import { fakturFormSchema, type FakturFormValues, type Faktur } from "@/lib/schemas/faktur";
import { usePending } from "@/lib/use-pending";
import { delay } from "@/lib/data/_delay";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const emptyValues: FakturFormValues = {
  sphId: "", perusahaanId: "", perusahaanNama: "", alamat: "", kota: "", npwp: "",
  tanggal: todayISO(), jatuhTempo: plusDaysISO(14),
  items: [{ uraian: "", volume: 1, harga: 0, satuan: "Paket" }],
  terminList: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
  terminIndex: 0, ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
  catatan: [], status: "draft", tanggalBayar: "",
};

export function FakturBuilder({ existing }: { existing?: Faktur }) {
  const noFaktur = existing?.id ?? "INV/???/????";
  const form = useForm<FakturFormValues>({
    resolver: zodResolver(fakturFormSchema) as Resolver<FakturFormValues>,
    defaultValues: existing ? { ...existing } : emptyValues,
  });
  const values = form.watch();
  const [saving, runSave] = usePending();
  const onSimpan = () =>
    runSave(
      form.handleSubmit(async () => {
        await delay();
        toast.success("Demo: draf tidak benar-benar disimpan");
      }),
    );
  const onKirim = form.handleSubmit(async () => {
    await delay();
    toast.success("Demo: faktur tidak benar-benar dikirim");
  });

  return (
    <DocumentBuilder
      title={existing ? existing.id : "Faktur"}
      subtitle="Susun Faktur per termin. Pratinjau diperbarui otomatis."
      previewTitle="Pratinjau Faktur"
      actions={
        <Button variant="secondary" loading={saving} onClick={onSimpan}>
          <Save className="size-4" /> Simpan Draf
        </Button>
      }
      form={<FakturForm form={form} />}
      sidePreview={<ScaleToFit><FakturDocument values={values} noFaktur={noFaktur} /></ScaleToFit>}
      doc={<FakturDocument values={values} noFaktur={noFaktur} />}
      onKirim={onKirim}
    />
  );
}
```

- [ ] **Step 12.4: Simplify `faktur-form.tsx` — remove SPH picker**

In `src/components/faktur/faktur-form.tsx`, remove:
- The import line: `import { dealSphOptions, fakturValuesFromSph } from "@/lib/faktur-source";`
- The `applySph` function
- The `SphPicker` component
- The `<SphPicker ...>` field in the "Sumber & Tujuan" section

Replace the `<BuilderSection title="Sumber & Tujuan">` block with:

```tsx
<BuilderSection title="Sumber">
  <div className="flex h-9 items-center rounded-lg border border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
    {values.sphId || "—"}
  </div>
</BuilderSection>
```

- [ ] **Step 12.5: Delete `faktur-source.ts`**

```bash
rm src/lib/faktur-source.ts
```

- [ ] **Step 12.6: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 12.7: Commit**

```bash
git add "src/app/(app)/faktur/baru/page.tsx" src/components/faktur/faktur-builder.tsx src/components/faktur/faktur-form.tsx
git rm src/lib/faktur-source.ts
git commit -m "refactor(faktur): remove manual baru flow; fakturs auto-created at deal time"
```
