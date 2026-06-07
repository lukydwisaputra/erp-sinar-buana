[← Daftar Isi](README.md)

---

## 13. Persyaratan Non-Fungsional

- **Platform:** web responsif (desktop & tablet), Bahasa Indonesia.
- **Format & validasi:** IDR tanpa desimal; validasi NPWP (≤16 digit, numerik); validasi
  field wajib.
- **Audit log:** mencatat siapa membuat/mengubah/menghapus data & kapan (terutama Faktur,
  Penggajian, status Proyek, Konfigurasi).
- **Penghapusan data — soft delete + arsip:** data tidak dihapus permanen, melainkan
  ditandai terhapus/diarsipkan, **dapat dipulihkan**, dan jejak audit tetap tersimpan
  (penting untuk dokumen keuangan).
- **Notifikasi & pengingat:** in-app + email untuk **jatuh tempo pajak (H-3)**, mention di
  proyek, dokumen jatuh tempo, dan **Pusat Perhatian Dasbor** (proyek over budget, milestone
  mundur, proyek mangkrak, bukti potong PPh 23 belum diterima).
- **Keamanan & kerahasiaan:** RBAC ditegakkan di server; **slip gaji rahasia**.
- **Ekspor:** Excel/CSV untuk tabel utama (Penawaran, Faktur, Penggajian, Arus Kas, Proyek,
  Perpajakan).
- **Konsistensi:** terminologi Pemasukan=Kredit, Pengeluaran=Debit di seluruh sistem.
- **Backup:** pencadangan berkala basis data.

---
