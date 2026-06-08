# Frontend Prototype — Phase 2 · Master Data (Katalog + Karyawan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Master Data module by building the **Katalog Layanan** and **Karyawan** screens (list → rich detail drawer) on the proven Perusahaan template, after extracting the shared detail-drawer toolkit so it's reused, not copied.

**Architecture:** Each module repeats the Phase 1 mock-data spine (`schemas/ → fixtures/ → data/ → query/ → (app)/<m>/page.tsx`) and renders through the reusable `DataTable` with a right-side detail `Sheet`. Shared drawer pieces (stat tiles, info rows, section labels, contact cards) move into `src/components/shared/detail-drawer.tsx` so Perusahaan/Katalog/Karyawan (and all later modules) consume one toolkit.

**Tech Stack:** TypeScript · Next.js App Router · TanStack Query · Zod · shadcn/ui (DataTable, Sheet, Badge, Avatar, Separator) · `formatRupiah`/`formatRupiahCompact` · Lucide · Vitest (data-layer tests).

**Scope:** Master Data completion only — Katalog Layanan + Karyawan. Profil Perusahaan (a single settings page, not a list) and all other modules are later Phase 2 plans. Read-only walkthrough: forms/edit are out of scope; the detail drawer is read-only. Fields derive from [EP-02 Master Data](../user-stories/02-master-data.md) (FR-02.2, FR-02.3, §5.2–5.3). UI Bahasa-Indonesia, tokens only.

**Source of truth for fields:** [planning/user-stories/02-master-data.md](../user-stories/02-master-data.md). **Template to copy:** `src/app/(app)/perusahaan/page.tsx` + `src/lib/{schemas,fixtures,data,query}/perusahaan.ts` (Phase 1 F-05).

---

## File Structure

```
src/
  components/shared/
    detail-drawer.tsx        NEW — StatTile, InfoRow, InfoList, SectionLabel, ContactCard, initials()
  lib/
    schemas/katalog.ts       NEW    fixtures/katalog.ts   NEW
    data/katalog.ts          NEW    query/katalog.ts      NEW
    schemas/karyawan.ts      NEW    fixtures/karyawan.ts  NEW
    data/karyawan.ts         NEW    query/karyawan.ts     NEW
    __tests__/katalog-data.test.ts   NEW
    __tests__/karyawan-data.test.ts  NEW
  app/(app)/
    katalog/page.tsx         REPLACE placeholder → real list + detail
    karyawan/page.tsx        REPLACE placeholder → real list + detail
    perusahaan/page.tsx      MODIFY — consume shared detail-drawer toolkit (remove local copies)
```

The `_delay.ts` helper, `DataTable`, `ErrorState`, and the `ColumnMeta` augmentation already exist — reuse, don't recreate.

---

## Task 1: Extract the shared detail-drawer toolkit + refactor Perusahaan

**Files:** Create `src/components/shared/detail-drawer.tsx`; modify `src/app/(app)/perusahaan/page.tsx` to import from it.

- [ ] **Step 1: Create the toolkit** — `src/components/shared/detail-drawer.tsx`

```tsx
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { LucideIcon } from "lucide-react";

export function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

/** A KPI tile for the drawer summary grid. `title` overrides the hover tooltip (e.g. exact money). */
export function StatTile({ label, value, icon: Icon, mono, title }: {
  label: string; value: string; icon: LucideIcon; mono?: boolean; title?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p
        className={cn("mt-1 truncate text-base font-semibold text-foreground", mono && "font-mono tabular-nums")}
        title={title ?? value}
      >
        {value}
      </p>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words hyphens-none text-sm">{value}</dd>
    </div>
  );
}

/** Wraps InfoRow children in a divided <dl>. */
export function InfoList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-border">{children}</dl>;
}

/** A person card: avatar initials + name + role + phone/email. Used for PICs and could be reused. */
export function ContactCard({ name, role, phone, email }: {
  name: string; role: string; phone: string; email: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-9"><AvatarFallback className="text-xs">{initials(name)}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
      <div className="mt-2.5 grid gap-1 text-xs">
        <a href={`tel:${phone}`} className="font-mono text-muted-foreground hover:text-foreground">{phone}</a>
        <a href={`mailto:${email}`} className="truncate text-primary hover:underline">{email}</a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Refactor Perusahaan to use the toolkit** — in `src/app/(app)/perusahaan/page.tsx`:
  - DELETE the local `initials`, `Stat`, `PicCard`, `InfoRow`, `SectionLabel` definitions.
  - ADD `import { StatTile, InfoRow, InfoList, SectionLabel, ContactCard } from "@/components/shared/detail-drawer";`
  - Replace `<Stat .../>` usages with `<StatTile .../>` (same props: `label`, `value`, `icon`, `mono`, `title`).
  - Replace the PIC `.map` to render `<ContactCard key={pic.email} name={pic.nama} role={pic.jabatan} phone={pic.telepon} email={pic.email} />`.
  - Replace the `<dl className="divide-y divide-border">…</dl>` with `<InfoList>…</InfoList>` containing `<InfoRow/>`s (unchanged props).
  - Keep `StatusBadge`, `makeColumns`, the page, and the header exactly as they are.

- [ ] **Step 3: Verify** — `npm run build` (exit 0, no type errors) and `npm test` (22 pass). Smoke: `/perusahaan` detail drawer renders identically (summary tiles, 3 PIC cards, info rows). If a dev server is running, kill it after; don't leave one foregrounded.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/detail-drawer.tsx "src/app/(app)/perusahaan/page.tsx"
git commit -m "refactor(shared): extract detail-drawer toolkit; Perusahaan consumes it"
```

---

## Task 2: Katalog Layanan (list + detail)

Fields from [EP-02 FR-02.2 / US-02.2](../user-stories/02-master-data.md): nama, jenis dokumen, kewenangan, dasar hukum, harga standar (optional), tag berulang, template milestone (optional). Status is Aktif/Terarsip (§6).

**Files:** Create `src/lib/schemas/katalog.ts`, `src/lib/fixtures/katalog.ts`, `src/lib/data/katalog.ts`, `src/lib/query/katalog.ts`, `src/lib/__tests__/katalog-data.test.ts`; replace `src/app/(app)/katalog/page.tsx`.

- [ ] **Step 1: Schema** — `src/lib/schemas/katalog.ts`

```ts
import { z } from "zod";

export const katalogStatus = z.enum(["aktif", "terarsip"]);

export const layananSchema = z.object({
  id: z.string(),
  nama: z.string(),
  jenisDokumen: z.string(), // e.g. "Pertek", "AMDAL", "UKL-UPL", "SPPL"
  kewenangan: z.string(), // e.g. "Pusat (KLHK)", "Provinsi", "Kabupaten/Kota"
  dasarHukum: z.string(), // e.g. "PP No. 22 Tahun 2021"
  hargaStandar: z.number().nullable(), // IDR; null = isi manual di SPH
  tags: z.array(z.string()),
  templateMilestone: z.string().nullable(),
  status: katalogStatus,
  metrik: z.object({
    dipakaiSPH: z.number(),
    dipakaiProyek: z.number(),
  }),
});

export type Layanan = z.infer<typeof layananSchema>;
```

- [ ] **Step 2: Fixtures** — `src/lib/fixtures/katalog.ts` (6 realistic environmental-consulting services)

```ts
import type { Layanan } from "@/lib/schemas/katalog";

export const katalogFixtures: Layanan[] = [
  { id: "LYN-001", nama: "Penyusunan Pertek Air Limbah", jenisDokumen: "Pertek", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 75_000_000, tags: ["Air Limbah"], templateMilestone: "Pertek 5 Tahap", status: "aktif", metrik: { dipakaiSPH: 12, dipakaiProyek: 7 } },
  { id: "LYN-002", nama: "Dokumen AMDAL", jenisDokumen: "AMDAL", kewenangan: "Pusat (KLHK)", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 350_000_000, tags: ["AMDAL", "Kajian Besar"], templateMilestone: "AMDAL Lengkap", status: "aktif", metrik: { dipakaiSPH: 4, dipakaiProyek: 2 } },
  { id: "LYN-003", nama: "Dokumen UKL-UPL", jenisDokumen: "UKL-UPL", kewenangan: "Kabupaten/Kota", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 45_000_000, tags: [], templateMilestone: "UKL-UPL Standar", status: "aktif", metrik: { dipakaiSPH: 18, dipakaiProyek: 11 } },
  { id: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", jenisDokumen: "Laporan", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 25_000_000, tags: ["Laporan Semester", "Berulang"], templateMilestone: null, status: "aktif", metrik: { dipakaiSPH: 22, dipakaiProyek: 14 } },
  { id: "LYN-005", nama: "Persetujuan Teknis Emisi Udara", jenisDokumen: "Pertek", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 11 Tahun 2021", hargaStandar: 68_000_000, tags: ["Emisi Udara"], templateMilestone: "Pertek 5 Tahap", status: "aktif", metrik: { dipakaiSPH: 6, dipakaiProyek: 3 } },
  { id: "LYN-006", nama: "Penyusunan SPPL", jenisDokumen: "SPPL", kewenangan: "Kabupaten/Kota", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: null, tags: [], templateMilestone: null, status: "terarsip", metrik: { dipakaiSPH: 2, dipakaiProyek: 1 } },
];
```

- [ ] **Step 3: Data accessor** — `src/lib/data/katalog.ts`

```ts
import { delay } from "@/lib/data/_delay";
import { katalogFixtures } from "@/lib/fixtures/katalog";
import { layananSchema, type Layanan } from "@/lib/schemas/katalog";

export type ListKatalogParams = { q?: string };

export async function listKatalog(params: ListKatalogParams = {}): Promise<Layanan[]> {
  await delay();
  const rows = layananSchema.array().parse(katalogFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) => r.nama.toLowerCase().includes(q) || r.jenisDokumen.toLowerCase().includes(q),
  );
}

export async function getLayanan(id: string): Promise<Layanan | null> {
  await delay(300);
  const row = katalogFixtures.find((r) => r.id === id);
  return row ? layananSchema.parse(row) : null;
}
```

- [ ] **Step 4: Test** — `src/lib/__tests__/katalog-data.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { listKatalog, getLayanan } from "@/lib/data/katalog";

describe("listKatalog", () => {
  it("returns all seeded services matching the schema", async () => {
    const rows = await listKatalog();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows[0]).toMatchObject({ id: expect.any(String), nama: expect.any(String), status: expect.stringMatching(/aktif|terarsip/) });
  });
  it("filters by nama or jenis dokumen", async () => {
    expect((await listKatalog({ q: "amdal" })).length).toBe(1);
    expect((await listKatalog({ q: "pertek" })).length).toBe(2);
  });
});

describe("getLayanan", () => {
  it("returns a service by id", async () => {
    expect((await getLayanan("LYN-002"))?.jenisDokumen).toBe("AMDAL");
  });
  it("returns null for unknown id", async () => {
    expect(await getLayanan("NOPE")).toBeNull();
  });
});
```
Run `npm test` → all pass (existing 22 + 4 new = 26).

- [ ] **Step 5: Query hook** — `src/lib/query/katalog.ts`

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { listKatalog, type ListKatalogParams } from "@/lib/data/katalog";

export function useKatalogList(params: ListKatalogParams = {}) {
  return useQuery({ queryKey: ["katalog", params], queryFn: () => listKatalog(params) });
}
```

- [ ] **Step 6: Page** — replace `src/app/(app)/katalog/page.tsx`

```tsx
"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen, FileText, FolderKanban, Tag } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { StatTile, InfoRow, InfoList, SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKatalogList } from "@/lib/query/katalog";
import type { Layanan } from "@/lib/schemas/katalog";

function StatusBadge({ status }: { status: Layanan["status"] }) {
  return status === "aktif" ? (
    <Badge variant="success">Aktif</Badge>
  ) : (
    <Badge variant="secondary">Terarsip</Badge>
  );
}

function harga(value: number | null) {
  return value === null ? "Manual" : formatRupiahCompact(value);
}

function makeColumns(onOpen: (l: Layanan) => void): ColumnDef<Layanan>[] {
  return [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama Layanan",
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    {
      accessorKey: "jenisDokumen", header: "Jenis",
      cell: ({ row }) => <Badge variant="info">{row.original.jenisDokumen}</Badge>,
    },
    { accessorKey: "kewenangan", header: "Kewenangan" },
    {
      accessorKey: "hargaStandar", header: "Harga Standar",
      meta: { align: "right", mono: true },
      cell: ({ row }) => harga(row.original.hargaStandar),
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

function LayananDetail({ l }: { l: Layanan }) {
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Harga Standar" value={harga(l.hargaStandar)} title={l.hargaStandar === null ? "Diisi manual di SPH" : formatRupiah(l.hargaStandar)} icon={BookOpen} mono />
          <StatTile label="Dipakai di SPH" value={String(l.metrik.dipakaiSPH)} icon={FileText} />
          <StatTile label="Proyek" value={String(l.metrik.dipakaiProyek)} icon={FolderKanban} />
          <StatTile label="Jumlah Tag" value={String(l.tags.length)} icon={Tag} />
        </div>
      </section>

      {l.tags.length > 0 && (
        <section>
          <SectionLabel>Tag</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {l.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Detail Layanan</SectionLabel>
        <InfoList>
          <InfoRow label="Jenis Dokumen" value={l.jenisDokumen} />
          <InfoRow label="Kewenangan" value={l.kewenangan} />
          <InfoRow label="Dasar Hukum" value={l.dasarHukum} />
          <InfoRow label="Template Milestone" value={l.templateMilestone ?? "—"} />
        </InfoList>
      </section>
    </div>
  );
}

export default function KatalogPage() {
  const { data, isLoading, isError, refetch } = useKatalogList();
  const [selected, setSelected] = useState<Layanan | null>(null);
  const columns = makeColumns(setSelected);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Katalog Layanan</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="nama" searchPlaceholder="Cari nama layanan…" emptyMessage="Belum ada layanan" />
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </div>
                <SheetTitle className="text-lg leading-tight font-semibold break-words">{selected.nama}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">{selected.id}</SheetDescription>
                  <StatusBadge status={selected.status} />
                </div>
              </SheetHeader>
              <LayananDetail l={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```
CONFIRM the `DataTable` `meta: { align: "right", mono: true }` and prop names against `src/components/shared/data-table.tsx` before finishing (they match Phase 1). The placeholder import that previously lived in this file (`PagePlaceholder`) is fully replaced.

- [ ] **Step 7: Verify** — `npm run build` (exit 0), `npm test` (26 pass), smoke `/katalog` (skeleton → 6 rows; click a name → drawer with harga/tags/detail; harga "Manual" for the null one). Kill any dev server.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas/katalog.ts src/lib/fixtures/katalog.ts src/lib/data/katalog.ts src/lib/query/katalog.ts src/lib/__tests__/katalog-data.test.ts "src/app/(app)/katalog/page.tsx"
git commit -m "feat(katalog): service catalog list + detail drawer (EP-02 FR-02.2)"
```

---

## Task 3: Karyawan (list + detail)

Fields from [EP-02 FR-02.3 / §5.3](../user-stories/02-master-data.md): nama, jabatan, status kepegawaian (+ pengali), gaji pokok, tunjangan default, info bank, NPWP/PTKP, tanggal masuk. Record status Aktif/Terarsip.

**Files:** Create `src/lib/schemas/karyawan.ts`, `src/lib/fixtures/karyawan.ts`, `src/lib/data/karyawan.ts`, `src/lib/query/karyawan.ts`, `src/lib/__tests__/karyawan-data.test.ts`; replace `src/app/(app)/karyawan/page.tsx`.

- [ ] **Step 1: Schema** — `src/lib/schemas/karyawan.ts`

```ts
import { z } from "zod";

export const karyawanStatus = z.enum(["aktif", "terarsip"]);
export const statusKepegawaian = z.enum(["tetap", "kontrak", "probation"]);

export const karyawanSchema = z.object({
  id: z.string(),
  nama: z.string(),
  jabatan: z.string(), // from EP-00 master, free text here
  statusKepegawaian: statusKepegawaian,
  pengali: z.number(), // payroll multiplier, e.g. 1.0 / 0.8
  gajiPokok: z.number(), // IDR
  tunjangan: z.number(), // IDR, default allowances
  bank: z.object({ nama: z.string(), nomor: z.string(), atasNama: z.string() }),
  npwp: z.string(),
  email: z.string().email(),
  tanggalMasuk: z.string(), // ISO date "2022-03-01"
  status: karyawanStatus,
});

export type Karyawan = z.infer<typeof karyawanSchema>;
```

- [ ] **Step 2: Fixtures** — `src/lib/fixtures/karyawan.ts` (6 staff across roles)

```ts
import type { Karyawan } from "@/lib/schemas/karyawan";

export const karyawanFixtures: Karyawan[] = [
  { id: "KRY-001", nama: "Budi Santoso", jabatan: "Direktur", statusKepegawaian: "tetap", pengali: 1, gajiPokok: 25_000_000, tunjangan: 5_000_000, bank: { nama: "BCA", nomor: "1234567890", atasNama: "Budi Santoso" }, npwp: "09.111.222.3-444.000", email: "budi@sinarbuana.co.id", tanggalMasuk: "2019-01-15", status: "aktif" },
  { id: "KRY-002", nama: "Rina Marlina", jabatan: "Manajer Keuangan", statusKepegawaian: "tetap", pengali: 1, gajiPokok: 14_000_000, tunjangan: 2_500_000, bank: { nama: "Mandiri", nomor: "1390011223344", atasNama: "Rina Marlina" }, npwp: "09.222.333.4-555.000", email: "rina@sinarbuana.co.id", tanggalMasuk: "2020-06-01", status: "aktif" },
  { id: "KRY-003", nama: "Agus Setiawan", jabatan: "Ketua Tim Teknis", statusKepegawaian: "tetap", pengali: 1, gajiPokok: 12_000_000, tunjangan: 2_000_000, bank: { nama: "BNI", nomor: "0559332815", atasNama: "Agus Setiawan" }, npwp: "09.333.444.5-666.000", email: "agus@sinarbuana.co.id", tanggalMasuk: "2021-02-10", status: "aktif" },
  { id: "KRY-004", nama: "Dewi Anggraini", jabatan: "Anggota Tim Teknis", statusKepegawaian: "kontrak", pengali: 1, gajiPokok: 8_500_000, tunjangan: 1_200_000, bank: { nama: "BRI", nomor: "302201998877", atasNama: "Dewi Anggraini" }, npwp: "09.444.555.6-777.000", email: "dewi@sinarbuana.co.id", tanggalMasuk: "2023-08-01", status: "aktif" },
  { id: "KRY-005", nama: "Fajar Ramadhan", jabatan: "Document Controller", statusKepegawaian: "probation", pengali: 0.8, gajiPokok: 6_500_000, tunjangan: 800_000, bank: { nama: "BCA", nomor: "5566778899", atasNama: "Fajar Ramadhan" }, npwp: "09.555.666.7-888.000", email: "fajar@sinarbuana.co.id", tanggalMasuk: "2026-03-01", status: "aktif" },
  { id: "KRY-006", nama: "Sari Wulandari", jabatan: "Staf Marketing", statusKepegawaian: "kontrak", pengali: 1, gajiPokok: 7_000_000, tunjangan: 1_000_000, bank: { nama: "Mandiri", nomor: "1390099887766", atasNama: "Sari Wulandari" }, npwp: "09.666.777.8-999.000", email: "sari@sinarbuana.co.id", tanggalMasuk: "2022-11-20", status: "terarsip" },
];
```

- [ ] **Step 3: Data accessor** — `src/lib/data/karyawan.ts`

```ts
import { delay } from "@/lib/data/_delay";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import { karyawanSchema, type Karyawan } from "@/lib/schemas/karyawan";

export type ListKaryawanParams = { q?: string };

export async function listKaryawan(params: ListKaryawanParams = {}): Promise<Karyawan[]> {
  await delay();
  const rows = karyawanSchema.array().parse(karyawanFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) => r.nama.toLowerCase().includes(q) || r.jabatan.toLowerCase().includes(q),
  );
}

export async function getKaryawan(id: string): Promise<Karyawan | null> {
  await delay(300);
  const row = karyawanFixtures.find((r) => r.id === id);
  return row ? karyawanSchema.parse(row) : null;
}
```

- [ ] **Step 4: Test** — `src/lib/__tests__/karyawan-data.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { listKaryawan, getKaryawan } from "@/lib/data/karyawan";

describe("listKaryawan", () => {
  it("returns all seeded staff matching the schema", async () => {
    const rows = await listKaryawan();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows[0]).toMatchObject({ id: expect.any(String), nama: expect.any(String), statusKepegawaian: expect.stringMatching(/tetap|kontrak|probation/) });
  });
  it("filters by nama or jabatan", async () => {
    expect((await listKaryawan({ q: "budi" })).length).toBe(1);
    expect((await listKaryawan({ q: "teknis" })).length).toBe(2);
  });
});

describe("getKaryawan", () => {
  it("returns a person by id", async () => {
    expect((await getKaryawan("KRY-001"))?.nama).toBe("Budi Santoso");
  });
  it("returns null for unknown id", async () => {
    expect(await getKaryawan("NOPE")).toBeNull();
  });
});
```
Run `npm test` → all pass (26 + 4 = 30).

- [ ] **Step 5: Query hook** — `src/lib/query/karyawan.ts`

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { listKaryawan, type ListKaryawanParams } from "@/lib/data/karyawan";

export function useKaryawanList(params: ListKaryawanParams = {}) {
  return useQuery({ queryKey: ["karyawan", params], queryFn: () => listKaryawan(params) });
}
```

- [ ] **Step 6: Page** — replace `src/app/(app)/karyawan/page.tsx`. Mirror the Perusahaan page structure: header with an avatar (initials) instead of an icon box, a `StatusKepegawaianBadge`, summary tiles (Gaji Pokok, Tunjangan, Pengali, Masa Kerja), and an info list (NPWP, Bank, Email, Tanggal Masuk).

```tsx
"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Users, Wallet, HandCoins, Gauge, CalendarDays } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { StatTile, InfoRow, InfoList, SectionLabel, initials } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKaryawanList } from "@/lib/query/karyawan";
import type { Karyawan } from "@/lib/schemas/karyawan";

const KEPEGAWAIAN: Record<Karyawan["statusKepegawaian"], { label: string; variant: "success" | "info" | "warning" }> = {
  tetap: { label: "Tetap", variant: "success" },
  kontrak: { label: "Kontrak", variant: "info" },
  probation: { label: "Probation", variant: "warning" },
};

function KepegawaianBadge({ status }: { status: Karyawan["statusKepegawaian"] }) {
  const k = KEPEGAWAIAN[status];
  return <Badge variant={k.variant}>{k.label}</Badge>;
}

/** Whole years since an ISO date, e.g. "4 tahun". */
function masaKerja(isoDate: string): string {
  const start = new Date(isoDate);
  const years = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years <= 0 ? "< 1 tahun" : `${years} tahun`;
}

function tanggalID(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function makeColumns(onOpen: (k: Karyawan) => void): ColumnDef<Karyawan>[] {
  return [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama",
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { accessorKey: "jabatan", header: "Jabatan" },
    {
      accessorKey: "statusKepegawaian", header: "Status",
      cell: ({ row }) => <KepegawaianBadge status={row.original.statusKepegawaian} />,
    },
    {
      accessorKey: "tanggalMasuk", header: "Tanggal Masuk",
      cell: ({ row }) => tanggalID(row.original.tanggalMasuk),
    },
  ];
}

function KaryawanDetail({ k }: { k: Karyawan }) {
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Gaji Pokok" value={formatRupiahCompact(k.gajiPokok)} title={formatRupiah(k.gajiPokok)} icon={Wallet} mono />
          <StatTile label="Tunjangan" value={formatRupiahCompact(k.tunjangan)} title={formatRupiah(k.tunjangan)} icon={HandCoins} mono />
          <StatTile label="Pengali" value={`${k.pengali}×`} icon={Gauge} mono />
          <StatTile label="Masa Kerja" value={masaKerja(k.tanggalMasuk)} icon={CalendarDays} />
        </div>
      </section>

      <section>
        <SectionLabel>Data Karyawan</SectionLabel>
        <InfoList>
          <InfoRow label="Jabatan" value={k.jabatan} />
          <InfoRow label="NPWP" value={<span className="font-mono">{k.npwp}</span>} />
          <InfoRow label="Bank" value={`${k.bank.nama} • ${k.bank.nomor}`} />
          <InfoRow label="a.n." value={k.bank.atasNama} />
          <InfoRow label="Email" value={<a href={`mailto:${k.email}`} className="text-primary hover:underline">{k.email}</a>} />
          <InfoRow label="Tanggal Masuk" value={tanggalID(k.tanggalMasuk)} />
        </InfoList>
      </section>
    </div>
  );
}

export default function KaryawanPage() {
  const { data, isLoading, isError, refetch } = useKaryawanList();
  const [selected, setSelected] = useState<Karyawan | null>(null);
  const columns = makeColumns(setSelected);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Karyawan</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="nama" searchPlaceholder="Cari nama karyawan…" emptyMessage="Belum ada karyawan" />
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <Avatar className="mb-1 size-10"><AvatarFallback>{initials(selected.nama)}</AvatarFallback></Avatar>
                <SheetTitle className="text-lg leading-tight font-semibold break-words">{selected.nama}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">{selected.id}</SheetDescription>
                  <KepegawaianBadge status={selected.statusKepegawaian} />
                </div>
              </SheetHeader>
              <KaryawanDetail k={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 7: Verify** — `npm run build` (exit 0), `npm test` (30 pass), smoke `/karyawan` (skeleton → 6 rows; click → drawer with avatar header, gaji/tunjangan/pengali/masa kerja tiles, bank + NPWP info; Probation row shows a warning badge and 0.8× pengali). Kill any dev server.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas/karyawan.ts src/lib/fixtures/karyawan.ts src/lib/data/karyawan.ts src/lib/query/karyawan.ts src/lib/__tests__/karyawan-data.test.ts "src/app/(app)/karyawan/page.tsx"
git commit -m "feat(karyawan): employee list + detail drawer (EP-02 FR-02.3)"
```

---

## Task 4: Human review gate — Master Data complete

- [ ] **Step 1:** `npm run dev`. Present `/katalog` and `/karyawan`: list (skeleton → data → filter → pagination) and the detail drawer for each; confirm both match the Perusahaan pattern and the data reads right (Bahasa-Indonesia, IDR, badges). Confirm the refactored `/perusahaan` still renders identically.
- [ ] **Step 2:** Capture feedback; address before moving to the next module group (Penawaran).

---

## Self-Review (completed)

- **Spec coverage:** FR-02.2 Katalog (nama/jenis/kewenangan/dasar hukum/harga standar/tag/template milestone) → Task 2 schema+page. FR-02.3 Karyawan (nama/jabatan/status+pengali/gaji/tunjangan/bank/NPWP/tanggal masuk) → Task 3 schema+page. Status Aktif/Terarsip (§6) → both `status` enums. Soft-delete (FR-02.8) is represented as a `terarsip` status value (no destructive delete; matches read-only scope). Profil Perusahaan (FR-02.4) and the EP-00-driven dropdowns/forms (FR-02.5, create/edit) are out of scope here and noted.
- **Placeholders:** none — every file has full code; fixtures are concrete; tests have real assertions.
- **Type consistency:** `Layanan`/`listKatalog`/`useKatalogList`/`["katalog",params]` and `Karyawan`/`listKaryawan`/`useKaryawanList`/`["karyawan",params]` are internally consistent. Shared `StatTile`/`InfoRow`/`InfoList`/`SectionLabel`/`ContactCard`/`initials` signatures (Task 1) match every consumer (Tasks 1–3). `meta:{align,mono}` matches the Phase 1 `ColumnMeta` augmentation.
- **Reuse:** Task 1 removes the duplication risk by extracting the drawer toolkit before replication; Katalog/Karyawan import it rather than copying.
- **Out of scope (correctly absent):** create/edit forms, soft-delete actions, RBAC, real persistence, Profil Perusahaan.
```
