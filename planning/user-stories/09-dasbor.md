[← Daftar Isi](README.md)

---

# EP-09 — Dasbor (Dashboard)

> **Sumber PRD:** [Bab 8](../prd/08-dasbor.md) · **Aktor utama:** semua peran (tampilan terbatas per RBAC)
> **Dependencies:** [EP-07 Arus Kas](07-arus-kas.md), [EP-04 Proyek](04-manajemen-proyek.md), [EP-05 Faktur](05-faktur-termin.md), [EP-08 Tax Center](08-tax-center.md)
> **Diturunkan ke:** —

---

## 1. Tujuan & Konteks

Ringkasan visual keuangan, **profitabilitas (Laba-Rugi akrual)**, **proyeksi kas & runway**,
proyek, dan pajak dengan **filter** & **drilldown**, plus **Pusat Perhatian** terkonsolidasi.
Disusun sebagai **Pusat Komando** (Owner) + **dasbor per-peran** yang diringkas sesuai
job-desc. Konten **menyesuaikan peran** (mis. Tim Teknis melihat ringkasan proyek, Keuangan
melihat keuangan penuh). Dasbor **tidak menyimpan nilai sendiri** — selalu agregasi real-time.

> **Status implementasi (2026-07-08):** FR-09.1 s/d FR-09.6, FR-09.9–FR-09.12 sudah
> terimplementasi penuh terhadap Postgres nyata. FR-09.7/FR-09.13 (penyaringan per peran)
> ditegakkan server-side lewat satu pemeriksaan `isFinance()` (bukan 4 flag terpisah, karena
> keempatnya identik di seluruh dokumen PRD) — lihat `docs/architecture.md`. US-09.5's
> kriteria "panel tidak dikembalikan server" dipenuhi secara harfiah untuk Laba-Rugi/
> Profitabilitas Per-Proyek/Proyeksi (403 sebelum service dipanggil), bukan sekadar
> disembunyikan di UI. Belum diimplementasikan: pembatasan Sales ke penawaran/proyek
> miliknya sendiri secara spesifik (lihat `docs/architecture.md`'s Dasbor writeup untuk
> alasannya).

> **Arus kas ≠ laba.** Ringkasan arus kas mengukur pergerakan kas; Laba-Rugi mengukur
> profitabilitas (akrual). Keduanya terpisah & tidak dicampur ([BR-14](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).

---

## 2. Functional Requirements

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-09.1 | **Ringkasan Keuangan Bulanan (Arus Kas)**: Total Pemasukan, Total Pengeluaran, Saldo Akhir (kumulatif), Saldo Per Bulan. | M |
| FR-09.2 | **Diagram lingkaran** distribusi pemasukan & pengeluaran per kategori. | M |
| FR-09.3 | **Tabel arus kas** dengan filter (rentang tanggal, kategori, urut). | M |
| FR-09.4 | **Ringkasan proyek**: jumlah per status, **piutang termin belum tertagih (berdasarkan jatuh tempo, termasuk terlambat)**, distribusi per area/jenis dokumen. | S |
| FR-09.5 | **Ringkasan pajak** (dari [EP-08](08-tax-center.md)): kewajiban belum disetor, jatuh tempo terdekat/terlambat, kredit PPh 23 terkumpul. | S |
| FR-09.6 | **Drilldown** dari baris/kategori/proyek ke detail transaksi/proyek/sumber pajak. | S |
| FR-09.7 | Konten & metrik **disaring per peran** ([RBAC](README.md#5-role--permission-matrix--global-rbac)), ditegakkan server-side. | M |
| FR-09.8 | **Laba-Rugi (akrual)** bertingkat: Pendapatan (jasa ex-PPN) − **HPP/Realisasi RAB** = Laba Kotor; − Beban Operasional = **Laba Operasional (sebelum pajak)**; − **PPh Badan** = **Laba Bersih (setelah pajak)**; + Margin Kotor/Bersih %. PPh 23 **bukan** pengurang pendapatan ([BR-14](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)). | M |
| FR-09.9 | **Profitabilitas Per-Proyek**: Nilai Kontrak, Pendapatan Diakui, RAB Rencana, Realisasi RAB, **Margin Rencana**, **Margin Aktual**, % anggaran terpakai, **kesehatan** (🟢/🟡/🔴 per ambang [EP-00](00-konfigurasi-sistem.md)). | M |
| FR-09.10 | **Proyeksi Arus Kas & Runway**: perkiraan kas masuk (termin jatuh tempo) vs kas keluar (penggajian + setoran pajak/BPJS) pada horizon (default 90 hari, dikonfigurasi); garis proyeksi + **runway (N bulan)**. | S |
| FR-09.11 | **Pusat Perhatian** terkonsolidasi: invoice jatuh tempo/terlambat, pajak/BPJS H-3/terlambat, **bukti potong PPh 23 belum diterima**, proyek over budget/margin rendah, milestone mundur, proyek mangkrak — tiap item bertaut ke sumber. | S |
| FR-09.12 | **Tren waktu** (MoM): garis Pendapatan / Laba / Kas antar bulan. | S |
| FR-09.13 | **Pusat Komando (Owner)** + **dasbor per-peran** (Keuangan/Sales/Tim Teknis/Viewer) sebagai subset engine yang sama; panel tanpa izin **tidak dirender**. | M |

---

## 3. Role / Permission Matrix

| Aksi | Admin | Keuangan | Sales | Tim Teknis | Viewer |
| --- | :-: | :-: | :-: | :-: | :-: |
| Dasbor | R | R | R (terbatas) | R (proyek) | R |
| `view_profit` (Laba-Rugi) | ✓ | ✓ | ✗ | ✗ | ✗ |
| `view_project_cost` (biaya/margin proyek) | ✓ | ✓ | ✗ | ✗ | ✗ |
| `view_forecast` (proyeksi & runway) | ✓ | ✓ | ✗ | ✗ | ✗ |
| `view_tax_detail` (posisi pajak rinci) | ✓ | ✓ | ✗ | ✗ | ✗ |

> Sales: ringkasan terbatas (penawaran/proyek miliknya, nilai kontrak). Tim Teknis: ringkasan
> proyek yang ditugaskan (tanpa keuangan). Keuangan/Admin: penuh. Hak akses baru di atas
> ditegakkan **server-side** ([GC-12](11-konvensi-global-nfr.md#5-keamanan--rbac-gc-12)).

---

## 4. User Stories + Acceptance Criteria

### US-09.1 — Lihat ringkasan keuangan bulanan
**As a** Keuangan, **I want** melihat metrik keuangan bulan berjalan, **so that** kondisi kas cepat
terbaca. · **Prioritas: M**

```gherkin
Scenario: Metrik bulan berjalan
  Given terdapat transaksi arus kas bulan ini
  When Keuangan membuka Dasbor
  Then menampilkan Total Pemasukan, Total Pengeluaran, Saldo Akhir (kumulatif), Saldo Per Bulan
  And diagram lingkaran distribusi per kategori
```

### US-09.2 — Filter & drilldown
**As a** pengguna, **I want** memfilter & menelusuri detail, **so that** saya memahami angka di balik
ringkasan. · **Prioritas: S**

```gherkin
Scenario: Drilldown kategori
  Given diagram menampilkan pengeluaran kategori "Penggajian"
  When pengguna mengklik kategori tersebut
  Then sistem menampilkan daftar transaksi terkait (drilldown)

Scenario: Filter periode
  When pengguna memilih rentang tanggal & kategori
  Then metrik & tabel diperbarui sesuai filter
```

### US-09.3 — Ringkasan proyek & piutang
**As an** Admin, **I want** melihat status proyek & piutang termin, **so that** operasional & penagihan
terpantau. · **Prioritas: S**

```gherkin
Scenario: Piutang berdasarkan jatuh tempo
  Given ada Invoice Termin "Belum Lunas"
  When Admin membuka ringkasan proyek
  Then piutang termin belum tertagih ditampilkan berdasarkan jatuh tempo
  And yang melewati jatuh tempo ditandai terlambat
```

### US-09.4 — Ringkasan pajak
**As a** Keuangan, **I want** melihat ringkasan kewajiban pajak, **so that** tidak ada yang terlewat.
· **Prioritas: S**

```gherkin
Scenario: Kewajiban & jatuh tempo
  When Keuangan membuka ringkasan pajak
  Then menampilkan kewajiban belum disetor, jatuh tempo terdekat/terlambat, kredit PPh 23 terkumpul
```

### US-09.5 — Tampilan menyesuaikan peran
**As the** sistem, **I want** menyaring konten per peran, **so that** pengguna hanya melihat yang
relevan & diizinkan. · **Prioritas: M**

```gherkin
Scenario: Tim Teknis melihat proyek saja
  Given pengguna peran "Tim Teknis"
  When ia membuka Dasbor
  Then ia melihat ringkasan proyek yang ditugaskan
  And tidak melihat metrik keuangan/pajak rinci

Scenario: Panel laba tidak dirender tanpa izin
  Given pengguna peran "Sales" tanpa hak `view_profit`
  When ia membuka Dasbor (dan/atau memanggil endpoint dasbor langsung)
  Then panel Laba-Rugi & Profitabilitas Per-Proyek tidak dikembalikan server (bukan sekadar disembunyikan UI)
```

### US-09.6 — Lihat Laba-Rugi (sebelum & sesudah pajak)
**As an** Owner/Keuangan, **I want** melihat Laba-Rugi akrual bertingkat, **so that** saya tahu
profitabilitas riil — bukan sekadar saldo kas. · **Prioritas: M**

```gherkin
Scenario: Waterfall laba periode berjalan
  Given ada invoice termin terbit & Realisasi RAB pada periode
  When Owner membuka Laba-Rugi
  Then sistem menampilkan Pendapatan (jasa ex-PPN) − HPP (Realisasi RAB) = Laba Kotor
  And − Beban Operasional = Laba Operasional (sebelum pajak)
  And − PPh Badan (estimasi) = Laba Bersih (setelah pajak)
  And Margin Kotor % & Margin Bersih % terhitung

Scenario: PPh 23 bukan pengurang pendapatan (akrual)
  Given invoice termin dengan PPh 23 dipotong klien
  When Laba-Rugi dihitung
  Then Pendapatan = nilai jasa penuh (ex-PPN), PPh 23 tidak mengurangi Pendapatan (BR-14)

Scenario: Item Non-Laba-Rugi dikecualikan
  Given entri arus kas kategori ber-Sifat Beban "Non-Laba-Rugi" (mis. setoran PPN, pokok pinjaman)
  When Laba-Rugi dihitung
  Then entri tersebut tidak masuk sebagai biaya/beban di Laba-Rugi
```

### US-09.7 — Profitabilitas per-proyek (rencana vs aktual)
**As an** Owner, **I want** membandingkan margin rencana vs aktual per proyek, **so that** proyek
rugi/over-budget cepat terlihat. · **Prioritas: M**

```gherkin
Scenario: Margin aktual & kesehatan
  Given proyek dengan RAB Rencana, Pendapatan Diakui, dan Realisasi RAB
  When Owner membuka Profitabilitas Per-Proyek
  Then Margin Aktual = Pendapatan Diakui − Realisasi RAB
  And kesehatan ditandai 🔴 bila Realisasi RAB > RAB Rencana

Scenario: Belum ada Realisasi RAB
  Given proyek tanpa Realisasi RAB tercatat
  Then ditampilkan Margin Rencana saja; Margin Aktual = "belum dicatat"; kesehatan abu-abu (bukan 🔴)
```

### US-09.8 — Proyeksi kas & runway
**As an** Owner/Keuangan, **I want** melihat proyeksi kas & runway, **so that** saya antisipasi
kekurangan kas akibat timing setoran pajak. · **Prioritas: S**

```gherkin
Scenario: Proyeksi horizon 90 hari
  Given termin jatuh tempo mendatang & kewajiban penggajian/pajak terjadwal
  When Owner membuka Proyeksi Arus Kas
  Then garis proyeksi kas per minggu ditampilkan untuk horizon terkonfigurasi
  And runway ditampilkan sebagai "N bulan" menutup penggajian + kewajiban tetap
```

### US-09.9 — Pusat Perhatian (action center)
**As an** Owner/Keuangan, **I want** satu daftar hal yang butuh tindakan, **so that** tidak ada
yang terlewat. · **Prioritas: S**

```gherkin
Scenario: Daftar terprioritas bertaut sumber
  When Owner membuka Pusat Perhatian
  Then ditampilkan invoice jatuh tempo/terlambat, pajak/BPJS H-3/terlambat,
       bukti potong PPh 23 belum diterima, proyek over budget, milestone mundur, proyek mangkrak
  And tiap item bertaut ke dokumen/sumbernya
```

---

## 5. Field Validation

Dasbor bersifat **read-only**; tidak ada input data yang divalidasi selain **parameter filter**:

| ID | Field | Tipe | Aturan | Pesan error |
| --- | --- | --- | --- | --- |
| VR-09.1 | Rentang tanggal filter | Tanggal | Mulai ≤ selesai | "Rentang tanggal tidak valid." |
| VR-09.2 | Kategori filter | Pilihan | Dari kategori yang ada | — |
| VR-09.3 | Periode Laba-Rugi | Pilihan/Tanggal | Bulan/kuartal/tahun/kustom; mulai ≤ selesai | "Periode tidak valid." |
| VR-09.4 | Horizon proyeksi | Integer hari | > 0 (default dari [EP-00](00-konfigurasi-sistem.md)) | "Horizon harus > 0 hari." |

---

## 6. State & Transition

Tidak ada — Dasbor menampilkan agregasi data dari modul lain secara real-time.

---

## 7. Edge Cases & Catatan Penting

- **Piutang berdasarkan jatuh tempo** (bukan tanggal invoice) & menyertakan **terlambat** ([EP-05](05-faktur-termin.md)).
- **Konsistensi angka** dengan sumber: Dasbor tidak menyimpan nilai sendiri — selalu agregasi dari [EP-07](07-arus-kas.md)/[EP-08](08-tax-center.md)/Realisasi RAB ([EP-04](04-manajemen-proyek.md)).
- **Penyaringan per peran** ditegakkan server-side ([GC-12](11-konvensi-global-nfr.md#5-keamanan--rbac-gc-12)); panel laba/biaya/proyeksi/pajak-rinci **tidak dirender** tanpa hak akses.
- **Saldo Akhir kumulatif** vs **Saldo Per Bulan** — bedakan dengan jelas di UI.
- **Arus kas ≠ laba** — Saldo Per Bulan (kas) tidak sama dengan Laba Bersih (akrual); jangan dicampur ([BR-14](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **PPh Badan = estimasi** — selalu beri label; bergantung metode/ambang di [EP-00](00-konfigurasi-sistem.md).
- **Belum ada Realisasi RAB** → tampilkan Margin Rencana saja (kesehatan abu-abu, bukan 🔴).
- **Periode dengan pendapatan tanpa biaya** → tandai agar margin tidak salah dibaca 100%.
- **Data kosong** (belum ada transaksi) harus menampilkan empty-state, bukan error.

---

## 8. Dependencies & Keterkaitan

- **Prasyarat (sumber data):** [EP-07](07-arus-kas.md), [EP-04](04-manajemen-proyek.md), [EP-05](05-faktur-termin.md), [EP-08](08-tax-center.md).
- **Diandalkan oleh:** —
