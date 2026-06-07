[← Daftar Isi](README.md)

---

## 12. Model Data & Relasi

```mermaid
erDiagram
    PERUSAHAAN ||--o{ PIC : memiliki
    PERUSAHAAN ||--o{ PENAWARAN : menerima
    PERUSAHAAN ||--o{ PROYEK : terkait
    KATALOG_LAYANAN ||--o{ PENAWARAN_ITEM : dipakai
    PENAWARAN ||--o{ PENAWARAN_ITEM : berisi
    PENAWARAN ||--o| PROYEK : "menjadi (Deal)"
    KATALOG_LAYANAN ||--o{ PROYEK_LAYANAN : dipakai
    PROYEK ||--o{ PROYEK_LAYANAN : memuat
    PROYEK ||--o{ MILESTONE : memiliki
    PROYEK ||--o{ KOMENTAR : memiliki
    PROYEK ||--o{ FAKTUR_INDUK : menagih
    FAKTUR_INDUK ||--o{ INVOICE_TERMIN : berisi
    MILESTONE ||--o| INVOICE_TERMIN : memicu
    KARYAWAN ||--o| AKUN_PENGGUNA : "punya login (1:1)"
    KARYAWAN ||--o{ PROYEK_ASSIGNEE : ditugaskan
    PROYEK ||--o{ PROYEK_ASSIGNEE : punya
    KARYAWAN ||--o{ PENGGAJIAN : menerima
    INVOICE_TERMIN ||--o{ ARUS_KAS : "Lunas -> jasa/PPN/PPh"
    PENGGAJIAN ||--o| ARUS_KAS : "Dibayar -> Debit"
    KATEGORI ||--o{ ARUS_KAS : mengklasifikasi
    PROYEK ||--o{ REALISASI_RAB : "biaya aktual (HPP)"
    ARUS_KAS ||--o| REALISASI_RAB : "opsional menautkan"
```

> **Catatan profitabilitas & Laba-Rugi Dasbor:**
> - **REALISASI_RAB** (`proyek`, `kategori_rab` A/B, `nilai`, `tanggal`, `catatan`,
>   opsional `arus_kas_id`) = sumber **HPP/biaya proyek aktual** → Margin Aktual ([Bab 6.8](06-manajemen-proyek.md#68-realisasi-rab--profitabilitas-proyek)).
> - **KATEGORI** memiliki atribut **`sifat_beban`** (HPP / Operasional / Non-Laba-Rugi) untuk
>   penyusunan Laba-Rugi ([Bab 7.2](07-arus-kas.md#72-struktur-tabel)).
> - **Pengaturan pajak** menyimpan **PPh Badan** (`metode` Final/Badan, `tarif`, `ambang_omzet`)
>   untuk Laba Bersih ([Bab 10.8](10-penanganan-pajak.md#108-pph-badan-pajak-penghasilan-badan)), serta parameter dasbor
>   (ambang margin, horizon proyeksi, ambang mangkrak — [Bab 9.5](09-konfigurasi.md#95-tarif--penomoran)).
> - Dasbor **tidak menambah tabel agregat** — Laba-Rugi, proyeksi, & Pusat Perhatian dihitung
>   real-time dari entitas di atas.

---
