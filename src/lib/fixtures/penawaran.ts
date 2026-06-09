import type { Sph } from "@/lib/schemas/penawaran";
import { sampleItemRab, sampleItemJadwal, type RabRow } from "@/lib/sph-templates";

/** Per-item RAB seeded from the filled sample template; `tweak` lets a service vary
 * a few personil rates so the per-service totals differ a little. */
function itemRab(tweak?: (r: { personil: RabRow[]; langsung: RabRow[] }) => void) {
  const rab = sampleItemRab();
  tweak?.(rab);
  return rab;
}

export const penawaranFixtures: Sph[] = [
  {
    id: "SPH/001/5.2026", status: "deal", rincianAktif: true,
    perusahaanId: "PRSH-001", perusahaanNama: "PT Maju Bersama Industri",
    alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22, Jakarta Selatan",
    tanggal: "2026-05-04",
    masaBerlakuAktif: true, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Penyusunan Pertek Air Limbah dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: "LYN-001", nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket",
        rab: itemRab((r) => { r.personil[0].hargaSatuan = 5_000_000; }),
        jadwal: sampleItemJadwal("Penyusunan Pertek Air Limbah"),
      },
      {
        layananId: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket",
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
  },
  {
    id: "SPH/002/5.2026", status: "terkirim", rincianAktif: true,
    perusahaanId: "PRSH-003", perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
    tanggal: "2026-05-12",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: "LYN-002", nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket",
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
  },
  {
    id: "SPH/003/5.2026", status: "draft", rincianAktif: true,
    perusahaanId: "PRSH-005", perusahaanNama: "CV Bahari Sentosa",
    alamat: "Jl. Bypass Ngurah Rai No. 200, Sanur, Denpasar",
    tanggal: "2026-05-20",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: "LYN-003", nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
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
  },
  {
    id: "SPH/004/6.2026", status: "draft", rincianAktif: true,
    perusahaanId: "PRSH-006", perusahaanNama: "PT Cahaya Teknik Mandiri",
    alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
    tanggal: "2026-06-02",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: "LYN-005", nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket",
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
  },
  {
    id: "SPH/005/6.2026", status: "terkirim", rincianAktif: true,
    perusahaanId: "PRSH-002", perusahaanNama: "CV Sumber Rejeki Pangan",
    alamat: "Jl. Soekarno Hatta No. 88, Kiaracondong, Bandung",
    tanggal: "2026-06-05",
    masaBerlakuAktif: false, masaBerlakuHari: 30,
    lampiran: "RAB dan Estimasi Waktu",
    kalimatPembuka:
      "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:",
    items: [
      {
        layananId: "LYN-003", nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket",
        rab: itemRab(),
        jadwal: sampleItemJadwal("Dokumen UKL-UPL"),
      },
      {
        layananId: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket",
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
  },
];
