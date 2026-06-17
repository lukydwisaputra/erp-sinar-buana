# Penggajian (Payroll) Module — Design Spec

**Date:** 2026-06-17
**Scope:** Batch payroll run, inline-editable slip table, slip document builder, status workflow
**Out of scope (deferred):** Email/WA sending (EP-10), RBAC enforcement, real Arus Kas integration (stub only), Tax Center integration (EP-08 stub), auto BPJS calculation
**Source of truth:** [planning/user-stories/06-penggajian.md](../../../planning/user-stories/06-penggajian.md) · PRD §5.2

---

## 1. Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Batch vs single | Batch parent model (B) | Natural payroll-run per period; clear grouping |
| Inline editing | Inline table (like milestone rows) | Approved in brainstorm |
| Status flow | `menunggu_pembayaran` → `sudah_dibayar` | No explicit saved-draf state; editing allowed until dibayar |
| Slip document | Full document builder (pola Faktur) | Consistent with other modules |
| BPJS | Manual input, default 0 | No auto-calculation for prototype |
| PPh 21 | Manual input, ≥ 0 (0 valid per BR-3) | Matches PRD requirement |
| Arus Kas | Stub log entry only | Arus Kas module not yet built |
| Kirim WA/Email | Placeholder action only | EP-10 out of scope |

---

## 2. Data Model

### `PenggajianBatch`
Slips are **embedded** in the batch (same pattern as milestones in Proyek) so the list page can compute "X/Y Dibayar" without a separate join.

```ts
{
  id: string;           // "GAJ-001"
  periode: {
    mulai: string;      // ISO date "2026-03-24"
    selesai: string;    // ISO date "2026-04-24"
  };
  slips: SlipGaji[];    // embedded
  createdAt: string;    // ISO datetime
}
```

### `SlipGaji`
```ts
{
  id: string;           // "SLP-001"
  batchId: string;

  // From karyawan fixture
  karyawanId: string;
  karyawanNama: string;
  jabatan: string;
  statusKepegawaian: "tetap" | "kontrak" | "probation";
  pengali: number;
  gajiPokok: number;    // IDR — pulled from karyawan
  tunjangan: number;    // IDR — pulled from karyawan default, editable

  // Manual inputs (editable until sudah_dibayar)
  lembur: number;       // IDR, default 0
  bonus: number;        // IDR, default 0
  pph21: number;        // IDR, default 0 — valid per BR-3
  bpjsPotongan: number; // IDR, default 0

  // Bank info — pulled from karyawan fixture
  bankNama: string;
  bankNomor: string;
  bankAtasNama: string;

  status: "menunggu_pembayaran" | "sudah_dibayar";
  paidAt: string | null; // ISO datetime
}
```

### Derived fields (calculated on-the-fly, not stored)
```
gajiPokokEfektif  = gajiPokok × pengali
penggajianKotor   = gajiPokokEfektif + tunjangan + lembur + bonus
penggajianBersih  = penggajianKotor − pph21 − bpjsPotongan
```

`penggajianBersih` must be ≥ 0 (VR-06.7).

### Status lifecycle
```
[batch created] → slips: menunggu_pembayaran
                          ↓ (editable until here)
                  sudah_dibayar (locked; stub arus kas log appended)
```

---

## 3. File Structure

```
src/
  lib/
    schemas/penggajian.ts
    fixtures/penggajian.ts
    data/penggajian.ts
    query/penggajian.ts
    __tests__/penggajian-data.test.ts
  app/(app)/penggajian/
    page.tsx                          List batch (replaces placeholder)
    baru/page.tsx                     Create batch page
    [batchId]/page.tsx                Batch detail (server → client)
    [batchId]/[slipId]/page.tsx       Slip document page (server → client)
  components/penggajian/
    penggajian-create.tsx             Create form + inline table (client)
    penggajian-batch.tsx              Batch detail inline table (client)
    slip-builder.tsx                  Slip document wrapper (client)
    slip-document.tsx                 Slip document content (printable)
```

---

## 4. Pages & Navigation

### `/penggajian` — Batch list
- `DataTable` columns: ID (mono, clickable), Periode, Jumlah Karyawan, Sudah Dibayar (e.g. "3/5"), Dibuat
- Click row or ID → `/penggajian/[batchId]`
- Header CTA: "Buat Penggajian" → `/penggajian/baru`

### `/penggajian/baru` — Create
Client page. Two-phase layout:

**Phase 1 — Form header:**
- Periode mulai (date input)
- Periode selesai (date input)
- Checkbox list of active karyawan (from `karyawanFixtures`, status = "aktif")
- "Lanjut" button (disabled until ≥1 karyawan selected + valid periode)

**Phase 2 — Inline table (appears after Lanjut):**
- One row per selected karyawan
- Columns: Nama, Gaji Efektif (readonly, formatted), Tunjangan (editable), Lembur, Bonus, PPh21, BPJS, Kotor (auto-calc), Bersih (auto-calc)
- Kotor & Bersih update live as user types
- Bersih shown in red if negative (invalid)
- "Simpan Penggajian" button → calls `createBatch` → redirect to `/penggajian/[batchId]`

### `/penggajian/[batchId]` — Batch detail
Server page → client `PenggajianBatch` component.

- Header: batch ID, periode string, badge "X/Y Dibayar"
- Same inline table as create but loaded from saved slips
- Rows with `sudah_dibayar` status: all fields locked (readonly), status badge "Sudah Dibayar"
- Rows with `menunggu_pembayaran`: editable fields, "Tandai Dibayar" button (per row), "Lihat Slip" link → `/penggajian/[batchId]/[slipId]`
- "Tandai Dibayar" → AlertDialog confirmation → `markSlipDibayar` mutation → appends stub arus kas log

### `/penggajian/[batchId]/[slipId]` — Slip document
Server page → client `SlipBuilder` component.

- Toolbar: "← Kembali ke Batch", "Unduh" (window.print()), "Tandai Dibayar" (if menunggu_pembayaran)
- `SlipDocument`: full A4-like printable layout (see §5)

---

## 5. Slip Document Layout

Uses existing `DocumentLetterhead` + `DocumentPage` components (same as Faktur).

```
[Letterhead: company name, address, logo placeholder]
──────────────────────────────────────────────────
                    SLIP GAJI
           Periode: 24 Mar – 24 Apr 2026

Nama    : Budi Santoso          No  : SLP-001
Jabatan : Direktur              ID  : KRY-001
Status  : Tetap (×1,0)
──────────────────────────────────────────────────
PENDAPATAN
  Gaji Pokok                        Rp 25.000.000
  Pengali Tetap (×1,0)
  Gaji Pokok Efektif                Rp 25.000.000
  Tunjangan                         Rp  5.000.000
  Lembur                            Rp          –
  Bonus                             Rp          –
  ────────────────────────────────────────────────
  PENGGAJIAN KOTOR                  Rp 30.000.000
──────────────────────────────────────────────────
POTONGAN
  PPh 21                            Rp  1.000.000
  BPJS (porsi karyawan)             Rp    150.000
  ────────────────────────────────────────────────
  TOTAL POTONGAN                    Rp  1.150.000
──────────────────────────────────────────────────
PENGGAJIAN BERSIH (Take-Home)       Rp 28.850.000
──────────────────────────────────────────────────
Dibayarkan ke:
BCA • 1234567890 • a/n Budi Santoso

Hormat kami,             Jakarta, 24 Apr 2026


[Tanda Tangan]
Direktur
──────────────────────────────────────────────────
```

Zero/null values for lembur and bonus render as "–". PPh21 = 0 renders as "Rp 0" (valid). BPJS = 0 also renders as "Rp 0".

---

## 6. Data Functions

```ts
// penggajian.ts data layer
createBatch(input: { periode; slips: SlipInput[] }): Promise<PenggajianBatch>
listBatch(): Promise<PenggajianBatch[]>
getBatch(id: string): Promise<PenggajianBatch | null>
getSlip(batchId: string, slipId: string): Promise<SlipGaji | null>
updateSlip(batchId: string, slipId: string, patch: Partial<SlipEditFields>): Promise<SlipGaji>
  // SlipEditFields = { tunjangan, lembur, bonus, pph21, bpjsPotongan }
  // Only editable while status === "menunggu_pembayaran"; throws if sudah_dibayar
markSlipDibayar(batchId: string, slipId: string): Promise<SlipGaji>
  // → appends stub arus kas log entry: { type: "pengeluaran", kategori: "penggajian", jumlah: penggajianBersih }
```

---

## 7. Query Hooks

```ts
useBatchList()
useBatch(batchId)
useSlip(batchId, slipId)
useCreateBatch()
useUpdateSlip()
useMarkSlipDibayar()
```

---

## 8. Fixtures (seed data)

Two batches:
- `GAJ-001`: Periode Mar-Apr 2026, 5 karyawan aktif, mix of menunggu/sudah_dibayar
- `GAJ-002`: Periode Apr-Mei 2026, 3 karyawan, all menunggu_pembayaran

---

## 9. Tests

```ts
// penggajian-data.test.ts
listBatch() → returns seeded batches
getBatch("GAJ-001") → returns batch with slips
getSlip() → returns correct slip
updateSlip() → patches editable fields only
markSlipDibayar() → sets status + paidAt; appends arus kas log
markSlipDibayar() on sudah_dibayar slip → throws (idempotency guard)
derived calc → kotor/bersih correct for probation pengali 0.8
pph21=0 → penggajianBersih valid (not rejected)
```

---

## 10. Out of Scope

- Email/WA kirim slip (EP-10) — placeholder "Kirim" button, no-op
- RBAC — no slip privacy enforcement in prototype
- Real Arus Kas entry — stub log only
- Tax Center kewajiban (EP-08) — not triggered
- Auto BPJS calculation from gaji pokok
- Batch-level "Tandai Semua Dibayar" action
- Edit periode after batch created
