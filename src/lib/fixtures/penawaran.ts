import type { Sph, SphKelengkapan } from "@/lib/schemas/penawaran";

const noKelengkapan: SphKelengkapan[] = [];
import { sampleItemRab, sampleItemJadwal, type RabRow } from "@/lib/sph-templates";
import { encodeSph, encodePerusahaan, encodeLayanan } from "@/lib/id-generator";

function itemRab(tweak?: (r: { personil: RabRow[]; langsung: RabRow[] }) => void) {
  const rab = sampleItemRab();
  tweak?.(rab);
  return rab;
}

const recipientDefaults = {
  jabatanPenerima: "Direktur",
  picAktif: false,
  picNama: "",
  picJabatan: "",
  kelengkapan: noKelengkapan,
} as const;

export const penawaranFixtures: Sph[] = [
  {
    id: encodeSph(1, 5, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(1), perusahaanNama: "PT Maju Bersama Industri",
    alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22, Jakarta Selatan",
    tanggal: "2026-05-04",
    masaBerlakuAktif: true, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Penyusunan Pertek Air Limbah dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(1), nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil[0].hargaSatuan = 5_000_000; }),
        jadwal: sampleItemJadwal("Penyusunan Pertek Air Limbah"),
      },
      {
        layananId: encodeLayanan(4), nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.langsung[3].hargaSatuan = 4_000_000; }),
        jadwal: sampleItemJadwal("Laporan Pelaksanaan RKL-RPL Semester"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 30, pemicu: "Pertek selesai" },
      { label: "Termin III", persen: 30, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(2, 5, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(3), perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
    tanggal: "2026-05-12",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(2), nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil.forEach((p) => (p.vol = 6)); }),
        jadwal: sampleItemJadwal("Dokumen AMDAL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Termasuk pendampingan sidang AMDAL.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(3, 5, 2026), status: "draft", rincianAktif: true,
    perusahaanId: encodePerusahaan(5), perusahaanNama: "CV Bahari Sentosa",
    alamat: "Jl. Bypass Ngurah Rai No. 200, Sanur, Denpasar",
    tanggal: "2026-05-20",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(3), nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
    ],
    termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(4, 6, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(6), perusahaanNama: "PT Cahaya Teknik Mandiri",
    alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
    tanggal: "2026-06-02",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(5), nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.langsung[2].hargaSatuan = 1_500_000; }),
        jadwal: sampleItemJadwal("Persetujuan Teknis Emisi Udara"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(5, 6, 2026), status: "terkirim", rincianAktif: true,
    perusahaanId: encodePerusahaan(2), perusahaanNama: "CV Sumber Rejeki Pangan",
    alamat: "Jl. Soekarno Hatta No. 88, Kiaracondong, Bandung",
    tanggal: "2026-06-05",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(3), nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
      {
        layananId: encodeLayanan(4), nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil.forEach((p) => (p.vol = 1)); }),
        jadwal: sampleItemJadwal("Laporan Pelaksanaan RKL-RPL Semester"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  // ── Tambahan 10 penawaran ──────────────────────────────────────────────────
  {
    id: encodeSph(6, 1, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(7), perusahaanNama: "PT Nusantara Energi Prima",
    alamat: "Jl. TB Simatupang No. 1, Kebagusan, Pasar Minggu, Jakarta Selatan",
    tanggal: "2026-01-08",
    masaBerlakuAktif: true, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(3), nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
      {
        layananId: encodeLayanan(4), nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil.forEach((p) => (p.vol = 1)); }),
        jadwal: sampleItemJadwal("Laporan Pelaksanaan RKL-RPL Semester"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(7, 2, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(8), perusahaanNama: "CV Agro Subur Mandiri",
    alamat: "Jl. Magelang KM 7, Mlati, Sleman, Yogyakarta",
    tanggal: "2026-02-14",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(2), nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil.forEach((p) => (p.vol = 6)); }),
        jadwal: sampleItemJadwal("Dokumen AMDAL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 100, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Termasuk pendampingan sidang AMDAL.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(8, 3, 2026), status: "terkirim", rincianAktif: false,
    perusahaanId: encodePerusahaan(9), perusahaanNama: "PT Bintang Maritim Indonesia",
    alamat: "Jl. Penghibur No. 58, Ujung Pandang, Makassar",
    tanggal: "2026-03-05",
    masaBerlakuAktif: true, masaBerlakuHari: 14,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Penyusunan Pertek Air Limbah. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(1), nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Penyusunan Pertek Air Limbah"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: false, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(9, 3, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(10), perusahaanNama: "CV Pembangunan Baru Jaya",
    alamat: "Jl. Jenderal Sudirman KM 3.5, Bukit Besar, Palembang",
    tanggal: "2026-03-18",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(5), nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.langsung[2].hargaSatuan = 1_500_000; }),
        jadwal: sampleItemJadwal("Persetujuan Teknis Emisi Udara"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(10, 4, 2026), status: "draft", rincianAktif: false,
    perusahaanId: encodePerusahaan(11), perusahaanNama: "PT Rimba Lestari Kalimantan",
    alamat: "Jl. Ahmad Yani No. 99, Pontianak Kota",
    tanggal: "2026-04-02",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(2), nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen AMDAL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 30, pemicu: "Mulai" },
      { label: "Termin II", persen: 40, pemicu: "Sidang AMDAL" },
      { label: "Termin III", persen: 30, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(11, 4, 2026), status: "ditolak", rincianAktif: false,
    perusahaanId: encodePerusahaan(12), perusahaanNama: "CV Techno Solusi Utama",
    alamat: "Jl. Soekarno Hatta No. 41, Lowokwaru, Malang",
    tanggal: "2026-04-10",
    masaBerlakuAktif: true, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(3), nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 100, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
    ],
    ppnAktif: false, ppnPersen: 12, pph23Aktif: false, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(12, 4, 2026), status: "dibatalkan", rincianAktif: false,
    perusahaanId: encodePerusahaan(2), perusahaanNama: "CV Sumber Rejeki Pangan",
    alamat: "Jl. Soekarno Hatta No. 88, Kiaracondong, Bandung",
    tanggal: "2026-04-22",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(4), nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil.forEach((p) => (p.vol = 1)); }),
        jadwal: sampleItemJadwal("Laporan Pelaksanaan RKL-RPL Semester"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 100, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: false, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(13, 5, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(3), perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
    tanggal: "2026-05-07",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(3), nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 100, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(14, 5, 2026), status: "terkirim", rincianAktif: true,
    perusahaanId: encodePerusahaan(6), perusahaanNama: "PT Cahaya Teknik Mandiri",
    alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
    tanggal: "2026-05-19",
    masaBerlakuAktif: true, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan Pertek Air Limbah dan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(1), nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Penyusunan Pertek Air Limbah"),
      },
      {
        layananId: encodeLayanan(5), nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.langsung[2].hargaSatuan = 1_500_000; }),
        jadwal: sampleItemJadwal("Persetujuan Teknis Emisi Udara"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(15, 6, 2026), status: "draft", rincianAktif: false,
    perusahaanId: encodePerusahaan(4), perusahaanNama: "PT Hijau Lestari Permai",
    alamat: "Jl. Pemuda No. 45, Semarang Tengah",
    tanggal: "2026-06-10",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(2), nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen AMDAL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(16, 6, 2026), status: "draft", rincianAktif: false,
    perusahaanId: encodePerusahaan(13), perusahaanNama: "PT Alam Hijau Balikpapan",
    alamat: "Jl. Letjen Suprapto No. 12, Balikpapan Kota",
    tanggal: "2026-06-12",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(2), nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen AMDAL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 30, pemicu: "Mulai" },
      { label: "Termin II", persen: 40, pemicu: "Sidang AMDAL" },
      { label: "Termin III", persen: 30, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(17, 6, 2026), status: "terkirim", rincianAktif: false,
    perusahaanId: encodePerusahaan(14), perusahaanNama: "CV Karya Cipta Maju",
    alamat: "Kawasan Industri MM2100 Blok KK-5, Cikarang Barat, Bekasi",
    tanggal: "2026-06-14",
    masaBerlakuAktif: true, masaBerlakuHari: 14,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan Pertek Air Limbah. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(1), nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Penyusunan Pertek Air Limbah"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(18, 6, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(15), perusahaanNama: "PT Delta Pratama Nusantara",
    alamat: "Jl. Hang Kesturi KM 4, Nongsa, Batam",
    tanggal: "2026-06-16",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(3), nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
      {
        layananId: encodeLayanan(4), nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil.forEach((p) => (p.vol = 1)); }),
        jadwal: sampleItemJadwal("Laporan Pelaksanaan RKL-RPL Semester"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(19, 5, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(7), perusahaanNama: "PT Nusantara Energi Prima",
    alamat: "Jl. TB Simatupang No. 1, Kebagusan, Pasar Minggu, Jakarta Selatan",
    tanggal: "2026-05-08",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(5), nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.langsung[2].hargaSatuan = 1_500_000; }),
        jadwal: sampleItemJadwal("Persetujuan Teknis Emisi Udara"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
  {
    id: encodeSph(20, 4, 2026), status: "deal", rincianAktif: true,
    perusahaanId: encodePerusahaan(11), perusahaanNama: "PT Rimba Lestari Kalimantan",
    alamat: "Jl. Ahmad Yani No. 99, Pontianak Kota",
    tanggal: "2026-04-25",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: encodeLayanan(3), nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
    ],
    termin: [
      { label: "Termin I", persen: 100, pemicu: "Pelunasan" },
    ],
    catatan: [
      "Biaya diatas dengan catatan persyaratan administratif sudah lengkap.",
      "Biaya diatas belum termasuk PPN 11%.",
      "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir.",
    ],
    ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
    ...recipientDefaults,
  },
];
