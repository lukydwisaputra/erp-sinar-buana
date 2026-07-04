import type { Faktur } from "@/lib/schemas/faktur";
import { encodeSph, encodeInvTermin } from "@/lib/id-generator";
import { seedPerusahaanId } from "@/lib/perusahaan-seed-ids";

const dealA = {
  sphId: encodeSph(1, 5, 2026),
  perusahaanId: seedPerusahaanId(1), perusahaanNama: "PT Maju Bersama Industri",
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
  sphId: encodeSph(2, 5, 2026),
  perusahaanId: seedPerusahaanId(3), perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
  alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
  kota: "Surabaya", npwp: "0345678901230000",
  items: [{ uraian: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }],
  terminList: [
    { label: "Termin I", persen: 50, pemicu: "Mulai" },
    { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
  ],
};
const dealC = {
  sphId: encodeSph(4, 6, 2026),
  perusahaanId: seedPerusahaanId(6), perusahaanNama: "PT Cahaya Teknik Mandiri",
  alamat: "Jl. Sisingamangaraja No. 17, Medan Kota",
  kota: "Medan", npwp: "0678901234560000",
  items: [{ uraian: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
  terminList: [
    { label: "Termin I", persen: 40, pemicu: "Mulai" },
    { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
  ],
};

const tax = {
  ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2,
  bankNama: "", bankAtasNama: "", bankNoRekening: "",
  jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "",
} as const;

export const fakturFixtures: Faktur[] = [
  // Deal A (SPH seq 1, May 2026) — T1 & T2 lunas, T3 terkirim
  {
    id: encodeInvTermin(1, 2026, 0), ...dealA, ...tax,
    tanggal: "2026-04-08", jatuhTempo: "2026-05-08", terminIndex: 0,
    catatan: [], status: "lunas", tanggalBayar: "2026-04-20",
  },
  {
    id: encodeInvTermin(1, 2026, 1), ...dealA, ...tax,
    tanggal: "2026-05-02", jatuhTempo: "2026-06-02", terminIndex: 1,
    catatan: [], status: "lunas", tanggalBayar: "2026-05-14",
  },
  {
    id: encodeInvTermin(1, 2026, 2), ...dealA, ...tax,
    tanggal: "2026-05-22", jatuhTempo: "2026-06-22", terminIndex: 2,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
  // Deal B (SPH seq 2, May 2026) — T1 lunas; T2 draft
  {
    id: encodeInvTermin(2, 2026, 0), ...dealB, ...tax,
    tanggal: "2026-05-10", jatuhTempo: "2026-06-10", terminIndex: 0,
    catatan: ["Mohon transfer ke rekening perusahaan"], status: "lunas", tanggalBayar: "2026-05-28",
  },
  {
    id: encodeInvTermin(2, 2026, 1), ...dealB, ...tax,
    tanggal: "", jatuhTempo: "", terminIndex: 1,
    catatan: [], status: "draft", tanggalBayar: "",
  },
  // Deal C (SPH seq 4, June 2026) — T1 terkirim & overdue; T2 draft
  {
    id: encodeInvTermin(4, 2026, 0), ...dealC, ...tax,
    tanggal: "2026-03-01", jatuhTempo: "2026-04-01", terminIndex: 0,
    catatan: ["Mohon segera diselesaikan pembayaran"], status: "terkirim", tanggalBayar: "",
  },
  {
    id: encodeInvTermin(4, 2026, 1), ...dealC, ...tax,
    tanggal: "", jatuhTempo: "", terminIndex: 1,
    catatan: [], status: "draft", tanggalBayar: "",
  },
  // Deal D (SPH seq 6, Jan 2026) — T1 & T2 lunas
  {
    id: encodeInvTermin(6, 2026, 0),
    sphId: encodeSph(6, 1, 2026),
    perusahaanId: seedPerusahaanId(7), perusahaanNama: "PT Nusantara Energi Prima",
    alamat: "Jl. TB Simatupang No. 1, Kebagusan, Pasar Minggu, Jakarta Selatan",
    kota: "Jakarta", npwp: "0789012345670000",
    items: [
      { uraian: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" },
      { uraian: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" },
    ],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pelunasan" },
    ],
    ...tax,
    tanggal: "2026-01-15", jatuhTempo: "2026-02-15", terminIndex: 0,
    catatan: [], status: "lunas", tanggalBayar: "2026-02-10",
  },
  {
    id: encodeInvTermin(6, 2026, 1),
    sphId: encodeSph(6, 1, 2026),
    perusahaanId: seedPerusahaanId(7), perusahaanNama: "PT Nusantara Energi Prima",
    alamat: "Jl. TB Simatupang No. 1, Kebagusan, Pasar Minggu, Jakarta Selatan",
    kota: "Jakarta", npwp: "0789012345670000",
    items: [
      { uraian: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" },
      { uraian: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" },
    ],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pelunasan" },
    ],
    ...tax,
    tanggal: "2026-03-05", jatuhTempo: "2026-04-05", terminIndex: 1,
    catatan: [], status: "lunas", tanggalBayar: "2026-04-01",
  },
  // Deal E (SPH seq 7, Feb 2026) — T1 lunas (all done)
  {
    id: encodeInvTermin(7, 2026, 0),
    sphId: encodeSph(7, 2, 2026),
    perusahaanId: seedPerusahaanId(8), perusahaanNama: "CV Agro Subur Mandiri",
    alamat: "Jl. Magelang KM 7, Mlati, Sleman, Yogyakarta",
    kota: "Yogyakarta", npwp: "0890123456780000",
    items: [{ uraian: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }],
    terminList: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
    ...tax,
    tanggal: "2026-03-10", jatuhTempo: "2026-04-10", terminIndex: 0,
    catatan: ["Termasuk pendampingan sidang AMDAL"], status: "lunas", tanggalBayar: "2026-04-02",
  },
  // Deal F (SPH seq 9, Mar 2026) — T1 terkirim & overdue; T2 draft
  {
    id: encodeInvTermin(9, 2026, 0),
    sphId: encodeSph(9, 3, 2026),
    perusahaanId: seedPerusahaanId(10), perusahaanNama: "CV Pembangunan Baru Jaya",
    alamat: "Jl. Jenderal Sudirman KM 3.5, Bukit Besar, Palembang",
    kota: "Palembang", npwp: "0012345678900000",
    items: [{ uraian: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    ...tax,
    tanggal: "2026-04-01", jatuhTempo: "2026-05-01", terminIndex: 0,
    catatan: ["Mohon segera dilunasi"], status: "terkirim", tanggalBayar: "",
  },
  {
    id: encodeInvTermin(9, 2026, 1),
    sphId: encodeSph(9, 3, 2026),
    perusahaanId: seedPerusahaanId(10), perusahaanNama: "CV Pembangunan Baru Jaya",
    alamat: "Jl. Jenderal Sudirman KM 3.5, Bukit Besar, Palembang",
    kota: "Palembang", npwp: "0012345678900000",
    items: [{ uraian: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    ...tax,
    tanggal: "", jatuhTempo: "", terminIndex: 1,
    catatan: [], status: "draft", tanggalBayar: "",
  },
  // Deal G (SPH seq 13, May 2026) — T1 terkirim (belum lunas)
  {
    id: encodeInvTermin(13, 2026, 0),
    sphId: encodeSph(13, 5, 2026),
    perusahaanId: seedPerusahaanId(3), perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    alamat: "Kawasan Industri SIER Blok C-4, Surabaya",
    kota: "Surabaya", npwp: "0345678901230000",
    items: [{ uraian: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }],
    terminList: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
    ...tax,
    tanggal: "2026-05-20", jatuhTempo: "2026-07-01", terminIndex: 0,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
  // Deal H (SPH seq 18, Jun 2026) — T1 terkirim; T2 draft
  {
    id: encodeInvTermin(18, 2026, 0),
    sphId: encodeSph(18, 6, 2026),
    perusahaanId: seedPerusahaanId(15), perusahaanNama: "PT Delta Pratama Nusantara",
    alamat: "Jl. Hang Kesturi KM 4, Nongsa, Batam",
    kota: "Batam", npwp: "0556677889900000",
    items: [
      { uraian: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" },
      { uraian: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" },
    ],
    terminList: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    ...tax,
    tanggal: "2026-06-17", jatuhTempo: "2026-07-17", terminIndex: 0,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
  {
    id: encodeInvTermin(18, 2026, 1),
    sphId: encodeSph(18, 6, 2026),
    perusahaanId: seedPerusahaanId(15), perusahaanNama: "PT Delta Pratama Nusantara",
    alamat: "Jl. Hang Kesturi KM 4, Nongsa, Batam",
    kota: "Batam", npwp: "0556677889900000",
    items: [
      { uraian: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" },
      { uraian: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" },
    ],
    terminList: [
      { label: "Termin I", persen: 50, pemicu: "Mulai" },
      { label: "Termin II", persen: 50, pemicu: "Pelunasan" },
    ],
    ...tax,
    tanggal: "", jatuhTempo: "", terminIndex: 1,
    catatan: [], status: "draft", tanggalBayar: "",
  },
  // Deal I (SPH seq 19, May 2026) — T1 lunas; T2 terkirim
  {
    id: encodeInvTermin(19, 2026, 0),
    sphId: encodeSph(19, 5, 2026),
    perusahaanId: seedPerusahaanId(7), perusahaanNama: "PT Nusantara Energi Prima",
    alamat: "Jl. TB Simatupang No. 1, Kebagusan, Pasar Minggu, Jakarta Selatan",
    kota: "Jakarta", npwp: "0789012345670000",
    items: [{ uraian: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    ...tax,
    tanggal: "2026-05-10", jatuhTempo: "2026-06-10", terminIndex: 0,
    catatan: [], status: "lunas", tanggalBayar: "2026-06-05",
  },
  {
    id: encodeInvTermin(19, 2026, 1),
    sphId: encodeSph(19, 5, 2026),
    perusahaanId: seedPerusahaanId(7), perusahaanNama: "PT Nusantara Energi Prima",
    alamat: "Jl. TB Simatupang No. 1, Kebagusan, Pasar Minggu, Jakarta Selatan",
    kota: "Jakarta", npwp: "0789012345670000",
    items: [{ uraian: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }],
    terminList: [
      { label: "Termin I", persen: 40, pemicu: "Mulai" },
      { label: "Termin II", persen: 60, pemicu: "Pertek selesai" },
    ],
    ...tax,
    tanggal: "2026-06-10", jatuhTempo: "2026-07-10", terminIndex: 1,
    catatan: [], status: "terkirim", tanggalBayar: "",
  },
  // Deal J (SPH seq 20, Apr 2026) — T1 lunas (selesai)
  {
    id: encodeInvTermin(20, 2026, 0),
    sphId: encodeSph(20, 4, 2026),
    perusahaanId: seedPerusahaanId(11), perusahaanNama: "PT Rimba Lestari Kalimantan",
    alamat: "Jl. Ahmad Yani No. 99, Pontianak Kota",
    kota: "Pontianak", npwp: "0112233445560000",
    items: [{ uraian: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }],
    terminList: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
    ...tax,
    tanggal: "2026-04-28", jatuhTempo: "2026-05-28", terminIndex: 0,
    catatan: [], status: "lunas", tanggalBayar: "2026-05-20",
  },
];
