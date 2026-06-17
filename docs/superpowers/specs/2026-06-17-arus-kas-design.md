# Arus Kas (Cash Flow) — Design Spec

> **Source:** [EP-07 Arus Kas](../../../planning/user-stories/07-arus-kas.md)
> **Branch:** `prototype/phase2-master-data`
> **Date:** 2026-06-17

---

## 1. Goal

Build the Arus Kas module — a centralized cash book showing all Pemasukan (Kredit) and Pengeluaran (Debit) entries. Entries are either **manual** (user-created) or **automated** (generated from Faktur/Penggajian sources). This is a frontend prototype with mock data; automated entries are pre-generated from existing fixtures.

---

## 2. Architecture

Follows the established module spine: `schemas/ → fixtures/ → data/ → query/ → (app)/arus-kas/page.tsx`.

### 2.1 Data Model

```typescript
type ArusKasJenis = "kredit" | "debit";

type ArusKasKategori =
  | "faktur"       // locked — automated from invoice
  | "penggajian"   // locked — automated from payroll
  | "pajak"        // locked — automated from tax/BPJS
  | "bonus"        // locked — automated from payroll bonus
  | "operasional"  // manual — operational expenses
  | "lainnya";     // manual — catch-all

type ArusKasSumber =
  | "manual"
  | "otomatis_faktur"
  | "otomatis_penggajian"
  | "otomatis_pajak";

type ArusKasEntry = {
  id: string;                // AKS-0001
  jenis: ArusKasJenis;       // kredit or debit
  tanggal: string;           // ISO date string
  jumlah: number;            // always positive; jenis determines direction
  kategori: ArusKasKategori;
  sumber: ArusKasSumber;
  keterangan: string;        // human-readable description
  referensiId?: string;      // source document ID (faktur ID, batch ID)
  referensiLabel?: string;   // display label for source link
  proyekId?: string;         // optional project link (FR-07.10 Realisasi RAB)
  locked: boolean;           // true for automated entries — cannot edit/delete
};
```

### 2.2 Fixture Generation

Pre-generate ~15-20 entries from existing fixtures:

**From Faktur (per lunas invoice — 3 entries each, per FR-07.3):**
1. Pendapatan jasa → Kredit, kategori `faktur`, jumlah = nilaiTermin
2. PPN Keluaran → Kredit, kategori `pajak`, jumlah = PPN amount
3. PPh 23 dipotong → Debit (pengurang), kategori `pajak`, jumlah = PPh23 amount

**From Penggajian (per paid slip — 1 entry each, per FR-07.4):**
1. Take-home pay → Debit, kategori `penggajian`, jumlah = penggajianBersih

**Manual entries (5-6 hardcoded):**
Operational expenses: sewa kantor, listrik & internet, transport operasional, ATK & perlengkapan, biaya notaris. Mix of `operasional` and `lainnya` categories.

All automated entries have `locked: true`. Manual entries have `locked: false`.

### 2.3 ID Format

Sequential: `AKS-0001`, `AKS-0002`, etc. Generated at the data layer.

---

## 3. Pages

### 3.1 List Page — `/arus-kas`

**Summary Cards (top row):** Three stat tiles using the `StatTile` component from `detail-drawer.tsx` or simple card divs:
- **Saldo** — net cash position (total kredit - total debit). Green if positive, red if negative.
- **Total Pemasukan** — sum of all Kredit entries (filtered)
- **Total Pengeluaran** — sum of all Debit entries (filtered)

Summary cards react to active filters (show filtered totals).

**DataTable columns:**

| Column | Key | Notes |
|--------|-----|-------|
| Tanggal | `tanggal` | Formatted `id-ID` locale |
| ID | `id` | Mono font, not clickable |
| Keterangan | `keterangan` | Primary description text |
| Kategori | `kategori` | Badge with color per category |
| Sumber | `sumber` | Badge: Manual (secondary) / Otomatis (info) with source suffix |
| Pemasukan | computed | Show `formatRupiah(jumlah)` only if jenis=kredit, else `—` |
| Pengeluaran | computed | Show `formatRupiah(jumlah)` only if jenis=debit, else `—` |

Split Pemasukan/Pengeluaran into two columns (cash-book style) rather than a single amount column.

Default sort: newest first (by tanggal descending).

**Toolbar:**
- Search: by keterangan or ID
- Filter button (opens Dialog, same pattern as Faktur page)
- "+ Tambah Transaksi" button → navigates to `/arus-kas/baru`

**Filter Dialog (same pattern as Faktur):**
- **Jenis:** Checkboxes — Pemasukan (Kredit) / Pengeluaran (Debit)
- **Kategori:** Checkboxes — Faktur, Penggajian, Pajak, Bonus, Operasional, Lainnya
- **Sumber:** Checkboxes — Manual / Otomatis
- **Tanggal:** DateRange picker (reuse pattern from Faktur page)
- Apply / Reset buttons

**Row actions:** Manual entries get a `⋯` dropdown with "Hapus" (soft delete). Automated (locked) entries show no actions.

**Referensi links:** If `referensiId` exists, the Keterangan column includes a small linked reference that navigates to the source document (e.g., `/faktur/{id}`, `/penggajian/{batchId}`).

### 3.2 Create Page — `/arus-kas/baru`

Separate page following the penggajian create pattern. Simple form with:

| Field | Component | Required | Notes |
|-------|-----------|----------|-------|
| Jenis | Radio group or toggle | Yes | "Pemasukan (Kredit)" / "Pengeluaran (Debit)" |
| Tanggal | Date picker | Yes | Default to today |
| Jumlah | MoneyInput | Yes | Rp prefix, thousand separators, must be > 0 |
| Kategori | Select dropdown | Yes | Only manual categories: Operasional, Lainnya. Locked categories (Faktur, Penggajian, Pajak, Bonus) excluded. |
| Keterangan | Text input | Yes | Free-text description |
| Proyek | Select dropdown | No | Optional link to active project (FR-07.10). Lists projects from proyek fixtures. |

**On save:** Creates entry with `sumber: "manual"`, `locked: false`. Redirects to `/arus-kas`. Toast success message.

**Validation (Zod):**
- Jenis: required enum
- Tanggal: required non-empty string
- Jumlah: required number > 0
- Kategori: required enum (manual categories only)
- Keterangan: required non-empty string
- ProyekId: optional string

---

## 4. File Structure

```
src/
  lib/
    schemas/arus-kas.ts          — Zod schemas + types
    fixtures/arus-kas.ts         — Pre-generated entries from faktur/penggajian + manual
    data/arus-kas.ts             — list, create, remove (soft delete) with delay()
    query/arus-kas.ts            — TanStack Query hooks
    __tests__/arus-kas-data.test.ts — Vitest data layer tests
  app/(app)/arus-kas/
    page.tsx                     — List page with summary cards + DataTable + filters
    baru/page.tsx                — Create form page
```

### 4.1 Cleanup

The existing `ArusKasLogEntry` type and `appendArusKas`/`listArusKasLog` in `src/lib/data/penggajian.ts` will be removed — the arus-kas module owns its own data now. The `markSlipDibayar` function in penggajian will no longer append to a local log; instead the arus-kas fixtures include pre-generated entries for already-paid slips.

---

## 5. Kategori Badge Colors

| Kategori | Badge variant |
|----------|--------------|
| faktur | `success` |
| penggajian | `info` |
| pajak | `warning` |
| bonus | `secondary` |
| operasional | `default` (outline) |
| lainnya | `secondary` |

---

## 6. Out of Scope

- Real-time event hooks between modules (automated entries are pre-generated in fixtures)
- Export Excel/CSV (FR-07.2 — future)
- Edit form for existing manual entries (create + delete only for prototype)
- Tax Center integration (EP-08 not built yet)
- Sifat Beban (HPP/Operasional/Non-Laba-Rugi) metadata on categories — deferred to Dasbor module
