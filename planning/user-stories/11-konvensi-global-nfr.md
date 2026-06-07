[← Daftar Isi](README.md)

---

# Konvensi Global & Persyaratan Non-Functional (Appendix)

> Acuan yang **berlaku lintas-epic**. Aturan di sini tidak diulang penuh di tiap epic — epic
> hanya merujuk ke sini. Sumber: [PRD Bab 13](../prd/13-non-fungsional.md) & [Bab 14](../prd/14-keputusan-final.md).

---

## 1. Konvensi Format & Input Global

| Kode | Aturan | Detail | Pesan error |
| --- | --- | --- | --- |
| **GC-1** | Mata uang IDR | Tampil `Rp 1.000.000` (pemisah ribuan titik, **tanpa desimal**). Input menerima angka; render diformat. | "Nilai harus berupa angka." |
| **GC-2** | Validasi NPWP | Maks **16 digit**, numerik. | "NPWP maksimal 16 digit angka." |
| **GC-3** | Field wajib | Field bertanda wajib tidak boleh kosong sebelum simpan. | "Field ini wajib diisi." |
| **GC-4** | Email | Format email valid bila diisi. | "Format email tidak valid." |
| **GC-5** | Nomor HP/telepon | Numerik (boleh `+`, spasi, `-`). | "Nomor telepon tidak valid." |
| **GC-6** | Terbilang otomatis | Nilai uang pada dokumen menghasilkan teks terbilang Bahasa Indonesia (mis. "Seratus Dua Puluh Lima Juta Rupiah"). | — |
| **GC-7** | Bahasa & locale | Seluruh UI Bahasa Indonesia; tanggal format `dd MMM yyyy` (mis. `06 Jun 2026`). | — |
| **GC-8** | Pembulatan pajak | DPP & nilai pajak dibulatkan ke **rupiah terdekat** (*round half up*). | — |

---

## 2. Penghapusan Data — Soft Delete + Arsip (GC-9)

**FR-G.1** Sistem **tidak pernah menghapus data secara permanen**; penghapusan = menandai
terhapus/arsip, **dapat dipulihkan**, jejak audit tetap tersimpan. Krusial untuk dokumen keuangan.

```gherkin
Scenario: Hapus data keuangan
  Given pengguna berhak menghapus sebuah Invoice
  When pengguna menekan "Hapus"
  Then sistem menandai record sebagai terarsip (soft delete)
  And record hilang dari daftar aktif default
  And record tetap dapat ditemukan via filter "Arsip" dan dapat dipulihkan
  And jejak audit (siapa & kapan menghapus) tersimpan
```

---

## 3. Audit Log (GC-10)

**FR-G.2** Sistem mencatat **siapa membuat/mengubah/menghapus** data **dan kapan**, terutama untuk
**Faktur, Penggajian, status Proyek, Konfigurasi, Akun Pengguna, entri Pajak**.

```gherkin
Scenario: Perubahan ter-audit
  Given seorang pengguna mengubah status proyek dari "Drafting" ke "Selesai"
  When perubahan disimpan
  Then sistem mencatat entri audit: aktor, aksi, nilai lama -> nilai baru, timestamp
  And entri audit tidak dapat diedit pengguna
```

---

## 4. Notifikasi & Pengingat (GC-11)

**FR-G.3** Sistem mengirim notifikasi **in-app + email** untuk:
- **Jatuh tempo pajak** — pengingat **H-3** sebelum jatuh tempo (lihat [EP-08](08-tax-center.md)).
- **Mention** `@karyawan` di komentar proyek (lihat [EP-04](04-manajemen-proyek.md)).
- **Dokumen jatuh tempo** — invoice termin mendekati/melewati jatuh tempo (lihat [EP-05](05-faktur-termin.md)).
- **Pusat Perhatian Dasbor** — proyek **over budget**/margin rendah, milestone **mundur**, proyek **mangkrak**, **bukti potong PPh 23 belum diterima** (lihat [EP-09](09-dasbor.md)).

---

## 5. Keamanan & RBAC (GC-12)

**FR-G.4** RBAC ditegakkan **di server-side** pada setiap endpoint, bukan sekadar menyembunyikan
menu. Matriks lengkap di [README §5](README.md#5-role--permission-matrix--global-rbac).

**FR-G.5** **Slip gaji rahasia** — hanya karyawan pemilik + Keuangan/Admin yang dapat melihat/unduh
(lihat [EP-06](06-penggajian.md)).

```gherkin
Scenario: Akses ditolak server-side
  Given pengguna peran "Sales" tidak punya akses modul Penggajian
  When ia memanggil endpoint penggajian secara langsung (mis. via URL/API)
  Then server menolak dengan 403 Forbidden
  And tidak ada data penggajian yang dikembalikan
```

---

## 6. Ekspor Data (GC-13)

**FR-G.6** Ekspor **Excel/CSV** tersedia untuk tabel utama: Penawaran, Faktur, Penggajian,
Arus Kas, Proyek, Perpajakan.

```gherkin
Scenario: Ekspor tabel
  Given pengguna berhak Export pada modul Arus Kas
  When pengguna menekan "Export" dengan filter aktif (rentang tanggal + kategori)
  Then sistem menghasilkan file Excel/CSV berisi data sesuai filter
```

---

## 7. Platform & Performa (GC-14)

- **Web responsif** untuk **desktop & tablet**.
- **Konsistensi terminologi:** Pemasukan = **Kredit**, Pengeluaran = **Debit** di seluruh sistem.
- **Backup:** pencadangan basis data berkala.

---

## 8. Daftar Aturan Bisnis "Tidak Boleh Dilanggar" (Highlight Lintas-Epic)

Detail yang **wajib** diperhatikan Designer/Developer/QA; sering jadi sumber bug bila terlewat:

| # | Aturan | Epic terkait |
| --- | --- | --- |
| **BR-1** | **Penomoran dokumen tetap** — No SPH/INV diberikan sekali saat dibuat dan **TIDAK berubah saat dokumen diedit**. | [EP-00](00-konfigurasi-sistem.md), [EP-03](03-penawaran-sph.md), [EP-05](05-faktur-termin.md) |
| **BR-2** | **Counter penomoran reset tiap bulan** & **terpisah** untuk SPH vs INV. | [EP-00](00-konfigurasi-sistem.md) |
| **BR-3** | **PPh 21 input manual & boleh 0** (tetap valid, mis. gaji di bawah PTKP). | [EP-06](06-penggajian.md), [EP-08](08-tax-center.md) |
| **BR-4** | **DPP = nilai × 11/12**; **PPN = 12% × DPP**; **PPh 23 = 2% × nilai (dipotong)**; Total Setelah Pajak = Nilai + PPN − PPh 23. | [EP-05](05-faktur-termin.md), [EP-08](08-tax-center.md) |
| **BR-5** | **Non-PKP → PPN tidak dipungut** (PPN Keluaran tidak dibuat). | [EP-05](05-faktur-termin.md), [EP-08](08-tax-center.md) |
| **BR-6** | **Entri Arus Kas otomatis terkunci** dari edit/hapus manual & mengikuti status sumber. | [EP-07](07-arus-kas.md) |
| **BR-7** | **4 kategori Arus Kas terkunci** (Faktur, Penggajian, Pajak, Bonus) karena dipakai otomasi. | [EP-07](07-arus-kas.md), [EP-00](00-konfigurasi-sistem.md) |
| **BR-8** | **Total seluruh termin tidak boleh melebihi Total Biaya** Faktur Induk. | [EP-05](05-faktur-termin.md) |
| **BR-9** | **Slip gaji rahasia** — final & dikirim hanya setelah status "Sudah Dibayar". | [EP-06](06-penggajian.md) |
| **BR-10** | **PPN titipan, PPh 23 kredit** — keduanya **bukan** pendapatan; PPN disetor saat penyetoran, PPh 23 jadi kredit pajak. | [EP-07](07-arus-kas.md), [EP-08](08-tax-center.md) |
| **BR-11** | **Estimasi Jadwal (fase SPH) mengalir otomatis** menjadi milestone & Gantt proyek (tanpa input ulang). | [EP-03](03-penawaran-sph.md), [EP-04](04-manajemen-proyek.md) |
| **BR-12** | **Workflow status dipetakan ke peran sistem** (`SELESAI/LUNAS/DIBAYAR/BATAL`) agar otomasi tetap valid saat label diubah. | [EP-00](00-konfigurasi-sistem.md) |
| **BR-13** | **Soft delete + arsip** untuk semua data (tidak ada hard delete). | semua |
| **BR-14** | **Laba-Rugi pakai basis akrual & terpisah dari arus kas.** Pendapatan = **nilai jasa penuh ex-PPN** (diakui saat invoice terbit); **PPh 23 BUKAN pengurang pendapatan** (kredit/aset). Item **Non-Laba-Rugi** (setoran PPN titipan, PPh 23, pokok pinjaman) dikecualikan dari laba. Arus kas (cash basis) tidak boleh dicampur dengan laba. | [EP-07](07-arus-kas.md), [EP-08](08-tax-center.md), [EP-09](09-dasbor.md) |
| **BR-15** | **Realisasi RAB = satu-satunya sumber biaya proyek aktual (HPP)**; Margin Aktual = Pendapatan Diakui − Realisasi RAB. Belum ada realisasi → tampilkan Margin Rencana saja (kesehatan abu-abu, bukan 🔴). | [EP-04](04-manajemen-proyek.md), [EP-09](09-dasbor.md) |
| **BR-16** | **Laba/biaya/proyeksi/pajak rinci dasbor** (`view_profit`, `view_project_cost`, `view_forecast`, `view_tax_detail`) hanya Admin & Keuangan; panel tanpa izin **tidak dirender** (server-side). | [EP-09](09-dasbor.md) |

---

## 9. Keputusan Final (Referensi)

Item yang telah dikonfirmasi klien (sumber [PRD Bab 14](../prd/14-keputusan-final.md)):

1. **Pengiriman dokumen:** WhatsApp (`wa.me` + lampir PDF manual) **dan** Email otomatis (PDF terlampir, perlu SMTP).
2. **PPh 21:** input manual, nilai 0 valid.
3. **Penomoran:** counter terpisah, reset bulanan, nomor tetap saat diedit.
4. **Penghapusan:** soft delete + arsip.
5. **Pajak default:** PPN 12% via DPP 11/12 & PPh 23 2%; dapat diubah di Konfigurasi.

---

## Dependencies
Appendix ini dirujuk oleh **seluruh epic**. Tidak ada prasyarat.
