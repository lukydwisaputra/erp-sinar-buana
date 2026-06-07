[← Daftar Isi](README.md)

---

## 0. Ringkasan Eksekutif

### 0.1 Profil & Konteks
PT Sinar Buana Mandiri Jaya (SBMJ) adalah **konsultan lingkungan** yang mengurus dokumen
perizinan lingkungan untuk perusahaan klien — antara lain Rincian Teknis (Rintek) LB3,
Persetujuan Teknis (Pertek) Air Limbah, Pertek Emisi, Dokumen Lingkungan (UKL-UPL, SPPL,
Amdal, RKL-RPL Rinci), Andalalin, Sertifikat Laik Operasi (SLO), serta **Laporan Semester**
yang berulang. Klien tersebar di berbagai kota/kabupaten dan kawasan industri.

### 0.2 Masalah Saat Ini
Seluruh alur kerja berjalan **manual** melalui spreadsheet dan dokumen Word/PDF terpisah:
katalog layanan, tracker proyek, surat penawaran (SPH) + RAB + jadwal, invoice termin, dan
slip gaji. Akibatnya: data terpencar, sulit melacak progres proyek & penagihan termin, tidak
ada keterkaitan otomatis antara penagihan dan arus kas, serta rawan salah hitung pajak.

### 0.3 Tujuan Produk
Membangun **satu sistem ERP web** yang:
- Mendigitalkan alur kerja yang sudah berjalan (penawaran → proyek → faktur termin →
  arus kas; penggajian → arus kas).
- Memberi visibilitas progres proyek bergaya **ClickUp** (assignee + komentar ber-timeline).
- Mengotomasi pencatatan keuangan & perhitungan pajak.
- **Dapat dikonfigurasi sendiri oleh klien** sehingga skalabel mengikuti pertumbuhan bisnis.

### 0.4 Ruang Lingkup
**Cakupan sistem (dibangun dalam satu fase):** Autentikasi, peran & akun pengguna, Master Data (Perusahaan,
Katalog Layanan, Karyawan, Profil Perusahaan), Penawaran, Faktur (Induk & Termin),
Penggajian, Manajemen Proyek penuh, Arus Kas + otomasi, **Modul Perpajakan (Tax Center)**,
Dasbor **(Pusat Komando: Laba-Rugi akrual, profitabilitas per-proyek, proyeksi kas & runway,
Pusat Perhatian)**, Konfigurasi terkelola, RAB & margin **(rencana vs Realisasi RAB)**, pemicu
faktur dari milestone, pengingat Laporan Semester, penomoran & terbilang otomatis.

**Keputusan operasional (final):** pengiriman dokumen via **WhatsApp** (`wa.me` + lampir PDF
manual) **dan Email otomatis** (PDF terlampir, perlu akun email/SMTP); PPh 21 input manual
(0 valid); penomoran reset bulanan & nomor tetap saat diedit; penghapusan data secara soft
delete + arsip. Rincian di [Bab 14](14-keputusan-final.md#14-keputusan-final-sebelumnya-terbuka).

### 0.5 Prinsip Desain Utama — *Configurable & Scalable*
Nilai yang dapat bertumbuh seiring bisnis **tidak di-hardcode**. Daftar pilihan, status
workflow, template, dan tarif dikelola sendiri oleh klien melalui [Modul Konfigurasi](09-konfigurasi.md#9-modul-konfigurasi--master-data-terkelola).
Data dari dokumen yang ada (12 langkah jadwal, status tracker, tarif pajak) dipakai sebagai
**nilai default**, bukan daftar permanen. Lihat detail di Bab 9.

### 0.6 Glosarium
| Istilah | Arti |
| --- | --- |
| **Rintek LB3** | Rincian Teknis Penyimpanan Sementara Limbah B3 |
| **Pertek** | Persetujuan Teknis (Air Limbah / Emisi) |
| **UKL-UPL / SPPL** | Dokumen lingkungan sesuai skala usaha |
| **RKL-RPL Rinci** | Dokumen lingkungan untuk kawasan industri |
| **Andalalin** | Analisis Dampak Lalu Lintas |
| **SLO** | Sertifikat Laik Operasi |
| **SPH** | Surat Penawaran Harga |
| **RAB** | Rincian Anggaran Biaya (internal) — rencana biaya proyek |
| **Realisasi RAB** | Biaya **aktual** proyek (Personil A + Langsung B) dicatat per proyek = HPP/biaya proyek |
| **Margin Rencana / Margin Aktual** | Nilai Kontrak − RAB rencana / Pendapatan Diakui − Realisasi RAB |
| **Laba Kotor / Operasional / Bersih** | Pendapatan − HPP / − Beban Operasional (sebelum pajak) / − PPh Badan (setelah pajak) |
| **HPP** | Harga Pokok / biaya langsung pelaksanaan proyek (= Realisasi RAB) |
| **Sifat Beban** | Klasifikasi kategori arus kas untuk Laba-Rugi: HPP / Operasional / Non-Laba-Rugi |
| **DPP** | Dasar Pengenaan Pajak |
| **PPN / PPh 23 / PPh 21** | Pajak Pertambahan Nilai / PPh atas jasa (dipotong klien) / PPh atas gaji |
| **PPh Badan** | Pajak penghasilan **perusahaan** (Final 0,5% omzet / 22% laba) — dasar Laba Bersih setelah pajak |
| **Runway** | Berapa bulan kas saat ini menutup penggajian + kewajiban tetap |
| **PKP** | Pengusaha Kena Pajak — wajib memungut PPN |
| **NTPN** | Nomor Transaksi Penerimaan Negara — bukti pembayaran pajak |
| **Bukti Potong** | Bukti pemotongan PPh 23 dari klien (dasar klaim kredit pajak) |
| **Masa Pajak** | Periode pajak (umumnya bulanan) |
| **Termin** | Tahap pembayaran (cicilan) di bawah satu Faktur Induk |
| **PIC** | Person In Charge (narahubung perusahaan klien) |
| **Total Penawaran / Nilai Kontrak** | **Sinonim** — nilai total proyek dari SPH yang berstatus Deal |
| **Faktur Induk (Master Invoice)** | Pengelompok penagihan di dalam satu proyek; memuat Total Biaya & skema termin. Satu proyek dapat punya beberapa Faktur Induk |
| **Total Biaya** | Nilai yang ditagih oleh **satu Faktur Induk** (bisa = sebagian/seluruh Nilai Kontrak) |
| **Invoice Termin** | Tagihan per tahap di bawah satu Faktur Induk |

---
