[← Daftar Isi](README.md)

---

## 1. Ringkasan Produk

- **Sistem ERP internal berbasis web** untuk operasional & keuangan harian konsultan lingkungan.
- **Pengguna target:** tim internal — Owner/Direktur, Keuangan, Marketing/Sales, dan Tim
  Teknis/Penyusun (Ketua Tim, Anggota, Document Controller).
- **Platform:** aplikasi web (browser), responsif desktop & tablet.
- **Bahasa:** Bahasa Indonesia. **Mata uang:** IDR (format `Rp 1.000.000`, tanpa desimal).
- **Cakupan modul:** Master Data, Penawaran, Faktur, Penggajian, Manajemen Proyek, Arus Kas,
  Dasbor, dan Konfigurasi.

### 1.1 Peta Modul & Keterkaitan

```mermaid
flowchart LR
    subgraph Master["Master Data"]
        PRSH[Perusahaan + PIC]
        KAT[Katalog Layanan]
        KRY[Data Karyawan]
        PROF[Profil & Pengaturan]
    end
    PNW[Penawaran / SPH]
    PRJ[Manajemen Proyek]
    FKT[Faktur Induk + Invoice Termin]
    GAJI[Penggajian]
    KAS[Arus Kas]
    DASH[Dasbor]

    PRSH --> PNW
    KAT --> PNW
    PNW -- Deal --> PRJ
    PRJ -- buat induk / milestone --> FKT
    FKT -- Termin Lunas --> KAS
    KRY --> GAJI
    KRY -- assignee --> PRJ
    GAJI -- Dibayar --> KAS
    FKT -- PPN/PPh --> PJK[Tax Center]
    GAJI -- PPh21/BPJS --> PJK
    PJK -- setor --> KAS
    KAS --> DASH
    PRJ --> DASH
    PJK --> DASH
    PROF -.template & tarif.-> FKT
    PROF -.template & tarif.-> PNW
    PROF -.template.-> GAJI
```

---
