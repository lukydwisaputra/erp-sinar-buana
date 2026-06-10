# Penawaran & Faktur — Status Redesign

**Date:** 2026-06-10

## Overview

Redesign status management for Penawaran (SPH) and Faktur: rename displayed labels, add new cancellation statuses, restructure the row action menu, and introduce read-only views for locked states.

---

## 1. Schema Changes

### `schemas/penawaran.ts`
`sphStatus` enum: `["draft", "terkirim", "deal"]` → `["draft", "terkirim", "deal", "ditolak", "dibatalkan"]`

- `ditolak` — rejected before a Faktur is issued (set from Penawaran row action)
- `dibatalkan` — cancelled after a Faktur is issued (set from Faktur detail page)

### `schemas/faktur.ts`
`fakturStatus` enum: `["draft", "terkirim", "lunas"]` → `["draft", "terkirim", "lunas", "dibatalkan"]`

- `dibatalkan` — faktur cancelled; triggers penawaran status → `dibatalkan`

---

## 2. Status Label Changes (Penawaran table)

| Enum value | Old label | New label | Badge variant |
|---|---|---|---|
| `draft` | "Draft" | "Draf" | info |
| `terkirim` | "Leads - Terkirim" | "Terkirim" | warning |
| `deal` | "Convert - Deal" | "Disetujui" | success |
| `ditolak` *(new)* | — | "Ditolak" | destructive |
| `dibatalkan` *(new)* | — | "Dibatalkan" | secondary |

---

## 3. Penawaran Row Action Menu

Shown for ALL statuses. Structure:

```
Status              ← DropdownMenuLabel, bold, not clickable
[icon] Draf
[icon] Terkirim
[icon] Disetujui
─────────────────   ← Separator
[icon] Ubah
─────────────────   ← Separator
[icon] Batalkan     ← changes status to ditolak (destructive)
[icon] Hapus        ← destructive
```

### Disabling logic

| Active status | Draf | Terkirim | Disetujui | Ubah | Batalkan | Hapus |
|---|---|---|---|---|---|---|
| `draft` | disabled | enabled | disabled | enabled | enabled | enabled |
| `terkirim` | disabled | disabled | enabled | enabled | enabled | enabled |
| `deal` | disabled | disabled | disabled | disabled | disabled | disabled |
| `dibatalkan` | disabled | disabled | disabled | disabled | disabled | enabled* |
| `ditolak` | disabled | disabled | disabled | disabled | disabled | enabled |

*Hapus saat `dibatalkan` cascades: deletes penawaran + all linked faktur.

### Confirmation dialogs

Every status change (Draf, Terkirim, Disetujui, Batalkan) and Hapus requires an AlertDialog confirmation before executing.

---

## 4. SPH Detail Page — Read-Only Views

`SphBuilder` delegates to one of three render paths based on `existing.status`:

| Status | Render path |
|---|---|
| `draft` / `terkirim` | Editable `DocumentBuilder` form |
| `deal` | `SphDealView` — read-only, **Unduh + Kirim** |
| `dibatalkan` | `SphCancelledView` — read-only, **Unduh only** |

`SphDealView` (existing): replace "Pratinjau Layar Penuh" button with "Unduh" (calls `window.print()`).

`SphCancelledView` (new): alert "Dibatalkan", scaled preview, Unduh button only.

---

## 5. Faktur Detail Page — Read-Only Views

`FakturBuilder` delegates based on `existing.status`:

| Status | Render path |
|---|---|
| `draft` / `terkirim` | Editable form |
| `lunas` | `FakturReadOnlyView` — read-only, **Unduh + Kirim** |
| `dibatalkan` | `FakturReadOnlyView` — read-only, **Unduh only** |

`FakturReadOnlyView` (new): alert (Read Only / Dibatalkan), scaled document preview, action buttons.

### Batalkan button (draft / terkirim faktur)

- Shown in `FakturBuilder` header actions when `status` is `draft` or `terkirim`
- On confirm: `updateFakturStatus(id, "dibatalkan")` + `updatePenawaranStatus(sphId, "dibatalkan")`

---

## 6. Data Layer Changes

### `data/penawaran.ts`
- `deletePenawaran(id)` — remove from fixture array

### `data/faktur.ts`
- `updateFakturStatus(id, status)` — mutate faktur in fixture array
- `deleteFaktur(id)` — remove single faktur
- `deleteAllFakturBySph(sphId)` — remove all faktur with matching `sphId`

---

## 7. Query Layer Changes

### `query/penawaran.ts`
- `useDeletePenawaran()` — wraps `deletePenawaran`, invalidates `["penawaran"]`

### `query/faktur.ts`
- `useUpdateFakturStatus()` — wraps `updateFakturStatus`, invalidates `["faktur"]`
- `useCancelFaktur()` — calls `updateFakturStatus` + `updatePenawaranStatus`, invalidates both query keys
- `useDeleteFakturBySph()` — calls `deleteAllFakturBySph`, invalidates `["faktur"]`

---

## 8. File Impact Summary

| File | Change |
|---|---|
| `schemas/penawaran.ts` | Add `ditolak`, `dibatalkan` to enum |
| `schemas/faktur.ts` | Add `dibatalkan` to enum |
| `data/penawaran.ts` | Add `deletePenawaran` |
| `data/faktur.ts` | Add `updateFakturStatus`, `deleteFaktur`, `deleteAllFakturBySph` |
| `query/penawaran.ts` | Add `useDeletePenawaran` |
| `query/faktur.ts` | Add `useUpdateFakturStatus`, `useCancelFaktur`, `useDeleteFakturBySph` |
| `app/(app)/penawaran/page.tsx` | New STATUS map, full row action menu redesign |
| `components/penawaran/sph-builder.tsx` | Replace button; add `SphCancelledView`; route by status |
| `components/faktur/faktur-builder.tsx` | Add `FakturReadOnlyView`; add Batalkan button; route by status |
