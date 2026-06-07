[← Daftar Isi](README.md)

---

# EP-07 — Arus Kas (Cashflow)

> **Sumber PRD:** [Bab 7](../prd/07-arus-kas.md) · **Aktor utama:** Keuangan
> **Dependencies:** [EP-00](00-konfigurasi-sistem.md) (kategori), [EP-05 Faktur](05-faktur-termin.md), [EP-06 Penggajian](06-penggajian.md), [EP-08 Tax Center](08-tax-center.md)
> **Diturunkan ke:** [EP-09 Dasbor](09-dasbor.md)

---

## 1. Tujuan & Konteks

Buku kas terpusat: **Pemasukan (Kredit)** & **Pengeluaran (Debit)**. Entri dapat **manual** atau
**otomatis** dari modul lain. Prinsip kunci: tiap entri otomatis **memisahkan jasa dari komponen
lain** (pajak, bonus) agar arus kas mencerminkan nilai usaha & kewajiban secara terpisah.

---

## 2. Functional Requirements

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-07.1 | Catat **Pemasukan (Kredit)** & **Pengeluaran (Debit)** manual: jenis, tanggal, total, kategori, sumber. | M |
| FR-07.2 | Filter rentang tanggal, kategori, pengurutan kolom; **ekspor Excel/CSV** ([GC-13](11-konvensi-global-nfr.md#6-ekspor-data-gc-13)). | M |
| FR-07.3 | **Otomasi Invoice Termin Lunas** → 3 entri terpisah: (1) pendapatan jasa (Kredit, kat. Faktur); (2) PPN Keluaran (Kredit, kat. Pajak); (3) PPh 23 dipotong (pengurang, kat. Pajak). | M |
| FR-07.4 | **Otomasi Penggajian Dibayar** → Pengeluaran (Debit) = gaji bersih/take-home (kat. Penggajian); bonus opsional (kat. Bonus). | M |
| FR-07.5 | **Otomasi Setor Pajak/BPJS** (saat ditandai "Sudah Disetor" di [EP-08](08-tax-center.md)) → Pengeluaran (Debit) kat. Pajak/BPJS. | M |
| FR-07.6 | **Entri otomatis terkunci** dari edit/hapus manual & **mengikuti status sumber** ([BR-6](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)). | M |
| FR-07.7 | **4 kategori terkunci** (Faktur, Penggajian, Pajak, Bonus); kategori kustom dari [EP-00](00-konfigurasi-sistem.md). | M |
| FR-07.8 | Konsistensi terminologi **Pemasukan=Kredit, Pengeluaran=Debit** ([GC-14](11-konvensi-global-nfr.md#7-platform--performa-gc-14)). | M |
| FR-07.9 | Tiap kategori memiliki **Sifat Beban** (HPP / Operasional / Non-Laba-Rugi) dari [EP-00](00-konfigurasi-sistem.md) — dipakai Dasbor untuk Laba-Rugi; item Non-Laba-Rugi dikecualikan dari laba ([BR-14](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)). | M |
| FR-07.10 | Pengeluaran manual dapat **ditautkan ke Proyek** sebagai **Realisasi RAB** (biaya aktual) untuk profitabilitas per-proyek ([EP-04](04-manajemen-proyek.md)). | S |

---

## 3. Role / Permission Matrix

| Aksi | Admin | Keuangan | Sales | Tim Teknis | Viewer |
| --- | :-: | :-: | :-: | :-: | :-: |
| Arus Kas | CRUDE | CRUDE | – | – | R |

> Catatan: entri **otomatis** terkunci untuk semua peran (termasuk Admin) — hanya berubah lewat status sumbernya.

---

## 4. User Stories + Acceptance Criteria

### US-07.1 — Catat transaksi manual
**As a** Keuangan, **I want** mencatat transaksi manual, **so that** biaya operasional & lainnya
terpantau. · **Prioritas: M**

```gherkin
Scenario: Tambah pengeluaran operasional
  Given Keuangan membuka Arus Kas > Tambah
  When memilih Jenis "Pengeluaran (Debit)", kategori "Biaya Operasional", mengisi tanggal & nominal,
       lalu menyimpan
  Then entri tercatat di buku arus kas dengan sumber "Manual"
```

### US-07.2 — Entri otomatis dari Invoice Lunas (3 entri terpisah)
**As the** sistem, **I want** membuat 3 entri terpisah saat invoice lunas, **so that** jasa & pajak
tidak tercampur. · **Prioritas: M**

```gherkin
Scenario: Invoice termin lunas Rp 25.000.000 (PKP)
  Given Invoice Termin Rp 25.000.000 ditandai "Lunas" (EP-05)
  Then Arus Kas otomatis membuat:
    | Pendapatan jasa       | Kredit | kat. Faktur |  +25.000.000 |
    | PPN Keluaran (titipan)| Kredit | kat. Pajak  |   +2.750.000 |
    | PPh 23 dipotong       | pengurang | kat. Pajak |    -500.000 |
  And ketiga entri bertanda sumber "Otomatis (Faktur)" & terkunci
```

### US-07.3 — Entri otomatis dari Penggajian Dibayar
**As the** sistem, **I want** mencatat take-home saat gaji dibayar, **so that** kas keluar akurat.
· **Prioritas: M**

```gherkin
Scenario: Gaji dibayar
  Given penggajian "Sudah Dibayar" take-home Rp 2.920.000 (EP-06)
  Then Arus Kas membuat Pengeluaran (Debit) Rp 2.920.000 kategori Penggajian, sumber Otomatis
  And PPh 21/BPJS TIDAK dicatat keluar saat ini (BR-10)
```

### US-07.4 — Entri otomatis dari penyetoran pajak/BPJS
**As the** sistem, **I want** mencatat kas keluar saat pajak/BPJS disetor, **so that** timing kas riil.
· **Prioritas: M**

```gherkin
Scenario: Setor PPN
  Given entri PPN ditandai "Sudah Disetor" di Tax Center (EP-08)
  Then Arus Kas membuat Pengeluaran (Debit) kategori Pajak sebesar nilai setor
  And PPh 23 (kredit) TIDAK memicu kas keluar
```

### US-07.5 — Entri otomatis mengikuti status sumber
**As the** sistem, **I want** entri otomatis selalu sinkron dengan sumbernya, **so that** kas tidak
salah saat sumber berubah. · **Prioritas: M**

```gherkin
Scenario: Pembatalan faktur membatalkan entri
  Given entri otomatis berasal dari Invoice yang kemudian dibatalkan
  When Invoice berstatus "Batal" (EP-05)
  Then entri Arus Kas terkait ikut dibatalkan otomatis

Scenario: Cegah edit manual entri otomatis
  When pengguna mencoba mengedit/menghapus entri bersumber Otomatis
  Then sistem menolak ("Entri otomatis terkunci - ubah melalui dokumen sumber")
```

---

## 5. Field Validation

| ID | Field | Tipe | Wajib | Aturan | Pesan error |
| --- | --- | --- | --- | --- | --- |
| VR-07.1 | Jenis (C/D) | Pilihan | Ya | Pemasukan–Kredit / Pengeluaran–Debit | "Jenis wajib dipilih." |
| VR-07.2 | Tanggal | Tanggal | Ya | — | "Tanggal wajib diisi." |
| VR-07.3 | Total | IDR | Ya | > 0 | "Total harus > 0." |
| VR-07.4 | Kategori | Pilihan | Ya | Terkunci (4) atau kustom (EP-00); membawa **Sifat Beban** | "Kategori wajib dipilih." |
| VR-07.5 | Sumber | Auto | Ya (sistem) | Manual / Otomatis (Faktur/Penggajian/Pajak) | — |
| VR-07.6 | Entri otomatis | — | — | **Read-only** bagi pengguna | "Entri otomatis terkunci." |
| VR-07.7 | Proyek (Realisasi RAB) | Relasi | Tidak | Bila diisi, proyek aktif; lazimnya kategori ber-Sifat Beban HPP | — |

---

## 6. State & Transition

Entri manual: dapat dibuat/diedit/dihapus (soft delete). Entri otomatis: **terikat status sumber**.

| Status sumber | Efek entri otomatis |
| --- | --- |
| Invoice **Lunas** | Entri jasa/PPN/PPh23 dibuat |
| Invoice **Batal** | Entri terkait dibatalkan |
| Penggajian **Dibayar** | Entri take-home dibuat |
| Pajak/BPJS **Disetor** | Entri pengeluaran Pajak/BPJS dibuat |

---

## 7. Edge Cases & Catatan Penting

- **Pisahkan jasa vs pajak vs bonus** — jangan gabung dalam satu entri ([BR-10](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **PPN titipan masuk sebagai Kredit kategori Pajak** saat invoice lunas, lalu **keluar (Debit) saat disetor** — bukan dobel ([EP-08](08-tax-center.md)).
- **PPh 23 pengurang kas diterima**, bukan pendapatan; menjadi kredit pajak ([BR-10](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)).
- **Entri otomatis terkunci** ([BR-6](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)) — QA wajib menguji penolakan edit/hapus.
- **4 kategori terkunci** ([BR-7](11-konvensi-global-nfr.md#8-daftar-aturan-bisnis-tidak-boleh-dilanggar-highlight-lintas-epic)) — dipakai otomasi.
- **Take-home saja saat gaji dibayar**; setoran pajak terpisah ([EP-06](06-penggajian.md)).

---

## 8. Dependencies & Keterkaitan

- **Prasyarat:** [EP-00](00-konfigurasi-sistem.md) (kategori).
- **Sumber otomasi:** [EP-05 Faktur](05-faktur-termin.md), [EP-06 Penggajian](06-penggajian.md), [EP-08 Tax Center](08-tax-center.md).
- **Diandalkan oleh:** [EP-09 Dasbor](09-dasbor.md).
