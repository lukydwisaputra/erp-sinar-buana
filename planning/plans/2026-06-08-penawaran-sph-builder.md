# Penawaran / SPH — List + Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Penawaran/SPH module — a list and a full-page builder whose form (left) drives a live SPH document preview (right), with a fullscreen preview — following EP-03 and the SBMJ design system.

**Architecture:** The mock-data spine (schema/fixtures/data/query) powers the list. The builder is a client component owning RHF form state; a pure-presentational `SphDocument` renders the live preview from watched form values (reused in the side panel AND the fullscreen dialog). Pure calc helpers (totals/margin/termin %) are unit-tested; UI is verified by rendering. Reusable `BuilderLayout` / `DocumentPaper` / `LineItemEditor` are extracted for Faktur to reuse next.

**Tech Stack:** Next.js App Router · TanStack Query · React Hook Form + Zod · shadcn/ui (Combobox, Select, Textarea, Collapsible, Dialog, Badge, DataTable) · `MoneyInput`/`formatRupiah`/`terbilang` · Lucide · Vitest (helpers).

**Scope:** SPH list + builder (client document + internal RAB; schedule matrix, real Convert-Deal generation, persistence/PDF, RBAC are OUT — spec §9). Read-only prototype: actions → demo toast. Spec: [planning/specs/2026-06-08-penawaran-sph-builder-design.md](../specs/2026-06-08-penawaran-sph-builder-design.md).

**Reuse (already in repo):** `MoneyInput` (`src/components/shared/money-input.tsx`), `formatRupiah`/`formatRupiahCompact` + `terbilang` (`src/lib/format.ts`, `src/lib/terbilang.ts`), `DataTable` (`src/components/shared/data-table.tsx`, supports `onEdit`/`onDelete`/`meta.className`), `ErrorState`, `Badge` (variants success/warning/info/destructive/secondary), `Combobox` pattern (see `src/app/design-system/sections/form.tsx` DS-07), field-array pattern (see `src/app/(app)/perusahaan/page.tsx` PIC rows), perusahaan/katalog fixtures.

---

## File Structure

```
src/lib/
  sph.ts                      pure calc helpers (TDD)
  __tests__/sph.test.ts
  schemas/penawaran.ts        Sph (data) + sphFormSchema/SphFormValues (builder) + status
  fixtures/penawaran.ts       ~5 seeded SPHs
  data/penawaran.ts           listPenawaran()/getPenawaran()
  query/penawaran.ts          usePenawaranList()
  __tests__/penawaran-data.test.ts
src/components/shared/
  builder-layout.tsx          header (title/breadcrumb/actions) + two-column (form | preview)
  document-paper.tsx          "paper" card shell for a document preview
  line-item-editor.tsx        catalog line-item table (Combobox + qty + MoneyInput + total)
src/components/penawaran/
  sph-document.tsx            presentational SPH doc (props: SphFormValues) — side + fullscreen
  sph-form.tsx                left column: 5 form sections (uses RHF context)
  sph-builder.tsx            owns useForm, composes layout + form + preview + fullscreen + actions
src/app/(app)/penawaran/
  page.tsx                    REPLACE placeholder → list
  baru/page.tsx               new builder
  [id]/page.tsx               builder pre-filled from fixture
```

---

## Task 1: SPH calc helpers (TDD)

**Files:** Create `src/lib/sph.ts`, `src/lib/__tests__/sph.test.ts`.

- [ ] **Step 1: Failing tests** — `src/lib/__tests__/sph.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { totalPenawaran, totalRab, margin, terminPersenTotal, isTerminValid } from "@/lib/sph";

const items = [
  { layananId: "LYN-001", nama: "A", volume: 2, harga: 75_000_000 },
  { layananId: "LYN-003", nama: "B", volume: 1, harga: 45_000_000 },
];

describe("totalPenawaran", () => {
  it("sums volume × harga", () => { expect(totalPenawaran(items)).toBe(195_000_000); });
  it("is 0 for no items", () => { expect(totalPenawaran([])).toBe(0); });
});

describe("totalRab / margin", () => {
  it("totalRab sums personil + langsung", () => {
    expect(totalRab({ personil: 50_000_000, langsung: 30_000_000 })).toBe(80_000_000);
  });
  it("margin = penawaran − rab", () => {
    expect(margin(items, { personil: 50_000_000, langsung: 30_000_000 })).toBe(115_000_000);
  });
  it("margin can be negative", () => {
    expect(margin([{ layananId: "x", nama: "x", volume: 1, harga: 10 }], { personil: 100, langsung: 0 })).toBe(-90);
  });
});

describe("termin", () => {
  const t = [{ label: "I", persen: 40, pemicu: "Mulai" }, { label: "II", persen: 60, pemicu: "Selesai" }];
  it("sums percentages", () => { expect(terminPersenTotal(t)).toBe(100); });
  it("valid when sum is 100", () => { expect(isTerminValid(t)).toBe(true); });
  it("invalid otherwise", () => { expect(isTerminValid([{ label: "I", persen: 50, pemicu: "" }])).toBe(false); });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement** — `src/lib/sph.ts`

```ts
export type SphItemCalc = { volume: number; harga: number };
export type SphRabCalc = { personil: number; langsung: number };
export type SphTerminCalc = { persen: number };

export function totalPenawaran(items: SphItemCalc[]): number {
  return items.reduce((sum, it) => sum + (Number(it.volume) || 0) * (Number(it.harga) || 0), 0);
}
export function totalRab(rab: SphRabCalc): number {
  return (Number(rab.personil) || 0) + (Number(rab.langsung) || 0);
}
export function margin(items: SphItemCalc[], rab: SphRabCalc): number {
  return totalPenawaran(items) - totalRab(rab);
}
export function terminPersenTotal(termin: SphTerminCalc[]): number {
  return termin.reduce((sum, t) => sum + (Number(t.persen) || 0), 0);
}
export function isTerminValid(termin: SphTerminCalc[]): boolean {
  return terminPersenTotal(termin) === 100;
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test` → all green (prior + 9 new).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(sph): pure calc helpers (totals, margin, termin) with tests"`

---

## Task 2: Mock-data spine for Penawaran

**Files:** Create `src/lib/schemas/penawaran.ts`, `src/lib/fixtures/penawaran.ts`, `src/lib/data/penawaran.ts`, `src/lib/query/penawaran.ts`, `src/lib/__tests__/penawaran-data.test.ts`.

- [ ] **Step 1: Schema** — `src/lib/schemas/penawaran.ts`

```ts
import { z } from "zod";

export const sphStatus = z.enum(["draft", "terkirim", "deal"]);
export type SphStatus = z.infer<typeof sphStatus>;

export const sphItemSchema = z.object({
  layananId: z.string(),
  nama: z.string(),
  volume: z.coerce.number(),
  harga: z.coerce.number(),
});
export const sphTerminSchema = z.object({
  label: z.string(),
  persen: z.coerce.number(),
  pemicu: z.string(),
});
export const sphRabSchema = z.object({ personil: z.coerce.number(), langsung: z.coerce.number() });

/** Builder form values (no computed totals; status defaults outside the form). */
export const sphFormSchema = z.object({
  perusahaanId: z.string().min(1, "Perusahaan wajib dipilih."),
  perusahaanNama: z.string(),
  pic: z.string(),
  alamat: z.string(),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  masaBerlaku: z.coerce.number().min(1, "Masa berlaku harus > 0 hari."),
  items: z.array(sphItemSchema).min(1, "Tambahkan minimal satu layanan."),
  termin: z.array(sphTerminSchema),
  rab: sphRabSchema,
  catatan: z.string(),
});
export type SphFormValues = z.infer<typeof sphFormSchema>;

/** Persisted/list shape. */
export const sphSchema = sphFormSchema.extend({ id: z.string(), status: sphStatus });
export type Sph = z.infer<typeof sphSchema>;
```

- [ ] **Step 2: Fixtures** — `src/lib/fixtures/penawaran.ts` (5 SPHs across statuses; reference real perusahaan/katalog names)

```ts
import type { Sph } from "@/lib/schemas/penawaran";

export const penawaranFixtures: Sph[] = [
  {
    id: "SPH/001/5.2026", status: "deal",
    perusahaanId: "PRSH-001", perusahaanNama: "PT Maju Bersama Industri", pic: "Andi Wijaya",
    alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22, Jakarta Selatan",
    tanggal: "2026-05-04", masaBerlaku: 30,
    items: [
      { layananId: "LYN-001", nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000 },
      { layananId: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000 },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 30, pemicu: "Pertek selesai" },
      { label: "Termin III", persen: 30, pemicu: "Pelunasan" },
    ],
    rab: { personil: 45_000_000, langsung: 20_000_000 },
    catatan: "Harga belum termasuk PPN. Berlaku 30 hari sejak tanggal penawaran.",
  },
  {
    id: "SPH/002/5.2026", status: "terkirim",
    perusahaanId: "PRSH-003", perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur", pic: "Budi Santoso",
    alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
    tanggal: "2026-05-12", masaBerlaku: 14,
    items: [{ layananId: "LYN-002", nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000 }],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    rab: { personil: 180_000_000, langsung: 60_000_000 },
    catatan: "Termasuk pendampingan sidang AMDAL.",
  },
  {
    id: "SPH/003/5.2026", status: "draft",
    perusahaanId: "PRSH-005", perusahaanNama: "CV Bahari Sentosa", pic: "Rudi Hartono",
    alamat: "Jl. Bypass Ngurah Rai No. 200, Sanur, Denpasar",
    tanggal: "2026-05-20", masaBerlaku: 14,
    items: [{ layananId: "LYN-003", nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000 }],
    termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
    rab: { personil: 20_000_000, langsung: 8_000_000 },
    catatan: "",
  },
  {
    id: "SPH/004/6.2026", status: "draft",
    perusahaanId: "PRSH-006", perusahaanNama: "PT Cahaya Teknik Mandiri", pic: "Maya Putri",
    alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
    tanggal: "2026-06-02", masaBerlaku: 30,
    items: [{ layananId: "LYN-005", nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000 }],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    rab: { personil: 38_000_000, langsung: 12_000_000 },
    catatan: "",
  },
  {
    id: "SPH/005/6.2026", status: "terkirim",
    perusahaanId: "PRSH-002", perusahaanNama: "CV Sumber Rejeki Pangan", pic: "Siti Rahayu",
    alamat: "Jl. Soekarno Hatta No. 88, Kiaracondong, Bandung",
    tanggal: "2026-06-05", masaBerlaku: 14,
    items: [
      { layananId: "LYN-003", nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000 },
      { layananId: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000 },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    rab: { personil: 30_000_000, langsung: 10_000_000 },
    catatan: "",
  },
];
```

- [ ] **Step 2b: Data accessor** — `src/lib/data/penawaran.ts`

```ts
import { delay } from "@/lib/data/_delay";
import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { sphSchema, type Sph } from "@/lib/schemas/penawaran";

export type ListPenawaranParams = { q?: string };

export async function listPenawaran(params: ListPenawaranParams = {}): Promise<Sph[]> {
  await delay();
  const rows = sphSchema.array().parse(penawaranFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => r.id.toLowerCase().includes(q) || r.perusahaanNama.toLowerCase().includes(q));
}

export async function getPenawaran(id: string): Promise<Sph | null> {
  await delay(300);
  const row = penawaranFixtures.find((r) => r.id === id);
  return row ? sphSchema.parse(row) : null;
}
```

- [ ] **Step 3: Test** — `src/lib/__tests__/penawaran-data.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { listPenawaran, getPenawaran } from "@/lib/data/penawaran";

describe("listPenawaran", () => {
  it("returns all seeded SPHs matching the schema", async () => {
    const rows = await listPenawaran();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows[0]).toMatchObject({ id: expect.any(String), status: expect.stringMatching(/draft|terkirim|deal/) });
  });
  it("filters by id or perusahaan", async () => {
    expect((await listPenawaran({ q: "maju" })).length).toBe(1);
  });
});
describe("getPenawaran", () => {
  it("returns one by id", async () => { expect((await getPenawaran("SPH/001/5.2026"))?.pic).toBe("Andi Wijaya"); });
  it("returns null for unknown", async () => { expect(await getPenawaran("NOPE")).toBeNull(); });
});
```
Run `npm test` → pass.

- [ ] **Step 4: Query hook** — `src/lib/query/penawaran.ts`

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { listPenawaran, type ListPenawaranParams } from "@/lib/data/penawaran";

export function usePenawaranList(params: ListPenawaranParams = {}) {
  return useQuery({ queryKey: ["penawaran", params], queryFn: () => listPenawaran(params) });
}
```

- [ ] **Step 5: Verify + commit** — `npm run build` (exit 0), `npm test` (pass). `git add -A && git commit -m "feat(penawaran): mock-data spine (schema/fixtures/data/query)"`

---

## Task 3: Penawaran list page

**Files:** Replace `src/app/(app)/penawaran/page.tsx`.

- [ ] **Step 1: Implement the list** — `src/app/(app)/penawaran/page.tsx`

```tsx
"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Plus } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { totalPenawaran } from "@/lib/sph";
import { usePenawaranList } from "@/lib/query/penawaran";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

const STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" }> = {
  draft: { label: "Draft", variant: "info" },
  terkirim: { label: "Leads - Terkirim", variant: "warning" },
  deal: { label: "Convert - Deal", variant: "success" },
};

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function PenawaranPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePenawaranList();

  const columns: ColumnDef<Sph>[] = [
    {
      accessorKey: "id", header: "No. SPH", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => router.push(`/penawaran/${encodeURIComponent(row.original.id)}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
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
      cell: ({ row }) => { const s = STATUS[row.original.status]; return <Badge variant={s.variant}>{s.label}</Badge>; },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Penawaran</h1>
        </div>
        <Button onClick={() => router.push("/penawaran/baru")}><Plus className="size-4" /> Buat SPH</Button>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="perusahaanNama" searchPlaceholder="Cari perusahaan…" emptyMessage="Belum ada penawaran"
          onEdit={(row) => router.push(`/penawaran/${encodeURIComponent(row.id)}`)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npm run build` (exit 0). Smoke `/penawaran`: 5 rows, status badges, totals (mono), "Buat SPH" button (will 404 until Task 7 — fine). Kill dev server.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(penawaran): list page (DataTable + status + Buat SPH)"`

---

## Task 4: Reusable builder shell — BuilderLayout, DocumentPaper, LineItemEditor

**Files:** Create `src/components/shared/builder-layout.tsx`, `src/components/shared/document-paper.tsx`, `src/components/shared/line-item-editor.tsx`.

- [ ] **Step 1: BuilderLayout** — `src/components/shared/builder-layout.tsx`

```tsx
"use client";
import * as React from "react";

/**
 * Full-page builder shell: a header (title + actions) over a two-column body
 * (form | preview) that stacks below lg. `preview` is sticky on lg+.
 */
export function BuilderLayout({ title, subtitle, actions, form, preview }: {
  title: React.ReactNode; subtitle?: string; actions?: React.ReactNode;
  form: React.ReactNode; preview: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">{form}</div>
        <div className="min-w-0">
          <div className="lg:sticky lg:top-20">{preview}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: DocumentPaper** — `src/components/shared/document-paper.tsx`

```tsx
import { cn } from "@/lib/utils";

/** A "paper" surface for document previews (SPH, Invoice). */
export function DocumentPaper({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}>
      <div className="space-y-6 p-6 sm:p-8">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: A small section primitive** for form cards — add to `builder-layout.tsx` (export):

```tsx
export function BuilderSection({ title, description, action, children }: {
  title: string; description?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border p-4">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: LineItemEditor** — `src/components/shared/line-item-editor.tsx`. A controlled list of `{ layananId, nama, volume, harga }` rows: each row a service `Combobox` (over options passed in), a qty number input, a `MoneyInput` for harga, a computed line total (mono), and a remove button; a "Tambah Baris" button appends. Selecting a service fills `nama` + `harga` from the option. Props:

```tsx
"use client";
import * as React from "react";
import { Trash2Icon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/shared/money-input";
import { formatRupiah } from "@/lib/format";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ServiceOption = { id: string; nama: string; harga: number };
export type LineItem = { layananId: string; nama: string; volume: number; harga: number };

export function LineItemEditor({ items, options, onChange }: {
  items: LineItem[]; options: ServiceOption[]; onChange: (items: LineItem[]) => void;
}) {
  const update = (i: number, patch: Partial<LineItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeRow = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addRow = () => onChange([...items, { layananId: "", nama: "", volume: 1, harga: 0 }]);

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto]">
          <ServicePicker
            value={it}
            options={options}
            onPick={(opt) => update(i, { layananId: opt.id, nama: opt.nama, harga: opt.harga })}
          />
          <div className="flex items-end gap-2">
            <div className="w-20">
              <label className="text-xs text-muted-foreground">Volume</label>
              <Input type="number" min={1} value={it.volume}
                onChange={(e) => update(i, { volume: Number(e.target.value) })} className="text-right font-mono tabular-nums" />
            </div>
            <div className="w-44">
              <label className="text-xs text-muted-foreground">Harga Satuan</label>
              <MoneyInput defaultValue={it.harga} onValueChange={(n) => update(i, { harga: n })} />
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Hapus baris" onClick={() => removeRow(i)}>
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
          <div className="text-right text-sm sm:col-span-2">
            <span className="text-muted-foreground">Jumlah: </span>
            <span className="font-mono tabular-nums">{formatRupiah(it.volume * it.harga)}</span>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Tambah Baris</Button>
    </div>
  );
}

function ServicePicker({ value, options, onPick }: {
  value: LineItem; options: ServiceOption[]; onPick: (o: ServiceOption) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <label className="text-xs text-muted-foreground">Layanan</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !value.layananId && "text-muted-foreground")}>
            {value.nama || "Pilih layanan…"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari layanan…" />
            <CommandList>
              <CommandEmpty>Tidak ada layanan.</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.id} value={o.nama} onSelect={() => { onPick(o); setOpen(false); }}>
                    {o.nama}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```
IMPORTANT — adapt to real APIs: (a) READ `src/components/shared/money-input.tsx`; it currently takes `defaultValue` only. **Add an optional `onValueChange?: (n: number) => void`** prop to `MoneyInput` (call it in its `onChange` after `parseRupiah`) so the editor receives edits — a small, backward-compatible change. (b) Confirm `command`/`popover` part names against the generated files. (c) If `radix-popover-trigger-width` var differs, use a fixed width.

- [ ] **Step 5: Verify + commit** — `npm run build` (exit 0; nothing renders these yet — type-check). `git add -A && git commit -m "feat(builder): reusable BuilderLayout, DocumentPaper, LineItemEditor (+ MoneyInput onValueChange)"`

---

## Task 5: SPH document preview (presentational)

**Files:** Create `src/components/penawaran/sph-document.tsx`.

- [ ] **Step 1: Implement** — a pure component taking `{ values: SphFormValues; noSph: string; status?: SphStatus }` and rendering the SPH document inside `DocumentPaper`. No RAB/margin. Use `totalPenawaran` + `terbilang` + `formatRupiah`. Empty-state placeholders when fields are blank.

```tsx
import { DocumentPaper } from "@/components/shared/document-paper";
import { Badge } from "@/components/ui/badge";
import { Leaf } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";
import { totalPenawaran } from "@/lib/sph";
import type { SphFormValues, SphStatus } from "@/lib/schemas/penawaran";

function tgl(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

export function SphDocument({ values, noSph, status }: { values: SphFormValues; noSph: string; status?: SphStatus }) {
  const total = totalPenawaran(values.items);
  return (
    <DocumentPaper>
      {/* Kop */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Leaf className="size-5" /></div>
          <div>
            <p className="text-sm font-semibold">PT Sinar Buana Mandiri Jaya</p>
            <p className="text-xs text-muted-foreground">Konsultan Lingkungan</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono font-semibold">{noSph}</p>
          <p className="text-muted-foreground">Tanggal: {tgl(values.tanggal)}</p>
          <p className="text-muted-foreground">Masa berlaku: {values.masaBerlaku || 0} hari</p>
        </div>
      </div>

      {/* Kepada */}
      <div className="text-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Kepada</p>
        <p className="font-medium">{values.perusahaanNama || "Pilih perusahaan…"}</p>
        {values.pic && <p className="text-muted-foreground">u.p. {values.pic}</p>}
        {values.alamat && <p className="text-muted-foreground">{values.alamat}</p>}
      </div>

      {/* Layanan */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 font-medium">Uraian Layanan</th>
            <th className="py-2 text-center font-medium">Vol</th>
            <th className="py-2 text-right font-medium">Harga</th>
            <th className="py-2 text-right font-medium">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {values.items.length === 0 ? (
            <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Tambahkan layanan…</td></tr>
          ) : values.items.map((it, i) => (
            <tr key={i} className="border-b border-border/60">
              <td className="py-2">{it.nama || "—"}</td>
              <td className="py-2 text-center font-mono tabular-nums">{it.volume}</td>
              <td className="py-2 text-right font-mono tabular-nums">{formatRupiah(it.harga)}</td>
              <td className="py-2 text-right font-mono tabular-nums">{formatRupiah(it.volume * it.harga)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total + terbilang */}
      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Total Penawaran</span><span className="font-mono tabular-nums">{formatRupiah(total)}</span>
        </div>
        <p className="text-xs italic text-muted-foreground capitalize">{total > 0 ? `${terbilang(total)} rupiah` : ""}</p>
      </div>

      {/* Termin */}
      {values.termin.length > 0 && (
        <div className="text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Skema Termin</p>
          <ul className="space-y-1">
            {values.termin.map((t, i) => (
              <li key={i} className="flex justify-between">
                <span>{t.label} — {t.pemicu || "—"}</span>
                <span className="font-mono tabular-nums">{t.persen}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Catatan */}
      {values.catatan && (
        <div className="text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Catatan & Ketentuan</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{values.catatan}</p>
        </div>
      )}

      {status && <div><Badge variant={status === "deal" ? "success" : status === "terkirim" ? "warning" : "info"}>{status}</Badge></div>}
    </DocumentPaper>
  );
}
```

- [ ] **Step 2: Verify + commit** — `npm run build` (exit 0). `git add -A && git commit -m "feat(penawaran): SphDocument live preview (presentational)"`

---

## Task 6: SPH form (left column)

**Files:** Create `src/components/penawaran/sph-form.tsx`.

- [ ] **Step 1: Implement** — `SphForm` receives the RHF `form` (typed `UseFormReturn<SphFormValues>`) plus `perusahaanOptions` and `layananOptions`, and renders the 5 sections using `BuilderSection`:
  1. **Tujuan Penawaran** — Perusahaan `Combobox` (perusahaanOptions: id/nama/pic/alamat); on select, `form.setValue` perusahaanId/perusahaanNama and the PIC `Select` (that company's PICs) + alamat (read-only text). Tanggal (`Input type="date"`). Masa Berlaku (`Input type="number"`, hari). Use the shared `Field`/`FieldLabel`/`FieldError`.
  2. **Baris Layanan** — `<LineItemEditor items={form.watch("items")} options={layananOptions} onChange={(v)=>form.setValue("items", v, { shouldValidate: true })} />`. Below it show Total + Terbilang (computed via `totalPenawaran`/`terbilang`).
  3. **Skema Termin** — a small editable list (label `Input`, persen `Input type=number`, pemicu `Input`), add/remove rows via `form.setValue("termin", …)`. Show live Σ% (`terminPersenTotal`) and a destructive `Alert` "Total persentase termin harus 100%." when `!isTerminValid`.
  4. **RAB Internal** — `Collapsible` (default closed), header with a `secondary` Badge "Internal — tidak tampil ke klien". Biaya Personil + Biaya Langsung `MoneyInput`s bound to `form.setValue("rab.personil"/"rab.langsung")`. Show Total RAB and Margin (`margin(items, rab)`) — margin colored `text-success` if ≥0 else `text-destructive`.
  5. **Catatan & Ketentuan** — `Textarea` bound to `catatan`.

Use `form.watch()` for live values. For the perusahaan combobox + PIC select, derive PIC options from the selected perusahaan option's `pic` list (perusahaanOptions carries `pics: { nama }[]`). Keep each section small; this file may reach ~250 lines — acceptable for a form aggregator, but extract a `TerminEditor` sub-component within the file to keep it readable.

CONFIRM real APIs: `Combobox` (Base-UI in radix-nova — follow the working pattern in `src/app/design-system/sections/form.tsx`), `Collapsible`, `Select`, `Alert`, `Textarea`, `Badge`. Money via `MoneyInput` (now with `onValueChange`). Tokens only; Bahasa-Indonesia.

- [ ] **Step 2: Verify + commit** — `npm run build` (exit 0; SphForm not yet mounted). `git add -A && git commit -m "feat(penawaran): SphForm (tujuan, layanan, termin, RAB, catatan)"`

---

## Task 7: SPH builder + routes (compose everything)

**Files:** Create `src/components/penawaran/sph-builder.tsx`, `src/app/(app)/penawaran/baru/page.tsx`, `src/app/(app)/penawaran/[id]/page.tsx`.

- [ ] **Step 1: Build options helpers** — inside `sph-builder.tsx`, derive `perusahaanOptions` from `perusahaanFixtures` (`{ id, nama, pic: pic.map(p=>p.nama), alamat }`) and `layananOptions` from `katalogFixtures` (`{ id, nama, harga: hargaStandar ?? 0 }`). Import the fixtures directly (prototype).

- [ ] **Step 2: SphBuilder** — `src/components/penawaran/sph-builder.tsx`:

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Maximize2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BuilderLayout } from "@/components/shared/builder-layout";
import { SphForm } from "@/components/penawaran/sph-form";
import { SphDocument } from "@/components/penawaran/sph-document";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { katalogFixtures } from "@/lib/fixtures/katalog";
import { sphFormSchema, type SphFormValues, type Sph } from "@/lib/schemas/penawaran";

const perusahaanOptions = perusahaanFixtures.map((p) => ({
  id: p.id, nama: p.nama, alamat: p.alamat, pics: p.pic.map((x) => x.nama),
}));
const layananOptions = katalogFixtures.map((l) => ({ id: l.id, nama: l.nama, harga: l.hargaStandar ?? 0 }));

const emptyValues: SphFormValues = {
  perusahaanId: "", perusahaanNama: "", pic: "", alamat: "", tanggal: "", masaBerlaku: 14,
  items: [{ layananId: "", nama: "", volume: 1, harga: 0 }], termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
  rab: { personil: 0, langsung: 0 }, catatan: "",
};

export function SphBuilder({ existing }: { existing?: Sph }) {
  const router = useRouter();
  const [fs, setFs] = React.useState(false);
  const noSph = existing?.id ?? "SPH/006/6.2026"; // display-only next number
  const form = useForm<SphFormValues>({
    resolver: zodResolver(sphFormSchema),
    defaultValues: existing ? { ...existing } : emptyValues,
  });
  const values = form.watch();

  const onSimpan = form.handleSubmit(() => toast.success("Demo: draf tidak benar-benar disimpan"));
  const onKirim = form.handleSubmit(() => toast.success("Demo: SPH tidak benar-benar dikirim"));

  return (
    <BuilderLayout
      title={existing ? existing.id : "Buat SPH"}
      subtitle="Susun Surat Penawaran Harga. Pratinjau diperbarui otomatis."
      actions={
        <>
          <Button variant="outline" onClick={() => setFs(true)}><Maximize2 className="size-4" /> Pratinjau Layar Penuh</Button>
          <Button variant="secondary" onClick={onSimpan}><Save className="size-4" /> Simpan Draf</Button>
          <Button onClick={onKirim}><Send className="size-4" /> Kirim</Button>
        </>
      }
      form={<SphForm form={form} perusahaanOptions={perusahaanOptions} layananOptions={layananOptions} />}
      preview={<SphDocument values={values} noSph={noSph} status={existing?.status} />}
    >
    </BuilderLayout>
  );
}
```
Then render the fullscreen `Dialog` (outside BuilderLayout's children is fine — put it as a sibling; adjust the JSX so `BuilderLayout` and the `Dialog` are wrapped in a fragment):
```tsx
<Dialog open={fs} onOpenChange={setFs}>
  <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto p-0">
    <div className="bg-muted/40 p-4 sm:p-6">
      <SphDocument values={values} noSph={noSph} status={existing?.status} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => toast.success("Demo: tidak diunduh")}>Unduh</Button>
        <Button onClick={() => { setFs(false); onKirim(); }}>Kirim</Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```
(Refactor the component so it returns `<><BuilderLayout …/><Dialog …/></>`.) CONFIRM `dialog.tsx` exports `DialogContent`; the close "X" is built in.

- [ ] **Step 3: Routes**
  `src/app/(app)/penawaran/baru/page.tsx`:
  ```tsx
  import { SphBuilder } from "@/components/penawaran/sph-builder";
  export default function Page() { return <SphBuilder />; }
  ```
  `src/app/(app)/penawaran/[id]/page.tsx` (server component loads the fixture by id, passes to the client builder):
  ```tsx
  import { notFound } from "next/navigation";
  import { getPenawaran } from "@/lib/data/penawaran";
  import { SphBuilder } from "@/components/penawaran/sph-builder";
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const sph = await getPenawaran(decodeURIComponent(id));
    if (!sph) notFound();
    return <SphBuilder existing={sph} />;
  }
  ```
  (Next 16 `params` is async — `await params`. Confirm against the project's other dynamic routes / the Next docs in `node_modules/next/dist/docs/` if the signature differs.)

- [ ] **Step 4: Verify** — `npm run build` (exit 0; routes `/penawaran/baru` + `/penawaran/[id]` listed). `npm test` (pass). Smoke: `/penawaran` → "Buat SPH" → builder; fill perusahaan (PIC+alamat autofill), add a layanan (harga autofills, preview updates live), edit termin (Σ% warning when ≠100), open RAB (margin shows, NOT in preview), open **Pratinjau Layar Penuh** (fullscreen doc, Tutup/Unduh/Kirim), Simpan/Kirim → toast. Open `/penawaran/SPH%2F001%2F5.2026` from the list → pre-filled. Kill dev server.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(penawaran): SPH builder + /baru and /[id] routes (form + live + fullscreen preview)"`

---

## Task 8: Human review gate

- [ ] **Step 1:** `npm run dev`. Walk `/penawaran` (list) → Buat SPH (builder): live preview, termin Σ% warning, internal RAB hidden from preview, fullscreen preview, and an existing SPH pre-filled from the list. Both themes.
- [ ] **Step 2:** Capture feedback; fix before Faktur (next module reuses BuilderLayout/DocumentPaper/LineItemEditor).

---

## Self-Review (completed)

- **Spec coverage:** list (§4)→T3; builder layout + fullscreen (§5.1/5.4)→T4/T7; 5 form sections (§5.2)→T6; live document, no RAB (§5.3)→T5; data model (§6)→T2; calc helpers (§7)→T1; reuse extraction (§4 files / spec §10)→T4. Deferred items (schedule matrix, Convert-Deal generation, persistence) correctly absent.
- **Placeholders:** logic/data/shared components have full code; the two largest UI files (SphForm T6, parts of LineItemEditor) give concrete section-by-section specs with exact components + the working patterns to copy (Combobox/field-array/MoneyInput) — adapted to real radix-nova APIs at build time, consistent with how Phase 0/2 were built. No "TBD".
- **Type consistency:** `SphFormValues` (T2) is the single shape used by `SphDocument` (T5), `SphForm` (T6), `SphBuilder` (T7). `totalPenawaran`/`margin`/`terminPersenTotal`/`isTerminValid` (T1) names match all call sites. `MoneyInput` gains `onValueChange` in T4, used by LineItemEditor + RAB.
- **Out of scope (correctly absent):** schedule matrix, real generation/persistence/PDF/email, RBAC.
```
