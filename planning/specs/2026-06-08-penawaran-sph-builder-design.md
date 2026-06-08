# Penawaran / SPH — List + Builder (form + live preview) Design

> **Date:** 2026-06-08
> **Status:** Design approved (brainstorming) — pending implementation plan
> **Module:** EP-03 Penawaran / SPH (first transactional module of Phase 2)
> **Requirements:** [EP-03 user stories](../user-stories/02-master-data.md) → [03-penawaran-sph.md](../user-stories/03-penawaran-sph.md); design system [docs/design](../../docs/design/README.md)
> **Builds on:** Phase 1 app shell + mock-data spine; Phase 2 Master Data patterns (DataTable, detail/form, shared fields).

---

## 1. Goal

Turn the `/penawaran` placeholder into a real module: a **List** of SPHs and a full-page **Builder** with the **form on the left and a live document preview on the right** (per the client's reference), following EP-03 requirements and the SBMJ design system. Read-only prototype — non-persisting.

This round establishes the reusable **builder + document-preview pattern** that **Faktur** (next module) will reuse.

## 2. Decisions

| Decision | Choice |
|---|---|
| Sequencing | SPH first; Faktur reuses the shell next (separate spec) |
| Coverage | **List + Builder** (builder is the new-SPH screen, also serves view/edit) |
| SPH depth | Client document + **internal RAB/margin** panel; **schedule matrix deferred** (FR-03.6) |
| Preview UX | Form + live preview **always side-by-side**; a **fullscreen preview** action (no hide toggle) |
| Persistence | None (prototype). Simpan Draf / Kirim → "Demo: tidak disimpan" toast; status changes local |
| RBAC | Skipped (prototype) |

## 3. Routes & files

```
src/app/(app)/penawaran/
  page.tsx                 List (DataTable + status badges + "Buat SPH")
  baru/page.tsx            Builder (new) → renders <SphBuilder />
  [id]/page.tsx            Builder (view/edit) → <SphBuilder sphId={id} /> (loads fixture)
src/components/penawaran/
  sph-builder.tsx          Orchestrates form state (RHF) + layout; owns Simpan/Kirim/fullscreen
  sph-form.tsx             Left column: the 5 form sections
  sph-document.tsx         The SPH document body (used in side preview AND fullscreen)
src/components/shared/
  builder-layout.tsx       Reusable: header (title/actions) + two-column (form | preview)
  document-paper.tsx       Reusable "paper" card shell for a document preview
  line-item-editor.tsx     Reusable catalog line-item table (Faktur reuses)
src/lib/
  schemas/penawaran.ts     Zod schema + types
  fixtures/penawaran.ts    seeded SPHs (+ reuse perusahaan/katalog fixtures)
  data/penawaran.ts        listPenawaran()/getPenawaran()
  query/penawaran.ts       usePenawaranList()
  sph.ts                   pure calc helpers (totals, termin %, RAB margin)
  __tests__/sph.test.ts    unit tests for the calc helpers
```

Reuses: `MoneyInput`, `formatRupiah`/`formatRupiahCompact`/`terbilang`, `DataTable`, `ErrorState`, shared form-fields, `Combobox`, `Select`, `Badge`, `Sheet`/`Dialog`.

## 4. List page (`/penawaran`)

`DataTable` over `usePenawaranList()` with columns: **No SPH** (mono, clickable → `/penawaran/[id]`), **Perusahaan** (min-w-64), **Tanggal**, **Total Penawaran** (mono, left-aligned per our table convention), **Status** badge. Primary header button **"Buat SPH"** → `/penawaran/baru`. ⋮ row menu (Ubah → `/penawaran/[id]`, Hapus → confirm+demo). Status badges: Draft = `info`, Leads-Terkirim = `warning`, Convert-Deal = `success`.

## 5. Builder

### 5.1 Layout (`builder-layout.tsx`)
- **Header:** breadcrumb (Penawaran › Buat SPH) · title (`Buat SPH`, or the No. `SPH/001/5.2026` when editing) · subtitle · right actions: **Pratinjau Layar Penuh** (Lucide `Maximize`/`Expand` → fullscreen overlay), **Simpan Draf** (secondary), **Kirim** (primary).
- **Body:** CSS grid, two columns on `lg+` (`form | preview`), preview column sticky. Stacks on `< lg` (form, then preview below). Both always visible.

### 5.2 Form (`sph-form.tsx`) — left column, 5 sections (each a labelled card/section)
1. **Tujuan Penawaran** — Perusahaan (`Combobox` over perusahaan fixtures) → on select, PIC (`Select` of that company's PICs) and alamat auto-fill (read-only display); Tanggal (date); Masa Berlaku (number, hari, default 14).
2. **Baris Layanan** — `LineItemEditor`: each row = Layanan (`Combobox` over katalog) + Qty (number) + Harga (`MoneyInput`, auto-filled from catalog `hargaStandar`, editable) + line total (computed). Add/remove rows (≥1). Footer: **Total Penawaran** + **Terbilang** (auto).
3. **Skema Termin** — rows: label (e.g. "Termin I"), % (number), Pemicu (text/select e.g. "Mulai", "Pertek selesai"). Live **Σ%** indicator; warning Alert if ≠ 100% (VR-03.6).
4. **RAB Internal** — `Collapsible`, header badged **"Internal — tidak tampil ke klien"**. Biaya Personil (A) + Biaya Langsung (B) → **Total RAB**; **Estimasi Margin = Total Penawaran − Total RAB** (success if ≥0, destructive if <0). Excluded from preview.
5. **Catatan & Ketentuan** — `Textarea`.

### 5.3 Document preview (`sph-document.tsx`) — right column + fullscreen
Rendered inside `document-paper.tsx` (a `bg-card` paper card, subtle border/shadow, generous padding). Content, live from form state:
- **Kop:** "PT Sinar Buana Mandiri Jaya" identity block (mock) + a brand mark.
- **No SPH**, Tanggal, Masa berlaku.
- **Kepada:** perusahaan nama + PIC + alamat.
- **Tabel layanan:** No · Uraian Layanan · Volume · Harga Satuan (mono) · Jumlah (mono, right-aligned in the document).
- **Total Penawaran** (mono, emphasized) + **Terbilang** (italic).
- **Skema Termin** list (label · % · pemicu).
- **Catatan & Ketentuan**.
- *(No RAB / margin.)*
Empty state: placeholder lines ("Pilih perusahaan…", "Tambahkan layanan…") so the paper never looks broken.

### 5.4 Fullscreen preview
**Pratinjau Layar Penuh** opens a full-screen `Dialog` (or fixed overlay) showing `<SphDocument>` inside `<DocumentPaper>` centered on a muted backdrop, scrollable, max-width ~A4. Overlay actions: **Tutup** (Esc), **Unduh** (demo toast), **Kirim** (demo toast). Same component as the side preview — single source of truth.

## 6. Data model (Zod)

```ts
SphStatus = "draft" | "terkirim" | "deal"
SphItem   = { layananId, nama, volume:number, harga:number }
SphTermin = { label:string, persen:number, pemicu:string }
Sph = {
  id:string,             // "SPH/001/5.2026"
  perusahaanId, perusahaanNama, pic, alamat,
  tanggal:string, masaBerlaku:number,
  items: SphItem[],
  termin: SphTermin[],
  rab: { personil:number, langsung:number },   // internal
  catatan:string,
  status: SphStatus,
}
```
Fixtures: ~5 seeded SPHs across statuses, referencing real perusahaan/katalog names. List/get via the mock-data spine (delay + Zod parse). The builder uses RHF; computed values (`totalPenawaran`, `totalRab`, `margin`, `terminPersenTotal`) come from pure helpers in `lib/sph.ts`.

## 7. Calc helpers (`lib/sph.ts`) — unit-tested

```ts
totalPenawaran(items): number          // Σ volume*harga
totalRab(rab): number                  // personil + langsung
margin(items, rab): number             // totalPenawaran − totalRab
terminPersenTotal(termin): number      // Σ persen
isTerminValid(termin): boolean         // Σ% === 100
```
Tests cover totals, margin (incl. negative), and termin-sum validation.

## 8. Per-screen done criteria

Both themes; tokens only; Bahasa-Indonesia; money mono/tabular; live preview updates as the form changes; RAB never appears in preview/fullscreen; termin Σ% warning works; Σ Total + Terbilang correct; fullscreen overlay opens/closes; list navigates to builder; build + helper tests pass.

## 9. Out of scope (this round)

Real Convert-Deal → Proyek/Faktur generation (FR-03.9) · real persistence/email send (EP-10) · RBAC · No-SPH real auto-numbering (display only). *(Updated: the schedule matrix and a real downloadable document are now IN scope — see §11.)*

## 11. Document template — canonical real SPH (overrides the simplified preview)

> Reference: `6. penawaran harga ukl upl PT MAB kab bdg.pdf` (real SBMJ SPH). The downloaded document must look like this. **SBMJ blue letterhead + logo** (document-specific branding, distinct from the green app chrome — the document is a branded artifact). Full **multi-page package**.

**The document is a package of pages, each a `DocumentPaper`:**

1. **Cover letter** (client-facing, page 1) — SBMJ letterhead band + logo + identity; right block `No / Tanggal(city, date)`; `Perihal: Surat Penawaran Harga` / `Lampiran: -`; **Kepada Yth. / Bpk-Ibu Direktur / {perusahaan} / Di Tempat`**; intro paragraph "Sehubungan dengan permintaan Kegiatan {perusahaan} di wilayah {wilayah} dengan Jenis Investasi: {jenisInvestasi}. Kami menawarkan jasa {daftar layanan}…"; **service table** `No · Uraian · Harga Satuan (Rp) · Vol ({satuan}, e.g. "1 Paket") · Harga (Rp)`; **Total Biaya** + **Terbilang** (italic); **Catatan** bullets: (a) "Penawaran harga berlaku {masaBerlaku} hari kalender", (b) the boilerplate fisik/konstruksi note, (c) **Termin pembayaran dibagi menjadi {n} termin:** numbered list from the termin scheme ("40% pada saat {pemicu}…"), plus any free-text catatan; closing paragraph; **signature block** (Hormat Kami / logo-stamp placeholder / {direktur.nama} / {direktur.jabatan}); **footer band** (phone · email · addresses · website).
2. **RAB page per service** (internal — never in the client send) — title "RINCIAN ANGGARAN BIAYA / PENGURUSAN {layanan}"; **A. Rincian Biaya Personil** (Uraian · Vol(Bln) · Harga Satuan · Jumlah → Jumlah A); **B. Rincian Biaya Langsung** (Uraian · Volume(Ls) · Harga Satuan · Jumlah → Jumlah B); **TOTAL BIAYA** = A + B. Seeded from a per-service RAB template (prototype; detailed per-row editing is a later round).
3. **Schedule page per service** (Estimasi Jadwal) — title "ESTIMASI JADWAL RENCANA KEGIATAN / {layanan}"; matrix NO · KEGIATAN · BULAN-1..3 × MINGGU 1-4; cells **highlighted (warning/yellow)** per a seeded plan. Seeded 12-activity template; cell-toggle/flexible-weeks editing is a later round.

**Data model additions** (`schemas/penawaran.ts`):
- `sphItemSchema`: add `satuan: z.string()` (default "Paket") + optional per-service `rab` detail + `jadwal` highlight plan (seeded).
- `sphFormSchema`/`sphSchema`: add `wilayah: z.string()`, `jenisInvestasi: z.string()`.
- New `src/lib/company-profile.ts` (mock SBMJ identity): nama, tagline "Konsultan Lingkungan", logo placeholder, kota, alamat[] (Karawang + Bandung), telepon "0856-2483-2610", email "contact.sbmj@gmail.com", website "www.portalkonsultan.com", direktur `{ nama: "Dini Mardiani, SE.,MBA", jabatan: "Direktur" }`. (Stand-in until EP-02 Profil Perusahaan exists.)

**Branding:** the document uses an SBMJ blue palette scoped to a `.sph-doc` wrapper (its own CSS vars / classes), NOT the app's green tokens — intentional, since it represents the real branded letter. Logo = a styled placeholder mark ("SBMJ" badge) with the real asset droppable later.

**Side preview** shows the cover letter (primary). **Fullscreen preview** stacks the whole package (letter + RAB pages + schedule pages). **Unduh** = browser print (`window.print()`) with a print stylesheet that prints only the document pages at A4 — produces a PDF that looks like the template. (No server-side PDF this round.)

**Builder form (this round):** edits the client-facing letter parts + adds **Wilayah** and **Jenis Investasi** fields and per-line **Satuan**. The per-service RAB-detail and schedule-cell editing are seeded from templates and rendered in the document; full editing of those is a follow-up.

## 11.1 Revision (real-doc v2 — second reference PDF, 2026-06-08)

Two real SBMJ SPHs reviewed. Corrections to align the template + builder:

1. **Remove PIC and Jenis Investasi entirely** from the SPH form + document. Kepada block = `Kepada Yth. / Bpk/Ibu Direktur / {perusahaan} / Di Tempat` (no PIC, no address). Drop `pic` usage + `jenisInvestasi` field/schema.
2. **Remove Masa Berlaku** entirely (field + schema + the validity catatan bullet + the letterhead "masa berlaku" line). Also drop `wilayah` (it was only for the old templated intro — the intro is now free text).
3. **Date picker = shadcn** `Calendar` in a `Popover` (DS-09 pattern), not the native `<input type=date>`.
4. **Letterhead fix:** the full "PT SINAR BUANA MANDIRI JAYA" must not be cut off — give it room (wider block, no truncation, sized to fit), with the tagline under it.
5. **Logo configurable:** render `companyProfile.logo` (an image) if set, else the placeholder badge. Logo path is config (drop in the real sun logo). Treat company profile (logo, footer contact, signatory) as the editable config source.
6. **Per-service RAB + schedule, editable, in the Lampiran (multi-page, multi-form):** EACH service line item carries its OWN editable `rab` (Biaya Personil rows + Biaya Langsung rows, each `{uraian, vol, hargaSatuan}`) and `jadwal` (12 activity labels + week highlights). The builder provides a per-service "Kelola RAB & Jadwal" sub-form (e.g. a dialog with RAB-rows editor + a click-to-toggle week matrix). The document's **Lampiran** = one RAB page + one Estimasi Jadwal page per service (each with its own values; RAB page ends with a **Terbilang** line). The cover-letter **Lampiran** field (default "RAB dan Estimasi Waktu") + a catatan line "…Terlampir". Internal **Estimasi Margin = Total Penawaran − Σ(per-service RAB totals)**.
7. **Configurable text from form data:** the **kalimat pembuka** (intro paragraph) is a free `Textarea` field; the **Catatan** is an editable **list of bullet lines** (add/remove), with the termin scheme rendered as one bullet ("Termin pembayaran dibagi menjadi N tahap: 1. X% …"); the **footer** (phone/email/addresses/website) + **signatory** come from the editable `companyProfile` config.

**Cover-letter service table columns** (per the real doc): `No · Uraian · Biaya Satuan (Rp) · Banyaknya · Total (Rp)` → **TOTAL BIAYA** + **Terbilang** row. `satuan` is kept on items but the column shows "Banyaknya" (the volume).

**Updated data model:** `sphItemSchema` += `rab: { personil: RabRow[]; langsung: RabRow[] }`, `jadwal: { kegiatan: string[]; highlights: number[][] }`. `sphFormSchema`: remove `pic`(optional/unused), `jenisInvestasi`, `masaBerlaku`, `wilayah`; add `kalimatPembuka: string`, `catatan: string[]` (bullet lines), `lampiran: string`. `RabRow` reused from `lib/sph-templates.ts`; `rabTemplate`/`jadwalTemplate` become the *defaults* used to seed a new service's editable rab/jadwal.

## 10. Reuse for Faktur (next)

`BuilderLayout`, `DocumentPaper`, `LineItemEditor`, the document-package + print approach, and the calc-helper + mock-spine pattern carry to Faktur. Faktur gets its own spec/plan.

## 10. Reuse for Faktur (next)

`BuilderLayout`, `DocumentPaper`, `LineItemEditor`, and the calc-helper + mock-spine pattern carry directly to Faktur (Faktur Induk + Invoice Termin with the tax engine). Faktur gets its own spec/plan.
