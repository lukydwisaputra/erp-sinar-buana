[← Daftar Isi](README.md)

---

# EP-02 — Master Data

> **Sumber PRD:** [Bab 3](../prd/03-master-data.md) · **Aktor utama:** Admin, Sales (Perusahaan/Katalog), Keuangan (Karyawan/Profil)
> **Dependencies:** [EP-00 Konfigurasi](00-konfigurasi-sistem.md) (daftar pilihan), [EP-01](01-autentikasi-akun.md) (akun tertaut karyawan)
> **Diturunkan ke:** [EP-03](03-penawaran-sph.md), [EP-04](04-manajemen-proyek.md), [EP-05](05-faktur-termin.md), [EP-06](06-penggajian.md)

---

## 1. Tujuan & Konteks

Sumber data terpusat yang dipakai seluruh modul: **Perusahaan + PIC**, **Katalog Layanan**,
**Data Karyawan**, dan **Profil Perusahaan**. Layanan & dokumen mengacu ke sini (bukan teks bebas)
agar konsisten dan dapat direlasikan.

---

## 2. Functional Requirements

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-02.1 | CRUD **Perusahaan** dengan info umum + **lebih dari satu PIC** per perusahaan. | M |
| FR-02.2 | CRUD **Katalog Layanan** sebagai master (nama, jenis dokumen, kewenangan, dasar hukum, harga standar opsional, tag berulang, template milestone opsional). | M |
| FR-02.3 | CRUD **Data Karyawan** (nama, jabatan, status kepegawaian + pengali, gaji pokok, tunjangan default, info bank, NPWP/PTKP, tanggal masuk). | M |
| FR-02.4 | Kelola **Profil Perusahaan**: logo/identitas, **rekening bank (boleh >1)**, penandatangan default, **NPWP & status PKP**, akun email pengirim, template pesan. | M |
| FR-02.5 | Field relasi (jenis dokumen, jabatan, area, dll.) memakai **daftar pilihan dari [EP-00](00-konfigurasi-sistem.md)**. | M |
| FR-02.6 | **Tag berulang** (mis. Laporan Semester) pada layanan memicu pengingat/proyek berulang di [EP-04](04-manajemen-proyek.md). | S |
| FR-02.7 | Layanan dengan **harga standar** otomatis mengisi harga saat dipilih di SPH (dapat ditimpa). | S |
| FR-02.8 | Penghapusan = soft delete + arsip ([GC-9](11-konvensi-global-nfr.md#2-penghapusan-data--soft-delete--arsip-gc-9)). | M |

---

## 3. Role / Permission Matrix

| Entitas | Admin | Keuangan | Sales | Tim Teknis | Viewer |
| --- | :-: | :-: | :-: | :-: | :-: |
| Perusahaan & PIC | CRUDE | R | CRUE | R | R |
| Katalog Layanan | CRUD | R | CRU | R | R |
| Data Karyawan | CRUD | R | – | R | – |
| Profil Perusahaan | CRUD | R | – | – | R |

---

## 4. User Stories + Acceptance Criteria

### US-02.1 — Kelola Perusahaan + PIC
**As a** Sales, **I want** menambah perusahaan dengan satu/lebih PIC, **so that** perusahaan dapat
dipilih di SPH, Faktur, dan Proyek. · **Prioritas: M**

```gherkin
Scenario: Tambah perusahaan dengan beberapa PIC
  Given Sales membuka Perusahaan > Tambah
  When mengisi info umum (Nama, Alamat, Kota, Kabupaten, NPWP) dan menambah 2 PIC (Nama + HP)
  And menyimpan
  Then perusahaan tersimpan dengan kedua PIC
  And perusahaan tersedia untuk dipilih di Penawaran/Faktur/Proyek

Scenario: Validasi NPWP
  When pengguna mengisi NPWP lebih dari 16 digit
  Then sistem menolak dengan "NPWP maksimal 16 digit angka."

Scenario: PIC wajib minimal nama + HP
  When pengguna menambah PIC tanpa nomor HP
  Then sistem menolak menyimpan PIC tersebut
```

### US-02.2 — Kelola Katalog Layanan
**As a** Sales, **I want** mengelola katalog layanan sebagai master, **so that** SPH & proyek
memakai layanan terstandar dengan template milestone. · **Prioritas: M**

```gherkin
Scenario: Tambah layanan dengan template milestone
  When Sales menambah "Penyusunan Pertek Air Limbah" dengan jenis dokumen, kewenangan,
       dasar hukum, harga standar, dan memilih template milestone
  Then layanan tersedia di SPH & proyek
  And memilih layanan ini saat buat proyek memuat template milestone-nya

Scenario: Tag berulang memicu pengingat
  Given layanan "Laporan Semester" diberi tag berulang
  When sebuah proyek memakai layanan ini untuk klien X tahun 2026
  Then sistem menjadwalkan pengingat Laporan Semester I & II untuk klien X (lihat EP-04)
```

### US-02.3 — Kelola Data Karyawan
**As an** Admin/Keuangan, **I want** mengelola data karyawan, **so that** penggajian & assignment
proyek memiliki sumber data. · **Prioritas: M**

```gherkin
Scenario: Tambah karyawan dengan status & pengali
  When pengguna menambah karyawan dengan status "Probation" (pengali 0,8 dari EP-00) dan gaji pokok
  Then data karyawan tersimpan
  And penggajian menarik gaji pokok, pengali, & tunjangan default saat membuat slip

Scenario: Karyawan menjadi assignee
  Given karyawan tertaut ke akun (EP-01)
  Then karyawan dapat dipilih sebagai assignee di Manajemen Proyek
```

### US-02.4 — Kelola Profil Perusahaan & rekening bank
**As an** Admin, **I want** mengatur identitas, rekening, penandatangan, & status PKP, **so that**
dokumen menampilkan data benar & pajak terhitung tepat. · **Prioritas: M**

```gherkin
Scenario: Beberapa rekening bank
  When Admin menambah 2 rekening bank (mis. BNI a.n. SINAR BUANA MANDIRI JAYA - 0559332815)
  Then keduanya tersedia untuk dipilih per faktur (EP-05)

Scenario: Status PKP mempengaruhi PPN
  Given Admin menetapkan perusahaan sebagai non-PKP
  Then sistem tidak memungut PPN pada faktur (EP-05/EP-08, BR-5)
```

---

## 5. Field Validation

### 5.1 Perusahaan
| ID | Field | Tipe | Wajib | Aturan | Pesan error |
| --- | --- | --- | --- | --- | --- |
| VR-02.1 | Nama Perusahaan | Teks | Ya | — | "Nama perusahaan wajib diisi." |
| VR-02.2 | Alamat | Area teks | Ya | — | "Alamat wajib diisi." |
| VR-02.3 | Kota / Kabupaten | Teks/Dropdown | Ya | — | "Kota & Kabupaten wajib diisi." |
| VR-02.4 | Negara | Statis | Ya | = Indonesia | — |
| VR-02.5 | NPWP | Teks | Ya | ≤16 digit numerik ([GC-2](11-konvensi-global-nfr.md#1-konvensi-format--input-global)) | "NPWP maksimal 16 digit angka." |
| VR-02.6 | Email Perusahaan | Email | Tidak | Format valid bila diisi | "Format email tidak valid." |

### 5.2 PIC (≥1 per perusahaan)
| ID | Field | Tipe | Wajib | Aturan | Pesan error |
| --- | --- | --- | --- | --- | --- |
| VR-02.7 | Nama Narahubung | Teks | Ya | — | "Nama PIC wajib diisi." |
| VR-02.8 | Nomor HP | Telepon | Ya | Format telepon ([GC-5](11-konvensi-global-nfr.md#1-konvensi-format--input-global)) | "Nomor HP wajib & valid." |
| VR-02.9 | Email Narahubung | Email | Tidak | Format valid bila diisi | "Format email tidak valid." |

### 5.3 Karyawan
| ID | Field | Tipe | Wajib | Aturan | Pesan error |
| --- | --- | --- | --- | --- | --- |
| VR-02.10 | Nama Karyawan | Teks | Ya | — | "Nama karyawan wajib diisi." |
| VR-02.11 | Jabatan | Dropdown master | Ya | Dari EP-00 | "Jabatan wajib dipilih." |
| VR-02.12 | Status Kepegawaian | Dropdown master | Ya | Probation/Tetap/Kontrak + pengali | "Status kepegawaian wajib dipilih." |
| VR-02.13 | Gaji Pokok | IDR | Ya | ≥ 0 | "Gaji pokok harus angka ≥ 0." |
| VR-02.14 | NPWP/PTKP | Teks | Tidak | Untuk pajak penggajian | — |

### 5.4 Profil Perusahaan
| ID | Field | Tipe | Wajib | Aturan | Pesan error |
| --- | --- | --- | --- | --- | --- |
| VR-02.15 | Rekening bank | Nama bank + a.n. + no rek | Ya (per item) | No rek numerik | "Nomor rekening harus angka." |
| VR-02.16 | Status PKP | Boolean | Ya | PKP/non-PKP | — |
| VR-02.17 | NPWP perusahaan | Teks | Ya | ≤16 digit | "NPWP maksimal 16 digit angka." |

---

## 6. State & Transition

Tidak ada state-machine. Status hanya **Aktif / Terarsip** (soft delete) per record.

---

## 7. Edge Cases & Catatan Penting

- **PIC jamak:** satu perusahaan **wajib mendukung >1 PIC**; dokumen (SPH/Invoice) memilih PIC tujuan dari daftar ini.
- **Harga standar opsional:** bila kosong, harga diisi manual di SPH.
- **Menghapus master yang dipakai:** soft delete + tetap terbaca di dokumen historis; opsi yang sudah dipakai sebaiknya dinonaktifkan, bukan dihapus.
- **Status PKP & NPWP** di Profil memengaruhi otomasi pajak lintas modul ([BR-5](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **Tautan karyawan↔akun 1:1** — karyawan tanpa akun tidak bisa jadi assignee/terima slip ([EP-01](01-autentikasi-akun.md)).
- **Tag berulang** harus benar agar pengingat Laporan Semester ([EP-04](04-manajemen-proyek.md)) terbentuk.

---

## 8. Dependencies & Keterkaitan

- **Prasyarat:** [EP-00](00-konfigurasi-sistem.md) (daftar pilihan, status PKP), [EP-01](01-autentikasi-akun.md) (akun↔karyawan).
- **Diandalkan oleh:** [EP-03](03-penawaran-sph.md) (perusahaan, PIC, katalog), [EP-04](04-manajemen-proyek.md) (perusahaan, assignee, template milestone), [EP-05](05-faktur-termin.md) (perusahaan, rekening, PKP), [EP-06](06-penggajian.md) (karyawan).
