import type { Faktur } from "@/lib/schemas/faktur";

export const fakturFixtures: Faktur[] = [
  // Verbatim PDF invoice – Termin III, terkirim
  {
    id: "INV/002/05.2026", sphId: "SPH/001/5.2026",
    perusahaanId: "PRSH-001", perusahaanNama: "PT Maju Bersama Industri",
    alamat: "Garut", kota: "Garut", npwp: "0123456789010000",
    tanggal: "2026-05-19", jatuhTempo: "2026-06-19",
    items: [{ uraian: "Penyusunan Persetujuan Teknis Air Limbah", volume: 1, harga: 125_000_000, satuan: "Paket" }],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "DP" },
      { label: "Termin II", persen: 40, pemicu: "Progres" },
      { label: "Termin III", persen: 20, pemicu: "Pelunasan Persetujuan Teknis Air Limbah" },
    ],
    terminIndex: 2, ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
  // Draft faktur – Termin I (DP)
  {
    id: "INV/001/05.2026", sphId: "SPH/002/5.2026",
    perusahaanId: "PRSH-002", perusahaanNama: "CV Sumber Rejeki Pangan",
    alamat: "Jl. Soekarno Hatta No. 88, Kiaracondong", kota: "Bandung", npwp: "0234567890120000",
    tanggal: "2026-05-10", jatuhTempo: "2026-06-10",
    items: [
      { uraian: "Penyusunan Dokumen UKL-UPL", volume: 1, harga: 85_000_000, satuan: "Paket" },
    ],
    terminList: [
      { label: "Termin I", persen: 50, pemicu: "DP" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    terminIndex: 0, ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    catatan: ["Mohon transfer ke rekening perusahaan"], status: "draft", tanggalBayar: "",
  },
  // Lunas faktur
  {
    id: "INV/003/05.2026", sphId: "SPH/003/4.2026",
    perusahaanId: "PRSH-003", perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    alamat: "Kawasan Industri SIER Blok C-4", kota: "Surabaya", npwp: "0345678901230000",
    tanggal: "2026-04-15", jatuhTempo: "2026-05-15",
    items: [
      { uraian: "Penyusunan AMDAL Kawasan Industri", volume: 1, harga: 250_000_000, satuan: "Paket" },
      { uraian: "Konsultasi Teknis Lingkungan", volume: 5, harga: 5_000_000, satuan: "Sesi" },
    ],
    terminList: [
      { label: "Termin I", persen: 30, pemicu: "DP" },
      { label: "Termin II", persen: 40, pemicu: "Penyerahan Draft" },
      { label: "Termin III", persen: 30, pemicu: "Pelunasan AMDAL" },
    ],
    terminIndex: 2, ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    catatan: [], status: "lunas", tanggalBayar: "2026-05-12",
  },
  // Overdue faktur – terkirim, jatuh tempo lampau
  {
    id: "INV/004/06.2026", sphId: "SPH/004/3.2026",
    perusahaanId: "PRSH-006", perusahaanNama: "PT Cahaya Teknik Mandiri",
    alamat: "Jl. Sisingamangaraja No. 17, Medan Kota", kota: "Medan", npwp: "0678901234560000",
    tanggal: "2026-03-01", jatuhTempo: "2026-04-01",
    items: [
      { uraian: "Audit Lingkungan Hidup", volume: 1, harga: 60_000_000, satuan: "Paket" },
    ],
    terminList: [
      { label: "Termin I", persen: 100, pemicu: "Penyelesaian Audit" },
    ],
    terminIndex: 0, ppnAktif: true, ppnPersen: 12, pph23Aktif: false, pph23Persen: 2,
    catatan: ["Mohon segera diselesaikan pembayaran"], status: "terkirim", tanggalBayar: "",
  },
  // Terkirim faktur – Termin II
  {
    id: "INV/005/06.2026", sphId: "SPH/005/5.2026",
    perusahaanId: "PRSH-001", perusahaanNama: "PT Maju Bersama Industri",
    alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22", kota: "Jakarta", npwp: "0123456789010000",
    tanggal: "2026-06-01", jatuhTempo: "2026-07-01",
    items: [
      { uraian: "Penyusunan Dokumen IPLC", volume: 1, harga: 95_000_000, satuan: "Paket" },
    ],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "DP" },
      { label: "Termin II", persen: 40, pemicu: "Penyerahan Draft" },
      { label: "Termin III", persen: 20, pemicu: "Pelunasan" },
    ],
    terminIndex: 1, ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
];
