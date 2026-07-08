[← Daftar Isi](README.md)

---

# EP-10 — Pengiriman & Aksi Dokumen

> **Sumber PRD:** [Bab 11](../prd/11-template-pdf.md) · **Aktor utama:** Sales (SPH), Keuangan (Invoice/Slip)
> **Dependencies:** [EP-00](00-konfigurasi-sistem.md) (akun email/SMTP, template pesan, template PDF)
> **Dipakai oleh:** [EP-03 SPH](03-penawaran-sph.md), [EP-05 Faktur](05-faktur-termin.md), [EP-06 Penggajian](06-penggajian.md)

---

## 1. Tujuan & Konteks

Standar **set aksi dokumen** yang konsisten untuk semua dokumen yang dihasilkan sistem
(SPH, Estimasi Jadwal, RAB, Invoice Termin, Slip Gaji), beserta spesifikasi **template PDF**.
Pengiriman via **WhatsApp** (`wa.me` + lampir PDF manual, tanpa biaya gateway) dan **Email
otomatis** (PDF terlampir, perlu SMTP).

> **Status implementasi (2026-07-08):** Kirim WhatsApp (FR-10.3) dan Kirim Email
> (FR-10.4) tersambung ke backend nyata — riwayat pengiriman (`document_deliveries`)
> tersimpan permanen di Postgres, bukan lagi state mock. Kirim WhatsApp tetap sinkron
> (buka `wa.me`, langsung tercatat "Terkirim"); Kirim Email kini benar-benar mengantre
> lewat `pg-boss` dan dikirim oleh worker Node terpisah (`nodemailer` ke akun SMTP yang
> dikonfigurasi Admin) — statusnya `Menunggu` → `Terkirim`/`Gagal`, bukan langsung
> sukses. **Belum diimplementasikan pass ini:** melampirkan PDF secara otomatis ke email
> (FR-10.4 masih mengirim subjek+isi teks saja, tanpa lampiran) — dilampirkan manual
> untuk WhatsApp seperti sebelumnya, dan untuk Email PDF belum di-generate/attach sama
> sekali. FR-10.7 (duplikasi template PDF) tetap belum dibangun.

---

## 2. Functional Requirements

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-10.1 | Set aksi standar tiap dokumen: **Draf, Pratinjau, Edit, Unduh, Kirim WhatsApp, Kirim Email**. | M |
| FR-10.2 | **Edit** tidak mengubah nomor dokumen (SPH/INV tetap, [BR-1](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)). | M |
| FR-10.3 | **Kirim WhatsApp**: buka `wa.me` ke nomor tujuan dengan **pesan template terisi**; PDF dilampirkan manual oleh pengguna. | M |
| FR-10.4 | **Kirim Email (otomatis)**: kirim email ke tujuan dengan **PDF terlampir** + isi dari template; perlu akun email ([EP-00](00-konfigurasi-sistem.md)). | M |
| FR-10.5 | Semua template PDF memakai **header** (logo+identitas), **footer** (kontak), & blok **penandatangan** dari Profil Perusahaan. | M |
| FR-10.6 | **Matriks aksi per dokumen** ditegakkan (mis. **RAB tidak punya WA/Email** — internal). | M |
| FR-10.7 | Template PDF **dapat dikustomisasi & diduplikasi** ([EP-00](00-konfigurasi-sistem.md)). | S |
| FR-10.8 | Tujuan pengiriman per dokumen sesuai aturan (Slip → **karyawan ybs saja**). | M |

---

## 3. Role / Permission Matrix

Aksi mengikuti hak modul sumber (kolom **S = Send** pada [RBAC global](README.md#5-role--permission-matrix--global-rbac)):

| Dokumen | Yang boleh kirim |
| --- | --- |
| SPH / Estimasi Jadwal | Admin, Sales |
| Invoice Termin | Admin, Keuangan |
| Slip Gaji | Admin, Keuangan (tujuan: karyawan ybs) |
| RAB | — (tidak dikirim ke klien) |

---

## 4. Matriks Aksi per Dokumen

Legenda: ✓ tersedia · ✗ tidak

| Dokumen | Draf | Preview | Edit | Unduh | WA | Email | Tujuan |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| SPH (Penawaran) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PIC / email perusahaan |
| Estimasi Jadwal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ikut paket SPH |
| RAB (internal) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | **internal — tidak dikirim ke klien** |
| Invoice Termin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PIC / email perusahaan |
| Slip Gaji | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **karyawan ybs (rahasia)** |

---

## 5. User Stories + Acceptance Criteria

### US-10.1 — Pratinjau & unduh PDF
**As a** pengguna, **I want** melihat pratinjau & mengunduh PDF, **so that** saya memverifikasi
sebelum kirim. · **Prioritas: M**

```gherkin
Scenario: Pratinjau sebelum kirim
  Given dokumen (mis. Invoice) sudah dibuat
  When pengguna menekan "Pratinjau"
  Then PDF dirender dengan header/footer & penandatangan dari Profil Perusahaan

Scenario: Unduh
  When pengguna menekan "Unduh"
  Then file PDF tersimpan ke perangkat
```

### US-10.2 — Kirim via WhatsApp (wa.me)
**As a** Sales/Keuangan, **I want** membuka WhatsApp dengan pesan terisi, **so that** komunikasi cepat
tanpa biaya gateway. · **Prioritas: M**

```gherkin
Scenario: Buka wa.me dengan template
  Given Invoice untuk perusahaan X dengan No INV
  When pengguna menekan "Kirim WhatsApp"
  Then sistem membuka tautan wa.me ke nomor PIC dengan pesan template terisi ({perusahaan}, {no_inv})
  And pengguna melampirkan PDF yang sudah diunduh secara manual
```

### US-10.3 — Kirim Email otomatis dengan lampiran
**As a** Sales/Keuangan, **I want** mengirim email otomatis berlampir PDF, **so that** dokumen sampai
resmi tanpa langkah manual. · **Prioritas: M**

```gherkin
Scenario: Email otomatis terkirim
  Given akun email/SMTP terkonfigurasi (EP-00)
  When pengguna menekan "Kirim Email" pada SPH
  Then sistem mengirim email ke PIC/email perusahaan dengan PDF terlampir & isi dari template

Scenario: Email belum dikonfigurasi
  Given akun email belum diatur
  When pengguna menekan "Kirim Email"
  Then sistem menonaktifkan aksi/menampilkan peringatan untuk mengatur email dulu (tidak gagal diam-diam)
```

### US-10.4 — Batasan aksi per dokumen (RAB internal)
**As the** sistem, **I want** menerapkan matriks aksi, **so that** dokumen internal tidak terkirim ke
klien. · **Prioritas: M**

```gherkin
Scenario: RAB tanpa opsi kirim klien
  Given dokumen RAB internal
  When pengguna membuka aksi dokumen
  Then opsi Kirim WhatsApp & Kirim Email tidak tersedia
  And hanya Draf/Pratinjau/Edit/Unduh yang tersedia
```

### US-10.5 — Tujuan slip gaji terbatas
**As the** sistem, **I want** membatasi tujuan slip ke karyawan ybs, **so that** kerahasiaan terjaga.
· **Prioritas: M**

```gherkin
Scenario: Slip hanya ke karyawan bersangkutan
  Given slip gaji final "Sudah Dibayar" (EP-06)
  When Keuangan mengirim via WA/Email
  Then tujuan hanya nomor/email karyawan pemilik slip (bukan pihak lain)
```

### US-10.6 — Nomor dokumen tetap saat edit
**As the** sistem, **I want** menjaga nomor saat dokumen diedit, **so that** integritas penomoran
terjaga. · **Prioritas: M**

```gherkin
Scenario: Edit tidak mengubah nomor
  Given SPH/Invoice telah memiliki nomor
  When pengguna mengedit isi via Edit
  Then nomor dokumen tetap sama (BR-1)
```

---

## 6. Field Validation

| ID | Field | Tipe | Wajib | Aturan | Pesan error |
| --- | --- | --- | --- | --- | --- |
| VR-10.1 | Nomor tujuan WA | Telepon | Ya (saat WA) | Dari PIC/karyawan | "Nomor tujuan tidak tersedia." |
| VR-10.2 | Email tujuan | Email | Ya (saat Email) | Dari PIC/perusahaan/karyawan | "Email tujuan tidak tersedia." |
| VR-10.3 | Akun email pengirim | Konfigurasi | Ya (saat Email) | Terkonfigurasi & teruji (EP-00) | "Atur akun email pengirim dulu." |
| VR-10.4 | Template pesan | Teks | Ya | Placeholder valid terisi | "Template pesan belum lengkap." |
| VR-10.5 | Status dokumen (Slip) | Status | Ya (saat kirim slip) | = Sudah Dibayar | "Slip final hanya dapat dikirim setelah dibayar." |

---

## 7. Spesifikasi Template PDF (ringkas)

| Template | Elemen utama |
| --- | --- |
| **SPH** | No SPH, tanggal, perihal, tujuan (Perusahaan+PIC), tabel layanan, Total, **Terbilang**, catatan (masa berlaku, termin), TTD |
| **RAB (internal)** | Biaya Personil (A), Biaya Langsung (B), Total; tidak dikirim klien |
| **Estimasi Jadwal** | Tabel kegiatan × minggu (jumlah bulan dapat diatur), penanda minggu (sorot kuning) |
| **Invoice Termin** | No Inv, tanggal, **jatuh tempo**, label termin, tujuan, tabel uraian, Total Biaya, **pengurang termin sebelumnya**, DPP/PPN/PPh, Total Setelah Pajak, **rekening terpilih**, "berlaku sebagai kwitansi", TTD |
| **Slip Gaji** | Nama, Periode, Posisi, Status, komponen pendapatan, Jumlah Gaji, catatan rahasia |

> Detail layout Estimasi Jadwal: [PRD Bab 11.1](../prd/11-template-pdf.md#111-detail-template-estimasi-jadwal-rencana-kegiatan).

---

## 8. Edge Cases & Catatan Penting

- **WhatsApp = lampir manual** (sistem hanya membuka `wa.me` + pesan); jangan asumsikan PDF otomatis terlampir.
- **Email butuh SMTP** — bila belum ada, aksi dinonaktifkan dengan pesan jelas ([EP-00](00-konfigurasi-sistem.md)).
- **RAB internal** — tanpa WA/Email ([matriks §4](#4-matriks-aksi-per-dokumen)).
- **Slip rahasia** — tujuan hanya karyawan ybs & hanya setelah final ([EP-06](06-penggajian.md), [BR-9](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **Nomor tetap saat edit** ([BR-1](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **Placeholder template** harus tervalidasi agar tidak terkirim pesan dengan `{token}` mentah.

---

## 9. Dependencies & Keterkaitan

- **Prasyarat:** [EP-00](00-konfigurasi-sistem.md) (email/SMTP, template).
- **Dipakai oleh:** [EP-03 SPH](03-penawaran-sph.md), [EP-05 Faktur](05-faktur-termin.md), [EP-06 Penggajian](06-penggajian.md).
