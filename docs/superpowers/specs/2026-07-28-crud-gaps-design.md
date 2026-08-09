# CRUD Gaps — Arus Kas, Realisasi RAB, Penggajian Batch — Design Spec

> **Branch:** `testing`
> **Date:** 2026-07-28

---

## 1. Goal

Close three CRUD gaps found in a broader audit: Arus Kas manual entries can't be edited or deleted, Realisasi RAB actuals can't be edited (and the delete plumbing that exists is never wired to the UI), and a Penggajian batch can't be cancelled as a whole (only slip-by-slip). All three follow patterns already established elsewhere in this codebase — no new architectural decisions, just filling in the missing piece of an existing pattern.

---

## 2. Part A — Arus Kas manual entries: Edit + Delete

### Current state
- `src/app/(app)/arus-kas/page.tsx`'s table (columns at line 473) has no "Aksi" column at all.
- `src/lib/arus-kas/service.ts` has `createArusKasEntry` only — no update/remove.
- `cashflow_entries` already has `deletedAt`/`deletedBy` (via the `...bookkeeping` spread, `src/lib/db/schema.ts:756`) and `listArusKas` already filters `isNull(deletedAt)` (`service.ts:18`) — the soft-delete convention used by every other module (Penawaran, Proyek, Katalog, Perusahaan) is already half-wired here, just never finished.
- `isLocked` marks trigger-owned automation rows (Faktur/Penggajian/Pajak-sourced) — comment at `service.ts:32` says manual rows are "never `isLocked`... so they stay editable... later if that's ever built." This is that later.
- `isCancelled` is a **different, unrelated** flag — set only by DB triggers (`20_billing_automation.sql:164`, `30_payroll_automation.sql:82`) when a parent invoice/payroll is cancelled, and read everywhere in Dasbor's financial aggregation to exclude the entry from totals while keeping it visible (audit trail). Edit/Delete on manual entries must not touch this field.

### Design
- **Delete:** soft-delete (`deletedAt`/`deletedBy`), same as every other module. Only allowed when `source === 'manual'` — never for automation-owned rows, locked or not (deleting an automation row would desync it from its owning Faktur/Penggajison/Pajak record).
- **Edit:** update `type`, `date`, `amount`, `categoryId`, `description` — same fields as create. Same `source === 'manual'` restriction.
- **UI:** a custom "aksi" column (not `DataTable`'s generic `rowActions`, which applies uniformly to every row — Pajak's page already establishes the custom-column pattern for exactly this per-row-conditional need, `pajak/page.tsx:210-213`). Dropdown with Edit/Hapus, rendered only when `row.original.sumber === "manual"`. Edit opens a dialog reusing `CreateEntryDialog`'s field layout (parametrized for edit — prefilled, calls update instead of create). Delete reuses the shared `ConfirmDeleteDialog` (`src/components/shared/confirm-delete-dialog.tsx`).

---

## 3. Part B — Realisasi RAB: Edit + wire up Delete

### Current state
- `src/lib/realisasi-rab/service.ts` exports `create`/`remove` only (`remove` already does the standard soft-delete). No `update`.
- `src/lib/query/realisasi-rab.ts` already has a complete `useRemoveRealisasiRab` hook — but it's **never called anywhere** in the UI. `src/components/proyek/proyek-detail.tsx:858-863` renders the list as plain `<div>` rows with no buttons at all.
- The create flow (`RealisasiRabForm`, `src/components/realisasi-rab/realisasi-rab-form.tsx`) is a `FormSheet` bound to `useCreateRealisasiRab`.

### Design
- **Service:** add `update(userId, id, input)` mirroring `create` — same fields (`kategori`, `rabLineLabel`, `jumlah`, `tanggal`, `keterangan`), guarded by the same not-deleted existence check `remove` already does.
- **Route:** `PATCH /api/realisasi-rab/[id]` alongside the existing `DELETE` in `src/app/api/realisasi-rab/[id]/route.ts`.
- **UI:** `RealisasiRabForm` gets an optional `editing?: RealisasiRab` prop — when present, prefills from it and calls a new `useUpdateRealisasiRab` mutation instead of create. Each row in `proyek-detail.tsx`'s list gets two icon buttons (Pencil/Trash2, matching `proyek-jadwal.tsx`'s existing inline icon-button-per-row pattern, not `DataTable`) wired to open the edit sheet / the shared `ConfirmDeleteDialog` calling the already-built `useRemoveRealisasiRab`.

---

## 4. Part C — Penggajian: cancel a whole batch

### Current state
- A "batch" isn't a table row — `listBatches`/`getBatch` (`src/lib/penggajian/service.ts:70-102`) derive it by grouping `payslips` on `(period_start, period_end)`. There's no batch-level status column to flip.
- Per-slip cancel already exists and is correct: `cancelSlip` (`service.ts:368`) guards via `requireEditableSlip` (`service.ts:289`), which throws `ConflictError` if the slip is already `DIBAYAR` or `BATAL`.
- `POST /api/penggajian/[batchId]/[slipId]/batal/route.ts` is the existing per-slip route.

### Design
- **Service:** add `cancelBatch(userId, batchId)` — fetch every slip in the batch, call the same cancel logic per slip, **skipping** (not failing on) slips already `DIBAYAR`/`BATAL` rather than throwing — a batch-cancel is a bulk convenience over individual cancels, so a partially-final batch should cancel what it still can, not abort. Returns the refreshed batch.
- **Route:** `POST /api/penggajian/[batchId]/batal` (new file, same shape as the per-slip `batal` route).
- **UI:** a "Batalkan Batch" button on the batch detail view, gated the same way the per-slip Batal action already is (admin/keuangan), with a confirm dialog (`ConfirmDeleteDialog`'s sibling `AlertDialog` shape works here too, though this isn't a delete — reuse the raw `AlertDialog` primitives inline like Faktur's `TerminRow` cancel flow does, `faktur-induk-detail.tsx:281-304`).

---

## 5. Error Handling

All three reuse existing patterns: `NotFoundError`/`ConflictError` from `src/lib/api-error.ts`, toast-on-error via each module's existing `apiErrorMessage` mutation pattern. No new error handling needed.

---

## 6. Testing

Same convention already established this session: no service-level test harness for these modules (mutations touch Postgres via `withUserTransaction`), so verification is `npx tsc --noEmit` + manual QA through the running dev server (per the `run` skill), covering:
1. Arus Kas: edit a manual entry, confirm persisted; delete a manual entry, confirm it disappears from the list; confirm the Aksi column is absent for automation-sourced (Faktur/Penggajian/Pajak) rows.
2. Realisasi RAB: edit an entry, confirm persisted; delete an entry, confirm it disappears and the "Total Realisasi" sum updates.
3. Penggajian: cancel a batch with a mix of Belum Dibayar and already-Dibayar/Batal slips, confirm only the still-cancellable ones flip to Batal and the already-final ones are untouched.
