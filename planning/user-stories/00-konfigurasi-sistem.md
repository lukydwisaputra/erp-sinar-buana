[← Daftar Isi](README.md)

---

# EP-00 — Konfigurasi Sistem & Master Data Terkelola

> **Sumber PRD:** [Bab 9](../prd/09-konfigurasi.md) · **Aktor utama:** Admin/Owner
> **Dependencies:** — (epic paling dasar; harus disiapkan **sebelum** transaksi berjalan)
> **Diturunkan ke:** seluruh epic (tarif, penomoran, status, kategori, template, pengiriman)

---

## 1. Tujuan & Konteks

Satu area **Pengaturan** tempat klien mengelola **sendiri** (tanpa developer) seluruh daftar
pilihan, workflow status, kategori, template, tarif, dan kanal pengiriman. Ini adalah inti
prinsip **Configurable & Scalable**: nilai yang dapat bertumbuh **tidak di-hardcode**.

**Mengapa epic pertama:** SPH, Faktur, Penggajian, dan otomasi Arus Kas/Pajak semuanya
bergantung pada nilai yang diset di sini (tarif pajak, format nomor, status, kategori).

---

## 2. Functional Requirements

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-00.1 | Setiap item konfigurasi mendukung **CRUD + aktif/nonaktif + urutan**. | M |
| FR-00.2 | Mengelola **Daftar Pilihan** master: Jenis Layanan, Jenis Dokumen, Kewenangan, Dasar Hukum, Area/Kawasan Industri, Jabatan, Status Kepegawaian (+pengali), Komponen Gaji (+cara hitung), Rekening Bank. | M |
| FR-00.3 | Mengelola **Workflow Status** untuk Proyek/Penawaran/Faktur/Penggajian, dengan **pemetaan ke peran sistem** (`SELESAI/LUNAS/DIBAYAR/BATAL`). | M |
| FR-00.4 | **4 kategori Arus Kas terkunci** (Faktur, Penggajian, Pajak, Bonus); kategori kustom tak terbatas dapat dibuat. Tiap kategori membawa **Sifat Beban** (HPP/Operasional/Non-Laba-Rugi) untuk Laba-Rugi ([EP-07](07-arus-kas.md), [EP-09](09-dasbor.md)). | M |
| FR-00.5 | Mengelola **Template**: milestone per jenis layanan, template PDF (SPH/Invoice/Slip), skema termin — dapat dibuat, **diduplikasi**, diedit. | M |
| FR-00.6 | Mengelola **Tarif & Penomoran**: tarif PPN/PPh, jatuh tempo pajak (PPN/PPh/BPJS), jatuh tempo pembayaran faktur (N hari), status PKP, pengali probation, masa berlaku penawaran, **format nomor SPH/INV**. | M |
| FR-00.6b | Mengelola **parameter profitabilitas & dasbor**: metode + tarif **PPh Badan** (Final 0,5% omzet / 22% laba) + ambang Rp 4,8 M; **ambang kesehatan margin proyek**; **horizon proyeksi kas** (default 90 hari); **ambang proyek mangkrak** (N hari). | S |
| FR-00.7 | **Aturan penomoran:** counter **terpisah** SPH vs INV, **reset tiap bulan**, **nomor tetap saat dokumen diedit**. | M |
| FR-00.8 | Mengelola **Pengiriman**: akun email/SMTP pengirim + template isi email per jenis dokumen; template pesan WhatsApp per jenis dokumen. | M |
| FR-00.9 | Item yang dinonaktifkan **tidak muncul** pada form baru, tetapi data historis yang sudah memakainya tetap utuh. | S |

---

## 3. Role / Permission Matrix

| Aksi | Admin/Owner | Keuangan | Sales | Tim Teknis | Viewer |
| --- | :-: | :-: | :-: | :-: | :-: |
| Seluruh Konfigurasi Sistem | CRUD | – | – | – | – |

> Hanya **Admin/Owner** yang dapat mengakses modul Konfigurasi (ditegakkan server-side, [GC-12](11-konvensi-global-nfr.md#5-keamanan--rbac-gc-12)).

---

## 4. User Stories + Acceptance Criteria

### US-00.1 — Kelola daftar pilihan (master data terkelola)
**As an** Admin, **I want** menambah/ubah/nonaktifkan item daftar pilihan, **so that** form di
seluruh sistem menampilkan opsi yang relevan tanpa developer. · **Prioritas: M**

```gherkin
Scenario: Tambah item daftar pilihan
  Given Admin membuka Pengaturan > Daftar Pilihan > Jenis Dokumen
  When Admin menambah "RKL-RPL Rinci" dan menyimpan
  Then item muncul sebagai opsi aktif di form Katalog Layanan & Proyek

Scenario: Nonaktifkan item yang sudah dipakai
  Given "SPPL" sudah dipakai oleh 3 layanan
  When Admin menonaktifkan "SPPL"
  Then "SPPL" tidak lagi muncul untuk pilihan baru
  And 3 layanan lama yang memakai "SPPL" tetap utuh dan terbaca

Scenario: Atur urutan tampil
  Given terdapat beberapa item Jabatan
  When Admin mengubah urutan (drag/urut)
  Then urutan baru dipakai konsisten di semua dropdown terkait
```

### US-00.2 — Kelola workflow status + pemetaan peran sistem
**As an** Admin, **I want** menamai ulang/menambah status & memetakannya ke peran sistem,
**so that** otomasi keuangan tetap valid meski label diubah. · **Prioritas: M**

```gherkin
Scenario: Ganti label tanpa merusak otomasi
  Given status Faktur "Lunas" terpetakan ke peran sistem LUNAS
  When Admin mengganti label "Lunas" menjadi "Paid"
  Then otomasi tetap memicu entri Arus Kas saat status berperan LUNAS tercapai

Scenario: Tambah status baru wajib punya pemetaan peran (bila relevan otomasi)
  Given Admin menambah status Proyek baru "Review Klien"
  When status disimpan tanpa peran sistem
  Then status berfungsi sebagai status biasa (tidak memicu otomasi)
  And Admin dapat memetakannya ke SELESAI/BATAL bila diperlukan

Scenario: Cegah penghapusan pemetaan peran inti yang sedang dipakai otomasi
  Given peran sistem LUNAS dipetakan ke satu status Faktur
  When Admin mencoba menghapus satu-satunya status berperan LUNAS
  Then sistem mencegah & meminta menetapkan pengganti terlebih dahulu
```
> Detail aturan: [BR-12](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic).

### US-00.3 — Kelola kategori Arus Kas
**As an** Admin, **I want** membuat kategori kustom Arus Kas, **so that** transaksi non-standar
terklasifikasi. · **Prioritas: M**

```gherkin
Scenario: 4 kategori inti terkunci
  Given kategori Faktur, Penggajian, Pajak, Bonus dipakai otomasi
  When Admin membuka pengaturan kategori
  Then keempatnya ditandai terkunci (tidak dapat dihapus/diubah nama)

Scenario: Tambah kategori kustom
  When Admin menambah kategori "Biaya Operasional"
  Then kategori tersedia di Arus Kas, Faktur, dan Penggajian
```

### US-00.4 — Atur tarif pajak & penomoran dokumen
**As an** Admin, **I want** mengatur tarif pajak & format nomor, **so that** dokumen & pajak
terhitung dan ternomori sesuai aturan. · **Prioritas: M**

```gherkin
Scenario: Set format nomor SPH
  Given Admin mengatur format "SPH/{urut}/{bulan}.{tahun}"
  When dokumen SPH pertama dibuat pada Mei 2026
  Then nomor menjadi "SPH/001/5.2026"

Scenario: Counter reset bulanan & terpisah
  Given counter SPH mencapai 012 pada Mei 2026
  When bulan berganti ke Juni 2026 dan SPH baru dibuat
  Then nomor urut kembali ke "001"
  And counter INV memiliki urutan sendiri yang terpisah dari SPH

Scenario: Ubah tarif pajak default
  Given tarif PPN default 12% dan PPh 23 2%
  When Admin mengubah tarif PPN
  Then dokumen BARU memakai tarif baru
  And dokumen lama yang sudah terbit tidak berubah
```
> **Catatan kritis:** nomor **tetap saat dokumen diedit** ([BR-1](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).

### US-00.5 — Kelola template (milestone, PDF, termin)
**As an** Admin, **I want** membuat & menduplikasi template, **so that** dokumen/proyek konsisten
& cepat dibuat. · **Prioritas: M**

```gherkin
Scenario: Duplikasi template milestone
  Given ada template milestone "Pertek Air Limbah" (12 langkah)
  When Admin menduplikasi & menyesuaikan untuk "Rintek LB3"
  Then template baru tersimpan terpisah dan dapat dipilih saat membuat proyek
```

### US-00.6 — Atur kanal pengiriman (email/SMTP & WhatsApp)
**As an** Admin, **I want** mengatur akun email pengirim & template pesan, **so that** dokumen dapat
dikirim otomatis. · **Prioritas: M**

```gherkin
Scenario: Konfigurasi akun email pengirim
  Given Admin memasukkan kredensial SMTP/penyedia email
  When Admin menyimpan & menguji koneksi
  Then sistem mengonfirmasi koneksi berhasil
  And email otomatis (mis. kirim Invoice) dapat dikirim dari akun tersebut

Scenario: Template pesan per jenis dokumen
  When Admin menyusun template WhatsApp untuk Invoice dengan placeholder {perusahaan} {no_inv}
  Then saat kirim WA, placeholder terisi otomatis dari data dokumen
```

---

## 5. Field Validation

| ID | Field | Tipe | Wajib | Aturan | Pesan error |
| --- | --- | --- | --- | --- | --- |
| VR-00.1 | Nama item daftar pilihan | Teks | Ya | Unik per kategori | "Item dengan nama ini sudah ada." |
| VR-00.2 | Pengali status kepegawaian | Desimal | Ya | > 0 (mis. 0,8) | "Pengali harus lebih dari 0." |
| VR-00.3 | Tarif PPN / PPh | Persen | Ya | 0–100 | "Tarif harus antara 0 dan 100%." |
| VR-00.4 | Jatuh tempo (N hari) | Integer | Ya | ≥ 0 | "Jatuh tempo harus angka ≥ 0." |
| VR-00.5 | Format nomor | Teks pola | Ya | Mengandung token `{urut}`; token `{bulan}`/`{tahun}` opsional | "Format nomor harus memuat {urut}." |
| VR-00.6 | Status PKP | Boolean | Ya | PKP / non-PKP | — |
| VR-00.6a | Sifat Beban kategori | Pilihan | Ya | HPP / Operasional / Non-Laba-Rugi | "Sifat beban wajib dipilih." |
| VR-00.6b | Metode PPh Badan | Pilihan | Ya | Final 0,5% / 22% laba | — |
| VR-00.6c | Horizon proyeksi & ambang mangkrak | Integer hari | S | > 0 | "Harus angka > 0 hari." |
| VR-00.7 | Akun SMTP | Kredensial | Ya (bila email diaktifkan) | Tes koneksi harus sukses | "Koneksi email gagal — periksa kredensial." |
| VR-00.8 | Rekening bank | Nama bank + a.n. + no rek | Ya (per rekening) | No rek numerik | "Nomor rekening harus angka." |

---

## 6. State & Transition

Tidak ada state-machine khusus di epic ini. **Yang krusial:** epic ini **mendefinisikan**
state-machine yang dipakai epic lain via Workflow Status (lihat [US-00.2](#us-002--kelola-workflow-status--pemetaan-peran-sistem)).

| Peran sistem | Efek otomasi |
| --- | --- |
| `SELESAI` | Menutup proyek/milestone |
| `LUNAS` | Memicu entri Pemasukan di Arus Kas |
| `DIBAYAR` | Memicu entri Pengeluaran di Arus Kas |
| `BATAL` | Membatalkan entri terkait |

---

## 7. Edge Cases & Catatan Penting

- **Nonaktif ≠ hapus:** menonaktifkan item menjaga integritas data historis; gunakan ini alih-alih hapus untuk opsi yang pernah dipakai.
- **Perubahan tarif tidak retroaktif:** dokumen yang sudah terbit menyimpan tarif saat penerbitan.
- **Penomoran:** kombinasi *reset bulanan* + *nomor tetap saat edit* + *counter terpisah* — uji ketiganya bersamaan ([BR-1, BR-2](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **Status PKP** menentukan apakah PPN dipungut di seluruh modul Faktur/Pajak ([BR-5](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **Email belum dikonfigurasi:** aksi "Kirim Email" harus dinonaktifkan/menampilkan peringatan, bukan gagal diam-diam.

---

## 8. Dependencies & Keterkaitan

- **Prasyarat:** tidak ada.
- **Diandalkan oleh:** [EP-02 Master Data](02-master-data.md) (daftar pilihan), [EP-03](03-penawaran-sph.md) & [EP-05](05-faktur-termin.md) (penomoran, tarif, template), [EP-07](07-arus-kas.md) (kategori), [EP-08](08-tax-center.md) (tarif, jatuh tempo, PKP), [EP-10](10-pengiriman-dokumen.md) (akun email & template pesan).
- Konvensi global: [11-konvensi-global-nfr.md](11-konvensi-global-nfr.md).
