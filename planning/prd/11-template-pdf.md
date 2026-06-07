[← Daftar Isi](README.md)

---

## 11. Spesifikasi Template PDF

Semua template memakai **header** (logo + identitas PT) dan **footer** (kontak: telp, email,
website, alamat) dari Profil Perusahaan, serta blok **penandatangan** (mis. Direktur).

| Template | Elemen utama |
| --- | --- |
| **SPH (Penawaran)** | No SPH, tanggal, perihal, tujuan (Perusahaan+PIC), tabel layanan (Uraian/Harga Satuan/Vol/Total), Total Biaya, **Terbilang**, catatan (masa berlaku, skema termin), TTD |
| **RAB (internal)** | Rincian Biaya Personil (A), Biaya Langsung (B), Total Biaya; tidak dikirim ke klien |
| **Estimasi Jadwal** | Tabel kegiatan × minggu (**jumlah bulan dapat diatur**), penanda minggu per kegiatan (lihat [Bab 11.1](#111-detail-template-estimasi-jadwal-rencana-kegiatan)) |
| **Invoice Termin** | No Inv, tanggal, **jatuh tempo pembayaran**, label termin, tujuan, tabel uraian, Total Biaya, **pengurang seluruh termin sebelumnya**, DPP/PPN/PPh, Total Setelah Pajak, **rekening bank terpilih**, "berlaku sebagai kwitansi", TTD |
| **Slip Gaji** | Nama, Periode, Posisi, Status, komponen pendapatan (Gaji Pokok×pengali, tunjangan, lembur), Jumlah Gaji, catatan rahasia |

> Semua template **dapat dikustomisasi & diduplikasi** via [Bab 9.4](09-konfigurasi.md#94-template).

### 11.1 Detail Template: Estimasi Jadwal Rencana Kegiatan

Tabel matriks **kegiatan (baris) × minggu (kolom)**, dikelompokkan per bulan. Mengikuti
format nyata (file PT MAB / Rintek) namun **fleksibel**.

**Struktur kolom**
| Kolom | Keterangan |
| --- | --- |
| No | Nomor urut kegiatan |
| Kegiatan | Nama langkah (default dari template milestone layanan, dapat diedit) |
| Bulan ke-_n_ → Minggu 1..4 | Grup kolom per bulan; tiap bulan berisi kolom minggu |

**Aturan fleksibilitas (dapat diatur klien)**
- **Jumlah bulan tidak dikunci** — tambah/kurangi bulan sesuai durasi proyek (mis. 1, 3, 6 bulan).
- **Jumlah minggu per bulan** default 4, dapat disesuaikan.
- **Tambah/ubah/hapus/urut baris kegiatan**.
- **Penanda sel:** tiap sel minggu dapat **di-toggle** untuk menandai bahwa kegiatan pada
  baris itu berlangsung di minggu tersebut. Sel yang ditandai **disorot kuning** (di UI &
  PDF). Satu kegiatan dapat menandai beberapa minggu berurutan (rentang) atau terpisah.
- *(Di modul Proyek/[Bab 6.3](06-manajemen-proyek.md#63-timeline--gantt))* grid yang sama menyimpan **rencana vs
  aktual** — penanda kuning = rencana, dan realisasi diperbarui tim.

**Contoh layout** — legenda: `█` = minggu ditandai (kuning), kosong = tidak.

| No | Kegiatan | B1·1 | B1·2 | B1·3 | B1·4 | B2·1 | B2·2 | B2·3 | B2·4 | B3·1 | B3·2 | B3·3 | B3·4 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Survey Lokasi | █ | | | | | | | | | | | |
| 2 | Pengumpulan Data & Berkas | | █ | | | | | | | | | | |
| 3 | Penyusunan Dokumen | | | █ | █ | | | | | | | | |
| 4 | Rapat Internal Awal | | | | | █ | | | | | | | |
| 5 | Penyelesaian Draft & Gambar | | | | | | █ | | | | | | |
| 6 | Asistensi dengan Pihak LH | | | | | | | █ | █ | | | | |
| 7 | Revisi Dokumen | | | | | | | | | █ | | | |
| 8 | Finalisasi Dokumen | | | | | | | | | █ | | | |
| 9 | Pengumpulan Dokumen Final ke LH | | | | | | | | | █ | | | |
| 10 | Pembahasan dengan LH | | | | | | | | | | █ | | |
| 11 | Revisi Akhir | | | | | | | | | | | █ | |
| 12 | Penerbitan Dokumen | | | | | | | | | | | | █ |

> Header `B{bulan}·{minggu}` hanya untuk keringkasan dokumen ini; di aplikasi ditampilkan
> sebagai grup **"BULAN-1 / MINGGU 1 2 3 4"** seperti format asli.

### 11.2 Aksi Dokumen (berlaku untuk semua dokumen)

Setiap dokumen yang dihasilkan sistem memiliki **set aksi standar** yang konsisten:

| Aksi | Keterangan |
| --- | --- |
| **Draf** | Simpan sebagai draf (belum final); dapat dilanjutkan/diubah kapan saja. |
| **Pratinjau (Preview)** | Lihat hasil PDF sebelum finalisasi/kirim. |
| **Edit** | Ubah isi via form/inline. Nomor dokumen (SPH/INV) **tetap** saat diedit ([Bab 9.5](09-konfigurasi.md#95-tarif--penomoran)). |
| **Unduh (Download)** | Unduh PDF ke perangkat. |
| **Kirim WhatsApp** | Buka tautan `wa.me` ke nomor tujuan dengan pesan template terisi; **lampir PDF manual**. |
| **Kirim Email (otomatis)** | Sistem mengirim email **otomatis** ke alamat tujuan dengan **PDF terlampir** + isi email dari template. Perlu akun email pengirim ([Bab 9.5](09-konfigurasi.md#95-tarif--penomoran)). |

**Matriks per dokumen** (✓ tersedia · ✗ tidak)

| Dokumen | Draf | Preview | Edit | Unduh | WA | Email | Tujuan |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| SPH (Penawaran) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PIC / email perusahaan |
| Estimasi Jadwal | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ikut paket SPH |
| RAB (internal) | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | **internal — tidak dikirim ke klien** |
| Invoice Termin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | PIC / email perusahaan |
| Slip Gaji | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **karyawan ybs (rahasia)** |

> WhatsApp = tautan `wa.me` + lampir PDF manual (tanpa biaya gateway). Email = terkirim
> **otomatis** dengan lampiran. **RAB bersifat internal** sehingga tanpa opsi kirim ke klien.

---
