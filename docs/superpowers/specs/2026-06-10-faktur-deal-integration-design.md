# Design: Faktur–Deal Integration & SPH Enhancements

**Date:** 2026-06-10  
**Status:** Approved

---

## Overview

Integrate the SPH (penawaran) deal lifecycle directly with the faktur system. When an SPH becomes a Deal, all termin fakturs are auto-created with IDs derived from the SPH. The faktur list is merged into one row per deal. The SPH document gains per-termin after-tax breakdowns using PPN/PPH settings stored on the SPH itself.

---

## A. SPH Schema — Add Tax Settings

**File:** `src/lib/schemas/penawaran.ts`

Add four fields to `sphFormSchema` (identical to faktur):

```ts
ppnAktif: z.boolean().default(false)
ppnPersen: z.coerce.number().default(12)
pph23Aktif: z.boolean().default(false)
pph23Persen: z.coerce.number().default(2)
```

**File:** `src/lib/fixtures/penawaran.ts`  
Seed existing fixtures with default tax values (e.g., `ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2`) so sample data is consistent.

**File:** `src/components/penawaran/sph-form.tsx`  
Add a "Pajak" section between the Termin and Catatan sections, using the same toggle + number input pattern as the faktur builder.

---

## B. Faktur ID Derivation

**File:** `src/lib/faktur-id.ts` *(new)*

```ts
// SPH/001/5.2026 → "INV/001/2026"
export function sphIdToInvBase(sphId: string): string

// "INV/001/2026" + terminIndex 0 → "INV/001/2026-T1"
export function terminFakturId(invBase: string, terminIndex: number): string
```

Rules:
- Extract sequence from SPH ID: `SPH/001/5.2026` → `001`
- Extract year from SPH ID suffix: `5.2026` → `2026`
- Parent base: `INV/{seq}/{year}`
- Termin faktur: `{base}-T{terminIndex + 1}`

No separate parent faktur document is stored. The `INV/001/2026` prefix serves as the implicit parent reference in the child IDs.

---

## C. Auto-Create Fakturs When SPH → Deal

**File:** `src/lib/data/penawaran.ts`

Add `updatePenawaranStatus(id: string, newStatus: SphStatus): Promise<void>`.

The fixtures are currently static module-level constants. Both `penawaranFixtures` and `fakturFixtures` must be converted to mutable module-level arrays (exported `let` or a wrapper object) so mutations persist within a browser session.

When `newStatus === "deal"`:
1. Mutate the SPH entry's `status` in `penawaranFixtures`.
2. Call `createFakturSetFromSph(sph)` to build all termin fakturs.
3. Push the resulting fakturs into `fakturFixtures`.

On any other status change, only step 1 runs.

**File:** `src/lib/data/faktur.ts`

Add `createFakturSetFromSph(sph: Sph): Faktur[]`:
- Iterates `sph.termin`, producing one `Faktur` per entry.
- Fields per termin faktur:

| Field | Value |
|---|---|
| `id` | `terminFakturId(sphIdToInvBase(sph.id), index)` |
| `sphId` | `sph.id` |
| `terminIndex` | `index` |
| `terminList` | `sph.termin` (mapped to `sphTerminSchema`) |
| `items` | `sph.items` mapped to `fakturItemSchema` |
| `perusahaanId/Nama/alamat/kota/npwp` | from SPH |
| `ppnAktif/Persen/pph23Aktif/Persen` | from SPH |
| `tanggal` | `""` |
| `jatuhTempo` | `""` |
| `status` | `"draft"` |
| `catatan` | `[]` |
| `tanggalBayar` | `""` |

**File:** `src/lib/faktur-source.ts`  
Remove `fakturValuesFromSph` and `dealSphOptions` — no longer needed since fakturs are auto-created at deal time.

**File:** `src/app/(app)/faktur/baru/page.tsx` — replace with a redirect to `/faktur`. The page is no longer reachable from the UI but may still be navigated to directly; a redirect avoids a 404.

---

## D. Penawaran List — Row Action Menu

**File:** `src/app/(app)/penawaran/page.tsx`

Pass `rowActions={false}` to `DataTable` and define a custom `actions` column:

| Status | Shown actions |
|---|---|
| `draft` | Ubah Status (→ Terkirim), Edit, Hapus |
| `terkirim` | Ubah Status (→ Deal), Edit, Hapus |
| `deal` | *(no actions)* |

**Ubah Status → Deal** shows a two-step `AlertDialog`:
> "Mengubah ke Deal akan membuat faktur otomatis untuk {n} termin. Tindakan ini tidak dapat dibatalkan."

**Hapus** always shows a confirmation `AlertDialog`:
> "Hapus penawaran {id}? Tindakan ini tidak dapat dibatalkan."

Both use the existing `AlertDialog` components from `@/components/ui/alert-dialog`.

**Query mutation:** `useUpdatePenawaranStatus` hook in `src/lib/query/penawaran.ts` wraps `updatePenawaranStatus` and invalidates both penawaran and faktur list queries on success.

---

## E. Penawaran Detail — Read-Only for Deal Status

**File:** `src/components/penawaran/sph-builder.tsx`

When `existing.status === "deal"`:
- Render a read-only view (document preview only, no form).
- Show a banner: "Penawaran ini sudah menjadi Deal dan tidak dapat diubah."

---

## F. `lib/faktur.ts` — After-Tax Amounts

**`DealTerminRow`** gains:
```ts
nilaiAfterTax: number  // computeFaktur(faktur).total if faktur exists; t.nilai otherwise
```

**`DealRekap`** gains:
```ts
totalAfterTax: number   // sum of all termin nilaiAfterTax
latestFaktur: Faktur | null  // termin faktur with highest terminIndex that has a faktur
```

`terbayar` = sum of `nilaiAfterTax` for `lunas` termins.  
`persenTerbayar` = `terbayar / totalAfterTax * 100`.

---

## G. Faktur List Page — One Row Per Deal

**File:** `src/app/(app)/faktur/page.tsx`

Replace individual-faktur iteration with `groupFakturByDeal`. One row per `DealRekap`:

| Column | Source |
|---|---|
| No. Faktur | `deal.sphId` — links to `latestFaktur.id` if any faktur exists; plain text otherwise |
| Perusahaan | `deal.perusahaanNama` |
| Tanggal | `deal.latestFaktur?.tanggal` |
| Jatuh Tempo | `deal.latestFaktur?.jatuhTempo` |
| Termin | `{issued}/{total}` (count of termins with a faktur / total termins) |
| Total Tagihan | `deal.totalAfterTax` |
| Status | All lunas → **Lunas**; any overdue → **Jatuh Tempo**; any terkirim → **Belum Lunas** (info); else **Draft** |

`rowActions={false}` — no three-dots column on faktur list.

---

## H. Deal Termin Card

**File:** `src/components/faktur/deal-termin-card.tsx`

- Replace `t.nilai` display with `t.nilaiAfterTax`.
- Move status badge to sit left-aligned beside the faktur ID:
  ```
  [faktur-id]  [Badge]                    [Lihat / Terkunci button]
  ```
- Remove "Buat Faktur" buttons — all fakturs are auto-created at deal time.

---

## I. SPH Cover Letter Document

**File:** `src/components/penawaran/sph-cover-letter.tsx`

Add rows to the service table immediately after the existing **TOTAL BIAYA** row, using the SPH's PPN/PPH settings and `computeFaktur`-style math:

```
| (colspan 4, right)  Termin I — {pemicu} (Termasuk Pajak)   | Rp xx.xxx.xxx |
| (colspan 4, right)  Termin II — {pemicu} (Termasuk Pajak)  | Rp xx.xxx.xxx |
| ...                                                          |               |
| (colspan 4, right, bold)  Total Biaya Setelah Pajak         | Rp xx.xxx.xxx |
```

Per-termin after-tax is computed from SPH tax fields using the same formula as `computeFaktur` (DPP nilai lain for PPN).

---

## Files Touched Summary

| File | Change type |
|---|---|
| `src/lib/schemas/penawaran.ts` | Add PPN/PPH fields |
| `src/lib/fixtures/penawaran.ts` | Seed tax defaults |
| `src/lib/faktur-id.ts` | New — ID derivation helpers |
| `src/lib/faktur.ts` | After-tax fields in DealRekap/DealTerminRow |
| `src/lib/data/penawaran.ts` | Add `updatePenawaranStatus` |
| `src/lib/data/faktur.ts` | Add `createFakturSetFromSph` |
| `src/lib/query/penawaran.ts` | Add `useUpdatePenawaranStatus` mutation |
| `src/lib/faktur-source.ts` | Remove `fakturValuesFromSph`, `dealSphOptions` |
| `src/components/penawaran/sph-form.tsx` | Add PPN/PPH section |
| `src/components/penawaran/sph-builder.tsx` | Read-only mode for deal status |
| `src/components/penawaran/sph-cover-letter.tsx` | Add termin after-tax rows |
| `src/components/faktur/deal-termin-card.tsx` | After-tax amounts, badge left-align, remove Buat Faktur |
| `src/app/(app)/penawaran/page.tsx` | Custom action column with status change & delete |
| `src/app/(app)/faktur/page.tsx` | Merged deal rows |
| `src/app/(app)/faktur/baru/page.tsx` | Remove or redirect |

---

## Out of Scope

- Backend persistence (still using fixtures)
- Status rollback (Deal → Terkirim is not allowed)
- Partial termin faktur creation (all termins created at once)
