import type { Sph } from "@/lib/schemas/penawaran";

export const penawaranFixtures: Sph[] = [
  {
    id: "SPH/001/5.2026", status: "deal",
    perusahaanId: "PRSH-001", perusahaanNama: "PT Maju Bersama Industri",
    alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22, Jakarta Selatan",
    tanggal: "2026-05-04",
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Penyusunan Pertek Air Limbah dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      { layananId: "LYN-001", nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket" },
      { layananId: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket" },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 30, pemicu: "Pertek selesai" },
      { label: "Termin III", persen: 30, pemicu: "Pelunasan" },
    ],
    rab: { personil: 45_000_000, langsung: 20_000_000 },
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
  },
  {
    id: "SPH/002/5.2026", status: "terkirim",
    perusahaanId: "PRSH-003", perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
    tanggal: "2026-05-12",
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [{ layananId: "LYN-002", nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    rab: { personil: 180_000_000, langsung: 60_000_000 },
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Termasuk pendampingan sidang AMDAL.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
  },
  {
    id: "SPH/003/5.2026", status: "draft",
    perusahaanId: "PRSH-005", perusahaanNama: "CV Bahari Sentosa",
    alamat: "Jl. Bypass Ngurah Rai No. 200, Sanur, Denpasar",
    tanggal: "2026-05-20",
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [{ layananId: "LYN-003", nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }],
    termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
    rab: { personil: 20_000_000, langsung: 8_000_000 },
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
  },
  {
    id: "SPH/004/6.2026", status: "draft",
    perusahaanId: "PRSH-006", perusahaanNama: "PT Cahaya Teknik Mandiri",
    alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
    tanggal: "2026-06-02",
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [{ layananId: "LYN-005", nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    rab: { personil: 38_000_000, langsung: 12_000_000 },
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
  },
  {
    id: "SPH/005/6.2026", status: "terkirim",
    perusahaanId: "PRSH-002", perusahaanNama: "CV Sumber Rejeki Pangan",
    alamat: "Jl. Soekarno Hatta No. 88, Kiaracondong, Bandung",
    tanggal: "2026-06-05",
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      { layananId: "LYN-003", nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" },
      { layananId: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    rab: { personil: 30_000_000, langsung: 10_000_000 },
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
  },
];
