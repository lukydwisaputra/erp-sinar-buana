import type { Faktur } from "@/lib/schemas/faktur";

/**
 * Invoices are derived from deal SPHs. Each deal's contract (items + termin
 * schedule + client) is defined once here and shared by all of its invoices,
 * so the per-deal termin rekap stays internally consistent.
 */
const dealA = {
  sphId: "SPH/001/5.2026",
  perusahaanId: "PRSH-001", perusahaanNama: "PT Maju Bersama Industri",
  alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22, Jakarta Selatan",
  kota: "Jakarta", npwp: "0123456789010000",
  items: [
    { uraian: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket" },
    { uraian: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket" },
  ],
  terminList: [
    { label: "Termin I", persen: 40, pemicu: "Mulai" },
    { label: "Termin II", persen: 30, pemicu: "Pertek selesai" },
    { label: "Termin III", persen: 30, pemicu: "Pelunasan" },
  ],
};
const dealB = {
  sphId: "SPH/002/5.2026",
  perusahaanId: "PRSH-003", perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
  alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
  kota: "Surabaya", npwp: "0345678901230000",
  items: [{ uraian: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }],
  terminList: [
    { label: "Termin I", persen: 50, pemicu: "Mulai" },
    { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
  ],
};
const dealC = {
  sphId: "SPH/004/6.2026",
  perusahaanId: "PRSH-006", perusahaanNama: "PT Cahaya Teknik Mandiri",
  alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
  kota: "Medan", npwp: "0678901234560000",
  items: [{ uraian: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
  terminList: [
    { label: "Termin I", persen: 40, pemicu: "Mulai" },
    { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
  ],
};

const tax = { ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 } as const;

export const fakturFixtures: Faktur[] = [
  // Deal A (SPH/001) — Termin I & II lunas, Termin III terkirim (70% terbayar, tidak ada termin terbuka)
  {
    id: "INV/001/04.2026", ...dealA, ...tax,
    tanggal: "2026-04-08", jatuhTempo: "2026-05-08", terminIndex: 0,
    catatan: [], status: "lunas", tanggalBayar: "2026-04-20",
  },
  {
    id: "INV/002/05.2026", ...dealA, ...tax,
    tanggal: "2026-05-02", jatuhTempo: "2026-06-02", terminIndex: 1,
    catatan: [], status: "lunas", tanggalBayar: "2026-05-14",
  },
  {
    id: "INV/003/05.2026", ...dealA, ...tax,
    tanggal: "2026-05-22", jatuhTempo: "2026-06-22", terminIndex: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
  // Deal B (SPH/002) — Termin I lunas; Termin II BELUM (boleh dibuat, 50% terbayar)
  {
    id: "INV/004/05.2026", ...dealB, ...tax,
    tanggal: "2026-05-10", jatuhTempo: "2026-06-10", terminIndex: 0,
    catatan: ["Mohon transfer ke rekening perusahaan"], status: "lunas", tanggalBayar: "2026-05-28",
  },
  // Deal C (SPH/004) — Termin I terkirim & JATUH TEMPO; Termin II terkunci (0% terbayar)
  {
    id: "INV/005/04.2026", ...dealC, ...tax,
    tanggal: "2026-03-01", jatuhTempo: "2026-04-01", terminIndex: 0,
    catatan: ["Mohon segera diselesaikan pembayaran"], status: "terkirim", tanggalBayar: "",
  },
];
