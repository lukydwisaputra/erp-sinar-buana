# Faktur (Invoice) Module — Design Spec

Date: 2026-06-10
Status: Approved direction (pending written-spec review)
Module: Keuangan › Faktur (`/faktur`)

## 1. Context & Goal

The SBMJ ERP prototype is frontend-first with mock data (read-only; forms emit
demo toasts, no persistence). The Penawaran/SPH module established a document
builder: form on the left, live A4 preview on the right, fullscreen preview, and
print-to-PDF that faithfully recreates a real SBMJ PDF.

Faktur is the next module under **Keuangan**. A Faktur invoices **one termin** of
a deal (e.g. "TERMIN III (Pelunasan)") and reproduces the real SBMJ invoice PDF
(`2. Invoice Pertek pratama - termin 3.pdf`). It reuses the SPH document chrome.

Bahasa Indonesia throughout. Stack unchanged (Next.js App Router, Tailwind v4,
shadcn/ui, TanStack Query/Table, RHF + Zod).

## 2. Decisions (from brainstorming)

- **Origination:** from a `deal` SPH (auto-fill perusahaan + items + termin list),
  plus a **manual** mode (pick perusahaan, enter line items).
- **Termin:** per-termin — one Faktur bills one termin of the SPH's Skema Termin.
- **Tax:** PPN + PPh 23, each toggleable per faktur.
- **Document:** match the uploaded SBMJ invoice PDF, reusing SBMJ branding.
- **Status:** Draft → Terkirim → Lunas, plus an automatic **Jatuh Tempo** badge
  when `jatuhTempo` has passed and status is not `lunas`. Columns for due date
  and payment date.
- **Invoice number:** follow the PDF format → `INV/002/05.2026`
  (`INV/{seq}/{MM}.{YYYY}`).
- **DRY:** extract shared document chrome; refactor SPH to consume it; reuse
  `LineItemEditor`, `MoneyInput`, `terbilang`, `formatRupiah`, and the mock-data
  spine pattern.

## 3. Tax & Termin Calculation (`src/lib/faktur.ts`)

Indonesian **DPP nilai lain** rule (PMK 131/2024): PPN 12% is levied on a DPP of
11/12 × price, giving an effective 11%. Verified against the PDF:

```
totalBiaya      = Σ(items.volume × items.harga)              125.000.000
previousTermins = each prior termin: persen × totalBiaya      −50.000.000 (I 40%)
                                                              −50.000.000 (II 40%)
nilaiTermin     = current termin: persen × totalBiaya          25.000.000 (III 20%)
DPP             = 11/12 × nilaiTermin                          22.916.667
PPN             = ppnPersen% × DPP        (default 12%)       + 2.750.000
PPh23           = pph23Persen% × nilaiTermin (default 2%)     −   500.000
totalSetelahPajak = nilaiTermin + PPN − PPh23                  27.250.000
```

Notes:
- `nilaiTermin` uses `persen × totalBiaya`. The SPH termin editor enforces
  Σpersen = 100, so the running deductions reconcile to the final termin.
- PPN base is the DPP (11/12 × nilaiTermin); PPh base is the full nilaiTermin.
- When `ppnAktif`/`pph23Aktif` is false, that line is omitted and dropped from
  the total. DPP row shows only when PPN is active.
- Helpers: `totalBiaya(items)`, `terminAmount(total, persen)`,
  `computeFaktur(values)` → `{ totalBiaya, previous[], nilaiTermin, dpp, ppn,
  pph23, total }`. Plus `toRoman(n)` for the "TERMIN III" heading.

## 4. Data Model

### `src/lib/schemas/faktur.ts`

```
fakturItemSchema   = { uraian, volume, harga, satuan }   // reuses SPH item shape minus rab/jadwal
fakturTerminSchema = { label, persen, pemicu }           // same shape as sphTerminSchema

fakturFormSchema = {
  sphId?: string                       // source SPH (empty in manual mode)
  perusahaanId, perusahaanNama, alamat, kota, npwp
  tanggal, jatuhTempo                  // ISO yyyy-MM-dd
  items: fakturItemSchema[]            // full contract lines (min 1)
  terminList: fakturTerminSchema[]     // all termins (min 1)
  terminIndex: number                  // which termin this invoice bills (0-based)
  ppnAktif: boolean,  ppnPersen: number(default 12)
  pph23Aktif: boolean, pph23Persen: number(default 2)
  catatan: string[]                    // extra notes (bank block is automatic)
  status: enum(draft|terkirim|lunas)
  tanggalBayar?: string
}
fakturSchema = fakturFormSchema.extend({ id })            // list/persisted shape
```

`fakturItemSchema` / `fakturTerminSchema` reuse the SPH primitives where the
shape matches (DRY); the Faktur item drops `rab`/`jadwal`.

### `src/lib/company-profile.ts` (add)

```
bank: { nama: "BNI", atasNama: "SINAR BUANA MANDIRI JAYA", noRekening: "0559332815" }
```

## 5. Origination Flow

`/faktur/baru` (and `/faktur/[id]` to view/edit). The builder header has a
**Sumber** control:
- **Dari SPH deal** — combobox of SPH with `status === "deal"`. On pick:
  fill `sphId`, perusahaan fields (looked up from perusahaan fixtures for
  `kota`/`npwp`), `items` (mapped from SPH items → uraian/volume/harga/satuan),
  and `terminList` (from SPH `termin`). User then selects `terminIndex`.
- **Manual** — no `sphId`; pick perusahaan from combobox, enter items via
  `LineItemEditor`, and a single default termin `[{Termin I, 100%, Pelunasan}]`
  (editable). 

All auto-filled fields remain editable. Tax toggles + due date + catatan are
always editable.

## 6. List, Status & Due Date (`/faktur`)

Activate the placeholder into a real `DataTable`:
`No. Faktur · Perusahaan · Tanggal · Jatuh Tempo · Total Tagihan · Status`.
- Status badge: manual `draft`/`terkirim`/`lunas`; **derived** `Jatuh Tempo`
  (destructive/warning) when `today > jatuhTempo && status !== "lunas"`.
- Three-dots row menu: Edit / Hapus (demo toast). "Buat Faktur" → `/faktur/baru`.
- `Total Tagihan` = `computeFaktur(row).total`.

## 7. Document Layout (`FakturDocument`) — matches the PDF

Single A4 page via shared `DocumentPage` (header = `DocumentLetterhead`,
footer = `DocumentFooter`):

1. **Letterhead** — angled blue band + SBMJ logo + name/tagline (shared).
2. **Meta** — left: `Kepada Yth. / Bapak / Ibu Direktur / {perusahaanNama} /
   Di {kota}`; right: `{companyProfile.kota}, {tanggal panjang}`.
3. **Title (centered)** — `I N V O I C E` (tracked) / `TERMIN {roman} ({pemicu})`
   / `No Inv: {id}`.
4. **Table** — `No · Uraian · Biaya Satuan (Rp) · Vol · Total (Rp)` for items
   (+ a couple of empty filler rows like the PDF), then the summary rows:
   `TOTAL BIAYA`, each previous termin `{label} {persen}%` (negative),
   `{current pemicu}` = nilaiTermin, `DPP` (if PPN), `PPN`, `PPh` (negative, red),
   `TOTAL BIAYA SETELAH PAJAK`, then `Terbilang: … Rupiah`.
5. **Catatan** — `Pembayaran dapat dilakukan melalui` + Bank / Atas Nama /
   Nomor Rekening (from `companyProfile.bank`) + bold `Invoice ini berlaku
   sebagai kwitansi`, then any custom `catatan` bullets.
6. **Signature** — `Hormat Kami,` / `{direktur.nama}` (underline) /
   `{direktur.jabatan}`. No round stamp (the invoice PDF has none).
7. **Footer** — SBMJ contact band (shared).

## 8. DRY Refactor — Shared Document Chrome

New `src/components/shared/document/`:
- `document-page.tsx` — `DocumentPage({ header, children })` (A4 table frame;
  from `SphPage`).
- `document-footer.tsx` — `DocumentFooter()` (SBMJ contact band; from `SphFooter`).
- `document-letterhead.tsx` — `DocumentLetterhead()` (angled band + logo + name;
  extracted from `SphCoverLetter`'s inline letterhead). A compact variant
  (`DocumentLetterhead variant="strip"`) replaces the RAB/Jadwal `LetterheadStrip`.
- `document-builder.tsx` — `DocumentBuilder({ title, subtitle, docId, actions,
  form, sidePreview, fullscreenDoc, onKirim })` shell: `BuilderLayout`,
  fullscreen `Dialog` (Unduh → print, Kirim, Tutup), and the `<body>`-portaled
  print container + fixed running footer. Extracted from `SphBuilder`.

CSS: generalize the print classes `sph-print / sph-doc / sph-page-* /
sph-print-footer` and the `.sph-doc` branding block → `doc-*` / `.doc-doc`
(or `.sbmj-doc`). The `--sph-blue*` vars become `--doc-blue*`.

SPH is refactored to consume all of the above (no behavior change). Faktur
consumes them too.

### Verification of the refactor (no regression)
Headless Chrome print-to-PDF page counts must stay:
- `/penawaran/baru` (empty, unchecked) = **1 page**.
- existing SPH `SPH/001/5.2026` (checked, 2 services) = **6 pages**, all content.
Plus `npm run build` clean and `npm test` (45) green.

## 9. Phases

- **F0 — Shared chrome refactor.** Extract `DocumentPage/Footer/Letterhead/
  Builder`, rename CSS to `doc-*`, migrate SPH onto them. Verify SPH unchanged
  (page counts, build, tests).
- **F1 — Faktur data spine.** `schemas/faktur.ts`, `fixtures/faktur.ts`
  (~5 rows spanning statuses + an overdue one), `data/faktur.ts` (delay + Zod
  parse), `query/faktur.ts`, `lib/faktur.ts` (calc + `toRoman`), add
  `companyProfile.bank`. Unit tests for `computeFaktur` against the PDF numbers.
- **F2 — Faktur list.** Activate `/faktur` page (DataTable + status + jatuh
  tempo + row actions + Buat Faktur).
- **F3 — Faktur builder + document.** `FakturBuilder` (source picker, perusahaan,
  termin selector, tax toggles, due date, catatan) using `DocumentBuilder`;
  `FakturDocument` (A4 matching the PDF) using `DocumentPage/Letterhead/Footer`;
  routes `/faktur/baru` + `/faktur/[id]`.
- **F4 — Verify.** Build, tests, headless print-to-PDF of a from-SPH faktur
  (1 page, totals match the PDF) and SPH regression check. Review gate.

## 10. Out of Scope / Notes

- No Proyek linkage (Proyek is a later module); Faktur links to SPH only.
- No real persistence, auth, or PPN/PPh e-filing — demo toasts only.
- The PPN DPP factor (11/12) is hardcoded per current regulation; `ppnPersen`
  (12) and `pph23Persen` (2) are configurable per faktur.
- Multi-page invoices are unlikely (one termin fits one A4), but the shared
  `DocumentPage` handles overflow if catatan grows.

## 11. Reused vs New (DRY summary)

Reused: `BuilderLayout`, `LineItemEditor`, `MoneyInput`, `ScaleToFit`,
`DataTable`, `FormSheet`, combobox/calendar field patterns, `terbilang`,
`formatRupiah`, the mock-data spine, and (after F0) the shared document chrome.
New: `lib/faktur.ts`, the `faktur` schema/fixtures/data/query, `FakturBuilder`,
`FakturDocument`, `FakturForm`, the Faktur list page, and the
`components/shared/document/*` extraction.
