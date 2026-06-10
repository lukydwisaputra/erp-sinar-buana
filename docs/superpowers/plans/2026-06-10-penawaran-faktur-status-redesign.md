# Penawaran & Faktur Status Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ditolak`/`dibatalkan` statuses, rename displayed labels, redesign the Penawaran row action menu with confirmation dialogs, and introduce read-only views for locked Faktur/SPH states.

**Architecture:** Schema enums expand first (foundation), then data/query layers, then each UI surface (Penawaran list page, SPH builder, Faktur builder) in isolated tasks. Each task commits independently and leaves the app in a working state.

**Tech Stack:** Next.js 15 (App Router, server components), React Query v5, Zod, shadcn/ui, Vitest, Lucide icons.

---

## File Map

| File | Action |
|---|---|
| `src/lib/schemas/penawaran.ts` | Add `ditolak`, `dibatalkan` to `sphStatus` enum |
| `src/lib/schemas/faktur.ts` | Add `dibatalkan` to `fakturStatus` enum |
| `src/lib/__tests__/penawaran-data.test.ts` | Update status regex to cover new enum values |
| `src/lib/faktur.ts` | Add `dibatalkan` to `TerminPaymentStatus`; update `terminStatusOf`, `isFakturOverdue` |
| `src/components/faktur/deal-termin-card.tsx` | Add `dibatalkan` badge; rename "Draft" → "Draf" |
| `src/lib/data/penawaran.ts` | Add `deletePenawaran` |
| `src/lib/data/faktur.ts` | Add `updateFakturStatus`, `deleteAllFakturBySph`; add `FakturStatus` import |
| `src/lib/__tests__/penawaran-data.test.ts` | Add `deletePenawaran` tests |
| `src/lib/__tests__/faktur-data.test.ts` | Add `updateFakturStatus`, `deleteAllFakturBySph` tests |
| `src/lib/query/penawaran.ts` | Add `useDeletePenawaran` |
| `src/lib/query/faktur.ts` | Add `useCancelFaktur`, `useDeleteFakturBySph` |
| `src/app/(app)/penawaran/page.tsx` | Expand STATUS map; redesign row action menu; unified status-change dialog |
| `src/components/penawaran/sph-builder.tsx` | Replace Pratinjau button → Unduh; add `SphCancelledView`; route by status |
| `src/components/faktur/faktur-builder.tsx` | Add `FakturReadOnlyView`; add Batalkan button + dialog; route by status |

---

## Task 1 — Schema enums

**Files:**
- Modify: `src/lib/schemas/penawaran.ts:3`
- Modify: `src/lib/schemas/faktur.ts:4`
- Modify: `src/lib/__tests__/penawaran-data.test.ts:9`

- [ ] **Step 1: Expand sphStatus**

In `src/lib/schemas/penawaran.ts`, replace line 3:

```typescript
export const sphStatus = z.enum(["draft", "terkirim", "deal", "ditolak", "dibatalkan"]);
```

- [ ] **Step 2: Expand fakturStatus**

In `src/lib/schemas/faktur.ts`, replace line 4:

```typescript
export const fakturStatus = z.enum(["draft", "terkirim", "lunas", "dibatalkan"]);
```

- [ ] **Step 3: Update test regex**

In `src/lib/__tests__/penawaran-data.test.ts`, replace line 9:

```typescript
status: expect.stringMatching(/draft|terkirim|deal|ditolak|dibatalkan/)
```

- [ ] **Step 4: Run tests — expect all 67 pass**

```bash
npx vitest run
```

Expected: `Test Files 11 passed (11), Tests 67 passed (67)` (schema enums are additive, no breakage).

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas/penawaran.ts src/lib/schemas/faktur.ts src/lib/__tests__/penawaran-data.test.ts
git commit -m "feat(schema): add ditolak/dibatalkan to sphStatus; dibatalkan to fakturStatus"
```

---

## Task 2 — TerminPaymentStatus + DealTerminCard

**Files:**
- Modify: `src/lib/faktur.ts:63-75`
- Modify: `src/components/faktur/deal-termin-card.tsx:13-18`

- [ ] **Step 1: Update TerminPaymentStatus and terminStatusOf**

In `src/lib/faktur.ts`, replace lines 63–75 (`isFakturOverdue`, `TerminPaymentStatus`, `terminStatusOf`):

```typescript
/** A faktur is overdue when its due date passed and it isn't paid or cancelled. */
export function isFakturOverdue(f: Pick<Faktur, "status" | "jatuhTempo">): boolean {
  return (
    f.status !== "lunas" &&
    f.status !== "dibatalkan" &&
    !!f.jatuhTempo &&
    new Date(f.jatuhTempo + "T23:59:59") < new Date()
  );
}

/** Payment status of a single termin, derived from its faktur (or none). */
export type TerminPaymentStatus = "lunas" | "menunggu" | "draft" | "belum" | "dibatalkan";

function terminStatusOf(f: Faktur | null): TerminPaymentStatus {
  if (!f) return "belum";
  if (f.status === "lunas") return "lunas";
  if (f.status === "dibatalkan") return "dibatalkan";
  if (f.status === "draft") return "draft";
  return "menunggu";
}
```

- [ ] **Step 2: Update TERMIN_BADGE in DealTerminCard**

In `src/components/faktur/deal-termin-card.tsx`, replace lines 13–18:

```typescript
const TERMIN_BADGE: Record<TerminPaymentStatus, { label: string; variant: BadgeVariant }> = {
  lunas: { label: "Lunas", variant: "success" },
  menunggu: { label: "Menunggu Bayar", variant: "warning" },
  draft: { label: "Draf", variant: "info" },
  belum: { label: "Belum Difakturkan", variant: "secondary" },
  dibatalkan: { label: "Dibatalkan", variant: "destructive" },
};
```

- [ ] **Step 3: Run tests — expect all 67 pass**

```bash
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/faktur.ts src/components/faktur/deal-termin-card.tsx
git commit -m "feat(faktur): add dibatalkan to TerminPaymentStatus; update isFakturOverdue"
```

---

## Task 3 — Data layer: new functions + tests

**Files:**
- Modify: `src/lib/data/penawaran.ts`
- Modify: `src/lib/data/faktur.ts`
- Modify: `src/lib/__tests__/penawaran-data.test.ts`
- Modify: `src/lib/__tests__/faktur-data.test.ts`

- [ ] **Step 1: Write failing tests for deletePenawaran**

Add to `src/lib/__tests__/penawaran-data.test.ts`:

```typescript
import { listPenawaran, getPenawaran, updatePenawaranStatus, deletePenawaran } from "@/lib/data/penawaran";

// ... existing tests unchanged above ...

describe("deletePenawaran", () => {
  it("removes an SPH from the store", async () => {
    const before = await listPenawaran();
    const target = before.find((s) => s.id === "SPH/005/6.2026");
    expect(target).toBeDefined();
    await deletePenawaran("SPH/005/6.2026");
    const after = await listPenawaran();
    expect(after.find((s) => s.id === "SPH/005/6.2026")).toBeUndefined();
  });

  it("throws for unknown id", async () => {
    await expect(deletePenawaran("SPH/999/0.0000")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/lib/__tests__/penawaran-data.test.ts
```

Expected: FAIL — `deletePenawaran is not a function` (or import error).

- [ ] **Step 3: Implement deletePenawaran**

Add to the bottom of `src/lib/data/penawaran.ts`:

```typescript
export async function deletePenawaran(id: string): Promise<void> {
  await delay(300);
  const idx = penawaranFixtures.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`SPH ${id} not found`);
  penawaranFixtures.splice(idx, 1);
}
```

- [ ] **Step 4: Write failing tests for faktur data functions**

Add to `src/lib/__tests__/faktur-data.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { listFaktur, getFaktur, updateFakturStatus, deleteAllFakturBySph } from "@/lib/data/faktur";

// ... existing tests unchanged above ...

describe("updateFakturStatus", () => {
  it("changes a faktur status in the store", async () => {
    await updateFakturStatus("INV/001/2026-T2", "dibatalkan");
    const f = await getFaktur("INV/001/2026-T2");
    expect(f?.status).toBe("dibatalkan");
  });

  it("throws for unknown id", async () => {
    await expect(updateFakturStatus("INV/999/0000-T9", "dibatalkan")).rejects.toThrow();
  });
});

describe("deleteAllFakturBySph", () => {
  it("removes all fakturs linked to an sphId", async () => {
    const sphId = "SPH/002/5.2026";
    const before = await listFaktur();
    const linked = before.filter((f) => f.sphId === sphId);
    expect(linked.length).toBeGreaterThanOrEqual(1);
    await deleteAllFakturBySph(sphId);
    const after = await listFaktur();
    expect(after.filter((f) => f.sphId === sphId).length).toBe(0);
  });
});
```

- [ ] **Step 5: Run faktur-data tests — expect FAIL**

```bash
npx vitest run src/lib/__tests__/faktur-data.test.ts
```

Expected: FAIL — `updateFakturStatus is not a function`.

- [ ] **Step 6: Implement faktur data functions**

In `src/lib/data/faktur.ts`, add `type FakturStatus` to the existing import (line 5):

```typescript
import { fakturSchema, type Faktur, type FakturStatus } from "@/lib/schemas/faktur";
```

Add at the bottom of `src/lib/data/faktur.ts`:

```typescript
export async function updateFakturStatus(id: string, newStatus: FakturStatus): Promise<void> {
  await delay(300);
  const idx = fakturFixtures.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error(`Faktur ${id} not found`);
  fakturFixtures[idx] = { ...fakturFixtures[idx], status: newStatus };
}

export async function deleteAllFakturBySph(sphId: string): Promise<void> {
  await delay(300);
  for (let i = fakturFixtures.length - 1; i >= 0; i--) {
    if (fakturFixtures[i].sphId === sphId) fakturFixtures.splice(i, 1);
  }
}
```

- [ ] **Step 7: Run all tests — expect all pass**

```bash
npx vitest run
```

Expected: all tests pass (≥69 now with new tests).

- [ ] **Step 8: Commit**

```bash
git add src/lib/data/penawaran.ts src/lib/data/faktur.ts \
        src/lib/__tests__/penawaran-data.test.ts src/lib/__tests__/faktur-data.test.ts
git commit -m "feat(data): add deletePenawaran, updateFakturStatus, deleteAllFakturBySph"
```

---

## Task 4 — Query layer: new hooks

**Files:**
- Modify: `src/lib/query/penawaran.ts`
- Modify: `src/lib/query/faktur.ts`

No tests — query hooks are thin wrappers over data functions; integration is covered by the UI.

- [ ] **Step 1: Add useDeletePenawaran**

Replace entire `src/lib/query/penawaran.ts`:

```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPenawaran,
  updatePenawaranStatus,
  deletePenawaran,
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

export function useDeletePenawaran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePenawaran(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
    },
  });
}
```

- [ ] **Step 2: Add useCancelFaktur and useDeleteFakturBySph**

Replace entire `src/lib/query/faktur.ts`:

```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFaktur, updateFakturStatus, deleteAllFakturBySph } from "@/lib/data/faktur";
import { updatePenawaranStatus } from "@/lib/data/penawaran";

export function useFakturList(q?: string) {
  return useQuery({ queryKey: ["faktur", { q }], queryFn: () => listFaktur({ q }) });
}

/** Cancel a faktur and its linked penawaran in one atomic mutation. */
export function useCancelFaktur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fakturId, sphId }: { fakturId: string; sphId: string }) => {
      await updateFakturStatus(fakturId, "dibatalkan");
      if (sphId) await updatePenawaranStatus(sphId, "dibatalkan");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
      qc.invalidateQueries({ queryKey: ["penawaran"] });
    },
  });
}

/** Remove all fakturs linked to a deal SPH (called before deleting a dibatalkan penawaran). */
export function useDeleteFakturBySph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sphId: string) => deleteAllFakturBySph(sphId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
    },
  });
}
```

- [ ] **Step 3: Run tests — expect all pass**

```bash
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/query/penawaran.ts src/lib/query/faktur.ts
git commit -m "feat(query): add useDeletePenawaran, useCancelFaktur, useDeleteFakturBySph"
```

---

## Task 5 — Penawaran page: STATUS labels + row action redesign

**Files:**
- Modify: `src/app/(app)/penawaran/page.tsx` (full rewrite of this file)

- [ ] **Step 1: Replace the entire file**

```typescript
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  FileText, Plus, EllipsisVerticalIcon, SquarePenIcon, Trash2Icon,
  SendIcon, CircleCheckIcon, FileIcon, BanIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRupiah } from "@/lib/format";
import { totalPenawaran } from "@/lib/sph";
import {
  usePenawaranList, useUpdatePenawaranStatus, useDeletePenawaran,
} from "@/lib/query/penawaran";
import { useDeleteFakturBySph } from "@/lib/query/faktur";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

const STATUS: Record<SphStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  draft:      { label: "Draf",       variant: "info" },
  terkirim:   { label: "Terkirim",   variant: "warning" },
  deal:       { label: "Disetujui",  variant: "success" },
  ditolak:    { label: "Ditolak",    variant: "destructive" },
  dibatalkan: { label: "Dibatalkan", variant: "secondary" },
};

const STATUS_DIALOG: Record<SphStatus, { title: string; description: string; action: string; destructive?: boolean }> = {
  draft:      { title: "Ubah ke Draf?",      description: "Status penawaran akan dikembalikan ke Draf.",                                     action: "Ubah ke Draf" },
  terkirim:   { title: "Ubah ke Terkirim?",  description: "Penawaran akan ditandai sebagai sudah dikirimkan ke klien.",                       action: "Ubah ke Terkirim" },
  deal:       { title: "Ubah ke Disetujui?", description: "Faktur termin akan dibuat otomatis. Tindakan ini tidak dapat dibatalkan.",          action: "Disetujui", destructive: false },
  ditolak:    { title: "Batalkan penawaran?", description: "Status berubah ke Ditolak. Tindakan ini tidak dapat dibatalkan.",                  action: "Batalkan", destructive: true },
  dibatalkan: { title: "Batalkan penawaran?", description: "Status berubah ke Dibatalkan.",                                                    action: "Batalkan", destructive: true },
};

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function PenawaranPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePenawaranList();
  const updateStatus  = useUpdatePenawaranStatus();
  const deletePenawaran = useDeletePenawaran();
  const deleteFakturBySph = useDeleteFakturBySph();

  const [statusTarget, setStatusTarget] = React.useState<{ sph: Sph; nextStatus: SphStatus } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Sph | null>(null);

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
        const isDeal       = sph.status === "deal";
        const isDibatalkan = sph.status === "dibatalkan";
        const isDitolak    = sph.status === "ditolak";
        const isLocked     = isDeal || isDibatalkan || isDitolak;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Aksi baris">
                  <EllipsisVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-semibold">Status</DropdownMenuLabel>

                {/* Draf — disabled: always (current or can't go back) */}
                <DropdownMenuItem disabled>
                  <FileIcon className="mr-2 size-4" /> Draf
                </DropdownMenuItem>

                {/* Terkirim — enabled only from draft */}
                <DropdownMenuItem
                  disabled={sph.status !== "draft"}
                  onSelect={() => setStatusTarget({ sph, nextStatus: "terkirim" })}
                >
                  <SendIcon className="mr-2 size-4" /> Terkirim
                </DropdownMenuItem>

                {/* Disetujui — enabled only from terkirim */}
                <DropdownMenuItem
                  disabled={sph.status !== "terkirim"}
                  onSelect={() => setStatusTarget({ sph, nextStatus: "deal" })}
                >
                  <CircleCheckIcon className="mr-2 size-4" /> Disetujui
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Ubah — disabled when locked */}
                <DropdownMenuItem
                  disabled={isLocked}
                  onSelect={() => router.push(`/penawaran/${encodeURIComponent(sph.id)}`)}
                >
                  <SquarePenIcon className="mr-2 size-4" /> Ubah
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Batalkan → Ditolak — enabled only for draft or terkirim */}
                <DropdownMenuItem
                  disabled={sph.status !== "draft" && sph.status !== "terkirim"}
                  variant="destructive"
                  onSelect={(e) => { e.preventDefault(); setStatusTarget({ sph, nextStatus: "ditolak" }); }}
                >
                  <BanIcon className="mr-2 size-4" /> Batalkan
                </DropdownMenuItem>

                {/* Hapus — disabled only when deal */}
                <DropdownMenuItem
                  disabled={isDeal}
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

  const dialogInfo = statusTarget ? STATUS_DIALOG[statusTarget.nextStatus] : null;

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

      {/* Confirm: Status change (Terkirim / Disetujui / Batalkan) */}
      <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogInfo?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogInfo?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={dialogInfo?.destructive ? "destructive" : "default"}
              onClick={() => {
                if (!statusTarget) return;
                updateStatus.mutate(
                  { id: statusTarget.sph.id, status: statusTarget.nextStatus },
                  {
                    onSuccess: () => {
                      toast.success(`Status diubah: ${STATUS[statusTarget.nextStatus].label}`);
                      setStatusTarget(null);
                    },
                  },
                );
              }}
            >
              {dialogInfo?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: Hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleteTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === "dibatalkan"
                ? "Semua faktur terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan."
                : "Tindakan ini tidak dapat dibatalkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                const doDelete = () => {
                  deletePenawaran.mutate(deleteTarget.id, {
                    onSuccess: () => {
                      toast.success(`${deleteTarget.id} dihapus.`);
                      setDeleteTarget(null);
                    },
                  });
                };
                if (deleteTarget.status === "dibatalkan") {
                  deleteFakturBySph.mutate(deleteTarget.id, { onSuccess: doDelete });
                } else {
                  doDelete();
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Run tests — expect all pass**

```bash
npx vitest run
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/penawaran/page.tsx
git commit -m "feat(penawaran): redesign row action menu; rename status labels; unified confirmation dialogs"
```

---

## Task 6 — SPH builder: Unduh button + SphCancelledView

**Files:**
- Modify: `src/components/penawaran/sph-builder.tsx`

Changes:
1. `SphDealView`: remove `fs`/Dialog state; replace "Pratinjau Layar Penuh" with "Unduh" (`window.print()`).
2. Add `SphCancelledView`: same structure, Alert variant destructive, no Kirim button.
3. `SphBuilder`: add routing for `existing.status === "dibatalkan"`.

- [ ] **Step 1: Replace SphDealView and add SphCancelledView**

In `src/components/penawaran/sph-builder.tsx`:

Replace the import block at the top to add `XCircle` and remove `Maximize2, X` (no longer needed in DealView):

```typescript
import { Download, Lock, Save, Send, X, XCircle } from "lucide-react";
```

Replace the entire `SphDealView` function (lines 80–181) with:

```typescript
function sphToFormValues(existing: Sph): SphFormValues {
  return {
    perusahaanId:    existing.perusahaanId,
    perusahaanNama:  existing.perusahaanNama,
    alamat:          existing.alamat,
    tanggal:         existing.tanggal,
    masaBerlakuAktif: existing.masaBerlakuAktif,
    masaBerlakuHari:  existing.masaBerlakuHari,
    kalimatPembuka:  existing.kalimatPembuka,
    lampiran:        existing.lampiran,
    rincianAktif:    existing.rincianAktif,
    items:           existing.items,
    termin:          existing.termin,
    catatan:         existing.catatan,
    ppnAktif:        existing.ppnAktif,
    ppnPersen:       existing.ppnPersen,
    pph23Aktif:      existing.pph23Aktif,
    pph23Persen:     existing.pph23Persen,
    jabatanPenerima: existing.jabatanPenerima,
    picAktif:        existing.picAktif,
    picNama:         existing.picNama,
    picJabatan:      existing.picJabatan,
  };
}

function SphDealView({ existing, noSph }: { existing: Sph; noSph: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [sending, runSend] = usePending();
  React.useEffect(() => setMounted(true), []);

  const values = sphToFormValues(existing);

  const onKirim = async () => {
    await delay();
    toast.success("Demo: SPH tidak benar-benar dikirim");
  };

  return (
    <>
      <div className="space-y-4">
        <Alert>
          <Lock className="size-4" />
          <AlertTitle>Read Only</AlertTitle>
          <AlertDescription>
            Penawaran ini sudah menjadi Deal dan tidak dapat diubah.
          </AlertDescription>
        </Alert>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">{noSph} — Pratinjau Dokumen</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-4" /> Unduh
              </Button>
              <Button size="sm" loading={sending} onClick={() => runSend(onKirim)}>
                <Send className="size-4" /> Kirim
              </Button>
            </div>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <SphCoverLetter values={values} noSph={noSph} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <SphDocumentPackage values={values} noSph={noSph} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function SphCancelledView({ existing, noSph }: { existing: Sph; noSph: string }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const values = sphToFormValues(existing);

  return (
    <>
      <div className="space-y-4">
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>Dibatalkan</AlertTitle>
          <AlertDescription>
            Penawaran ini telah dibatalkan dan tidak dapat diubah.
          </AlertDescription>
        </Alert>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">{noSph} — Pratinjau Dokumen</p>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="size-4" /> Unduh
            </Button>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <SphCoverLetter values={values} noSph={noSph} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <SphDocumentPackage values={values} noSph={noSph} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
```

- [ ] **Step 2: Update SphCancelledView to handle both ditolak and dibatalkan**

The component receives `status` so it can show the right alert message:

```typescript
function SphCancelledView({ existing, noSph }: { existing: Sph; noSph: string }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const values = sphToFormValues(existing);
  const isDitolak = existing.status === "ditolak";

  return (
    <>
      <div className="space-y-4">
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>{isDitolak ? "Ditolak" : "Dibatalkan"}</AlertTitle>
          <AlertDescription>
            {isDitolak
              ? "Penawaran ini telah ditolak dan tidak dapat diubah."
              : "Penawaran ini telah dibatalkan dan tidak dapat diubah."}
          </AlertDescription>
        </Alert>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">{noSph} — Pratinjau Dokumen</p>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="size-4" /> Unduh
            </Button>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <SphCoverLetter values={values} noSph={noSph} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <SphDocumentPackage values={values} noSph={noSph} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
```

- [ ] **Step 3: Update SphBuilder routing**

In `src/components/penawaran/sph-builder.tsx`, replace the routing block inside `SphBuilder` (currently lines 186–188):

```typescript
export function SphBuilder({ existing }: { existing?: Sph }) {
  const noSph = existing?.id ?? "SPH/006/6.2026";

  if (existing?.status === "deal") {
    return <SphDealView existing={existing} noSph={noSph} />;
  }

  if (existing?.status === "dibatalkan" || existing?.status === "ditolak") {
    return <SphCancelledView existing={existing} noSph={noSph} />;
  }

  // ... rest of SphBuilder unchanged (form path)
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/components/penawaran/sph-builder.tsx
git commit -m "feat(sph-builder): replace Pratinjau Penuh with Unduh; add SphCancelledView for ditolak/dibatalkan"
```

---

## Task 7 — Faktur builder: FakturReadOnlyView + Batalkan button

**Files:**
- Modify: `src/components/faktur/faktur-builder.tsx`

Changes:
1. Add `FakturReadOnlyView` (used for `lunas` and `dibatalkan` status).
2. Add Batalkan button + confirmation dialog inside the editable `FakturBuilder`.
3. Route by status at the top of `FakturBuilder`.

- [ ] **Step 1: Replace the entire faktur-builder.tsx**

```typescript
"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Download, Lock, Save, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentBuilder } from "@/components/shared/document/document-builder";
import { DocumentFooter } from "@/components/shared/document/document-footer";
import { FakturForm } from "@/components/faktur/faktur-form";
import { FakturDocument } from "@/components/faktur/faktur-document";
import { fakturFormSchema, type FakturFormValues, type Faktur } from "@/lib/schemas/faktur";
import { companyProfile } from "@/lib/company-profile";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { usePending } from "@/lib/use-pending";
import { delay } from "@/lib/data/_delay";
import { useCancelFaktur } from "@/lib/query/faktur";

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
  bankNama: companyProfile.bank.nama,
  bankAtasNama: companyProfile.bank.atasNama,
  bankNoRekening: companyProfile.bank.noRekening,
  jabatanPenerima: "Direktur",
  picAktif: false,
  picNama: "",
  picJabatan: "",
};

// ─── Read-only view (lunas or dibatalkan) ────────────────────────────────────

function FakturReadOnlyView({ existing }: { existing: Faktur }) {
  const [mounted, setMounted] = React.useState(false);
  const [sending, runSend] = usePending();
  React.useEffect(() => setMounted(true), []);

  const noFaktur = existing.id;
  const values: FakturFormValues = { ...existing };
  const isLunas = existing.status === "lunas";

  const onKirim = async () => {
    await delay();
    toast.success("Demo: faktur tidak benar-benar dikirim");
  };

  return (
    <>
      <div className="space-y-4">
        {isLunas ? (
          <Alert variant="success">
            <Lock className="size-4" />
            <AlertTitle>Read Only</AlertTitle>
            <AlertDescription>Faktur ini sudah lunas dan tidak dapat diubah.</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertTitle>Dibatalkan</AlertTitle>
            <AlertDescription>Faktur ini telah dibatalkan dan tidak dapat diubah.</AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold">{noFaktur} — Pratinjau Faktur</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-4" /> Unduh
              </Button>
              {isLunas && (
                <Button size="sm" loading={sending} onClick={() => runSend(onKirim)}>
                  <Send className="size-4" /> Kirim
                </Button>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <FakturDocument values={values} noFaktur={noFaktur} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <FakturDocument values={values} noFaktur={noFaktur} />
          <div className="doc-print-footer" aria-hidden>
            <DocumentFooter />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── Editable builder ────────────────────────────────────────────────────────

export function FakturBuilder({ existing }: { existing?: Faktur }) {
  const router = useRouter();
  const cancelFaktur = useCancelFaktur();

  if (existing && (existing.status === "lunas" || existing.status === "dibatalkan")) {
    return <FakturReadOnlyView existing={existing} />;
  }

  const noFaktur = existing?.id ?? "INV/???/????";
  const picOptions = perusahaanFixtures.find((p) => p.id === (existing?.perusahaanId ?? ""))?.pic ?? [];
  const form = useForm<FakturFormValues>({
    resolver: zodResolver(fakturFormSchema) as Resolver<FakturFormValues>,
    defaultValues: existing ? { ...existing } : emptyValues,
  });
  const values = form.watch();
  const [saving, runSave] = usePending();
  const [cancelOpen, setCancelOpen] = React.useState(false);

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
    <>
      <DocumentBuilder
        title={existing ? existing.id : "Faktur"}
        subtitle="Susun Faktur per termin. Pratinjau diperbarui otomatis."
        previewTitle="Pratinjau Faktur"
        actions={
          <>
            {existing && (
              <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                <Ban className="size-4" /> Batalkan
              </Button>
            )}
            <Button variant="secondary" loading={saving} onClick={onSimpan}>
              <Save className="size-4" /> Simpan Draf
            </Button>
          </>
        }
        form={<FakturForm form={form} picOptions={picOptions} />}
        sidePreview={<ScaleToFit><FakturDocument values={values} noFaktur={noFaktur} /></ScaleToFit>}
        doc={<FakturDocument values={values} noFaktur={noFaktur} />}
        onKirim={onKirim}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan faktur ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Faktur dan penawaran terkait akan berubah status menjadi Dibatalkan.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!existing) return;
                cancelFaktur.mutate(
                  { fakturId: existing.id, sphId: existing.sphId },
                  {
                    onSuccess: () => {
                      toast.success("Faktur berhasil dibatalkan.");
                      setCancelOpen(false);
                      router.refresh();
                    },
                  },
                );
              }}
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Run tests — expect all pass**

```bash
npx vitest run
```

Expected: all pass (no logic changes to tested functions).

- [ ] **Step 3: Commit**

```bash
git add src/components/faktur/faktur-builder.tsx
git commit -m "feat(faktur-builder): add FakturReadOnlyView; Batalkan button with confirmation"
```

---

## Self-Review

**Spec coverage check:**
- [x] SPH Deal: "Pratinjau Penuh" → "Unduh" — Task 6
- [x] SPH Dibatalkan: read-only, Unduh only — Task 6 (SphCancelledView)
- [x] SPH Ditolak: read-only, Unduh only — Task 6 (SphCancelledView, same component)
- [x] Status labels: Draf / Terkirim / Disetujui / Ditolak / Dibatalkan — Task 5
- [x] Row action menu redesign with Status label + disabled logic — Task 5
- [x] All status changes via confirmation dialog — Task 5
- [x] Batalkan → Ditolak for penawaran — Task 5
- [x] Hapus dibatalkan cascades faktur — Task 5
- [x] Faktur Batalkan button + confirmation — Task 7
- [x] Faktur cancel → sphId status → dibatalkan — Task 4 (useCancelFaktur) + Task 7
- [x] Faktur lunas: read-only, Unduh + Kirim — Task 7 (FakturReadOnlyView)
- [x] Faktur dibatalkan: read-only, Unduh only — Task 7 (FakturReadOnlyView)
- [x] DealTerminCard shows dibatalkan badge — Task 2
- [x] isFakturOverdue excludes dibatalkan — Task 2

**No placeholders found.**

**Type consistency:**
- `SphStatus` = `"draft" | "terkirim" | "deal" | "ditolak" | "dibatalkan"` — defined Task 1, used consistently in Tasks 5–6.
- `FakturStatus` = `"draft" | "terkirim" | "lunas" | "dibatalkan"` — defined Task 1, used in Tasks 3–4–7.
- `TerminPaymentStatus` adds `"dibatalkan"` — Task 2; `TERMIN_BADGE` extended same task.
- `useCancelFaktur` signature `{ fakturId, sphId }` — defined Task 4, consumed Task 7. ✓
- `useDeleteFakturBySph` takes `sphId: string` — defined Task 4, consumed Task 5. ✓
