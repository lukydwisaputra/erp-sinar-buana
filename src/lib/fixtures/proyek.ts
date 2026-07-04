import type { Proyek } from "@/lib/schemas/proyek";
import {
  encodeProyekFromSph, encodeKaryawan, encodeSph, encodeInvTermin,
} from "@/lib/id-generator";
import { seedPerusahaanId } from "@/lib/perusahaan-seed-ids";

const KRY3 = encodeKaryawan(3); // Agus Setiawan
const KRY4 = encodeKaryawan(4); // Dewi Anggraini
const KRY5 = encodeKaryawan(5); // Fajar Ramadhan
const KRY7 = encodeKaryawan(7); // Hendra Permana
const KRY8 = encodeKaryawan(8); // Nadia Kusumawati
const KRY9 = encodeKaryawan(9); // Rizky Firmansyah

const agus   = { id: KRY3, nama: "Agus Setiawan" };
const dewi   = { id: KRY4, nama: "Dewi Anggraini" };
const fajar  = { id: KRY5, nama: "Fajar Ramadhan" };
const hendra = { id: KRY7, nama: "Hendra Permana" };
const nadia  = { id: KRY8, nama: "Nadia Kusumawati" };
const rizky  = { id: KRY9, nama: "Rizky Firmansyah" };

const m = (fields: Omit<import("@/lib/schemas/proyek").Milestone, "parentId" | "description" | "descriptionAttachments">) =>
  ({ parentId: null, description: null, descriptionAttachments: [], ...fields });

export const proyekFixtures: Proyek[] = [
  {
    id: encodeProyekFromSph(1, 2026),
    nama: "Pertek Air Limbah — PT Maju Bersama Industri",
    perusahaanId: seedPerusahaanId(1),
    perusahaanNama: "PT Maju Bersama Industri",
    area: "Jakarta Selatan",
    tahun: 2026,
    layananNama: ["Penyusunan Pertek Air Limbah", "Laporan Pelaksanaan RKL-RPL Semester"],
    status: "on_track",
    nilaiKontrak: 136_250_000,
    sphId: encodeSph(1, 5, 2026),
    assignees: [
      { karyawanId: KRY3, nama: "Agus Setiawan" },
      { karyawanId: KRY4, nama: "Dewi Anggraini" },
    ],
    milestones: [
      m({ id: "ML-001-1", nama: "Survey Lokasi", urutan: 1, assignees: [agus], targetDate: "2026-04-15", actualDate: "2026-04-18", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-001-2", nama: "Pengumpulan Data & Berkas Administrasi", urutan: 2, assignees: [dewi], targetDate: "2026-05-01", actualDate: "2026-05-03", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-001-3", nama: "Penyusunan Dokumen", urutan: 3, assignees: [agus], targetDate: "2026-05-20", actualDate: null, status: "on_track", pemicuTermin: { fakturId: encodeInvTermin(1, 2026, 1), persen: 30 } }),
      m({ id: "ML-001-4", nama: "Asistensi dengan Dinas LH", urutan: 4, assignees: [agus], targetDate: "2026-06-10", actualDate: null, status: "belum_mulai", pemicuTermin: null }),
      m({ id: "ML-001-5", nama: "Penerbitan Dokumen", urutan: 5, assignees: [], targetDate: "2026-06-30", actualDate: null, status: "belum_mulai", pemicuTermin: null }),
    ],
    createdAt: "2026-05-04T09:00:00.000Z",
  },
  {
    id: encodeProyekFromSph(2, 2026),
    nama: "Dokumen AMDAL — PT Karya Logam",
    perusahaanId: seedPerusahaanId(3),
    perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    area: "Kawasan Industri SIER, Surabaya",
    tahun: 2026,
    layananNama: ["Dokumen AMDAL"],
    status: "on_track",
    nilaiKontrak: 381_500_000,
    sphId: encodeSph(2, 5, 2026),
    assignees: [
      { karyawanId: KRY3, nama: "Agus Setiawan" },
    ],
    milestones: [
      m({ id: "ML-002-1", nama: "Survey Lokasi", urutan: 1, assignees: [agus], targetDate: "2026-05-10", actualDate: "2026-05-12", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-002-2", nama: "Pengumpulan Data & Berkas Administrasi", urutan: 2, assignees: [dewi], targetDate: "2026-06-01", actualDate: null, status: "on_track", pemicuTermin: null }),
      m({ id: "ML-002-3", nama: "Penyusunan Dokumen Kerangka Acuan (KA)", urutan: 3, assignees: [agus], targetDate: "2026-07-01", actualDate: null, status: "belum_mulai", pemicuTermin: null }),
      m({ id: "ML-002-4", nama: "Penyusunan Draft ANDAL & RKL-RPL", urutan: 4, assignees: [agus], targetDate: "2026-08-01", actualDate: null, status: "belum_mulai", pemicuTermin: null }),
      m({ id: "ML-002-5", nama: "Rapat Pembahasan dengan Komisi AMDAL", urutan: 5, assignees: [], targetDate: "2026-09-01", actualDate: null, status: "belum_mulai", pemicuTermin: null }),
      m({ id: "ML-002-6", nama: "Penerbitan Dokumen AMDAL", urutan: 6, assignees: [], targetDate: "2026-10-01", actualDate: null, status: "belum_mulai", pemicuTermin: null }),
    ],
    createdAt: "2026-05-10T10:00:00.000Z",
  },
  {
    id: encodeProyekFromSph(4, 2026),
    nama: "Pertek Emisi Udara — PT Cahaya Teknik Mandiri",
    perusahaanId: seedPerusahaanId(6),
    perusahaanNama: "PT Cahaya Teknik Mandiri",
    area: "Medan Kota",
    tahun: 2026,
    layananNama: ["Persetujuan Teknis Emisi Udara"],
    status: "on_track",
    nilaiKontrak: 74_120_000,
    sphId: encodeSph(4, 6, 2026),
    assignees: [
      { karyawanId: KRY3, nama: "Agus Setiawan" },
      { karyawanId: KRY5, nama: "Fajar Ramadhan" },
    ],
    milestones: [
      m({ id: "ML-003-1", nama: "Survey Lokasi", urutan: 1, assignees: [agus], targetDate: "2026-05-20", actualDate: "2026-05-21", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-003-2", nama: "Pengumpulan Data", urutan: 2, assignees: [fajar], targetDate: "2026-06-01", actualDate: "2026-06-03", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-003-3", nama: "Penyusunan Dokumen Pertek", urutan: 3, assignees: [agus], targetDate: "2026-06-20", actualDate: "2026-06-22", status: "selesai", pemicuTermin: { fakturId: encodeInvTermin(4, 2026, 0), persen: 40 } }),
      m({ id: "ML-003-4", nama: "Tunggu Pengesahan Dinas", urutan: 4, assignees: [], targetDate: "2026-07-15", actualDate: null, status: "on_track", pemicuTermin: null }),
    ],
    createdAt: "2026-06-01T08:30:00.000Z",
  },
  {
    id: encodeProyekFromSph(6, 2026),
    nama: "UKL-UPL & Laporan RKL-RPL — PT Nusantara Energi Prima",
    perusahaanId: seedPerusahaanId(7),
    perusahaanNama: "PT Nusantara Energi Prima",
    area: "Jakarta Selatan",
    tahun: 2026,
    layananNama: ["Dokumen UKL-UPL", "Laporan Pelaksanaan RKL-RPL Semester"],
    status: "selesai",
    nilaiKontrak: 76_300_000,
    sphId: encodeSph(6, 1, 2026),
    assignees: [
      { karyawanId: KRY3, nama: "Agus Setiawan" },
      { karyawanId: KRY8, nama: "Nadia Kusumawati" },
    ],
    milestones: [
      m({ id: "ML-004-1", nama: "Pengumpulan Data & Administrasi", urutan: 1, assignees: [nadia], targetDate: "2026-01-20", actualDate: "2026-01-22", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-004-2", nama: "Penyusunan Dokumen UKL-UPL", urutan: 2, assignees: [agus], targetDate: "2026-02-20", actualDate: "2026-02-18", status: "selesai", pemicuTermin: { fakturId: encodeInvTermin(6, 2026, 0), persen: 40 } }),
      m({ id: "ML-004-3", nama: "Pengesahan & Penyerahan Dokumen", urutan: 3, assignees: [], targetDate: "2026-03-30", actualDate: "2026-03-28", status: "selesai", pemicuTermin: { fakturId: encodeInvTermin(6, 2026, 1), persen: 60 } }),
    ],
    createdAt: "2026-01-10T08:00:00.000Z",
  },
  {
    id: encodeProyekFromSph(7, 2026),
    nama: "Dokumen AMDAL — CV Agro Subur Mandiri",
    perusahaanId: seedPerusahaanId(8),
    perusahaanNama: "CV Agro Subur Mandiri",
    area: "Mlati, Sleman, Yogyakarta",
    tahun: 2026,
    layananNama: ["Dokumen AMDAL"],
    status: "selesai",
    nilaiKontrak: 381_500_000,
    sphId: encodeSph(7, 2, 2026),
    assignees: [
      { karyawanId: KRY7, nama: "Hendra Permana" },
      { karyawanId: KRY3, nama: "Agus Setiawan" },
    ],
    milestones: [
      m({ id: "ML-005-1", nama: "Survey Lokasi & Pengumpulan Data", urutan: 1, assignees: [hendra], targetDate: "2026-02-20", actualDate: "2026-02-22", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-005-2", nama: "Penyusunan Dokumen KA-ANDAL", urutan: 2, assignees: [hendra, agus], targetDate: "2026-03-15", actualDate: "2026-03-14", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-005-3", nama: "Sidang AMDAL", urutan: 3, assignees: [hendra], targetDate: "2026-03-28", actualDate: "2026-03-28", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-005-4", nama: "Penerbitan Dokumen AMDAL", urutan: 4, assignees: [], targetDate: "2026-04-10", actualDate: "2026-04-08", status: "selesai", pemicuTermin: { fakturId: encodeInvTermin(7, 2026, 0), persen: 100 } }),
    ],
    createdAt: "2026-02-16T09:00:00.000Z",
  },
  {
    id: encodeProyekFromSph(9, 2026),
    nama: "Pertek Emisi Udara — CV Pembangunan Baru Jaya",
    perusahaanId: seedPerusahaanId(10),
    perusahaanNama: "CV Pembangunan Baru Jaya",
    area: "Bukit Besar, Palembang",
    tahun: 2026,
    layananNama: ["Persetujuan Teknis Emisi Udara"],
    status: "terlambat",
    nilaiKontrak: 74_120_000,
    sphId: encodeSph(9, 3, 2026),
    assignees: [
      { karyawanId: KRY9, nama: "Rizky Firmansyah" },
      { karyawanId: KRY5, nama: "Fajar Ramadhan" },
    ],
    milestones: [
      m({ id: "ML-006-1", nama: "Survey Lokasi", urutan: 1, assignees: [rizky], targetDate: "2026-04-05", actualDate: "2026-04-07", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-006-2", nama: "Penyusunan Dokumen Pertek", urutan: 2, assignees: [rizky, fajar], targetDate: "2026-04-25", actualDate: null, status: "terlambat", pemicuTermin: { fakturId: encodeInvTermin(9, 2026, 0), persen: 40 } }),
      m({ id: "ML-006-3", nama: "Asistensi & Penerbitan Pertek", urutan: 3, assignees: [], targetDate: "2026-05-30", actualDate: null, status: "belum_mulai", pemicuTermin: { fakturId: encodeInvTermin(9, 2026, 1), persen: 60 } }),
    ],
    createdAt: "2026-03-20T10:30:00.000Z",
  },
  {
    id: encodeProyekFromSph(13, 2026),
    nama: "UKL-UPL — PT Karya Logam (Proyek 2)",
    perusahaanId: seedPerusahaanId(3),
    perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    area: "Kawasan Industri SIER, Surabaya",
    tahun: 2026,
    layananNama: ["Dokumen UKL-UPL"],
    status: "on_track",
    nilaiKontrak: 49_050_000,
    sphId: encodeSph(13, 5, 2026),
    assignees: [
      { karyawanId: KRY4, nama: "Dewi Anggraini" },
    ],
    milestones: [
      m({ id: "ML-007-1", nama: "Pengumpulan Data", urutan: 1, assignees: [dewi], targetDate: "2026-05-25", actualDate: "2026-05-26", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-007-2", nama: "Penyusunan & Pengesahan UKL-UPL", urutan: 2, assignees: [dewi], targetDate: "2026-06-30", actualDate: null, status: "on_track", pemicuTermin: { fakturId: encodeInvTermin(13, 2026, 0), persen: 100 } }),
    ],
    createdAt: "2026-05-09T08:00:00.000Z",
  },
  {
    id: encodeProyekFromSph(18, 2026),
    nama: "UKL-UPL & Laporan RKL-RPL — PT Delta Pratama",
    perusahaanId: seedPerusahaanId(15),
    perusahaanNama: "PT Delta Pratama Nusantara",
    area: "Nongsa, Batam",
    tahun: 2026,
    layananNama: ["Dokumen UKL-UPL", "Laporan Pelaksanaan RKL-RPL Semester"],
    status: "on_track",
    nilaiKontrak: 76_300_000,
    sphId: encodeSph(18, 6, 2026),
    assignees: [
      { karyawanId: KRY8, nama: "Nadia Kusumawati" },
      { karyawanId: KRY3, nama: "Agus Setiawan" },
    ],
    milestones: [
      m({ id: "ML-008-1", nama: "Kickoff & Pengumpulan Data", urutan: 1, assignees: [nadia], targetDate: "2026-06-25", actualDate: null, status: "on_track", pemicuTermin: null }),
      m({ id: "ML-008-2", nama: "Penyusunan Dokumen UKL-UPL", urutan: 2, assignees: [agus, nadia], targetDate: "2026-07-25", actualDate: null, status: "belum_mulai", pemicuTermin: { fakturId: encodeInvTermin(18, 2026, 0), persen: 50 } }),
      m({ id: "ML-008-3", nama: "Pengesahan & Penyerahan", urutan: 3, assignees: [], targetDate: "2026-08-20", actualDate: null, status: "belum_mulai", pemicuTermin: { fakturId: encodeInvTermin(18, 2026, 1), persen: 50 } }),
    ],
    createdAt: "2026-06-17T09:00:00.000Z",
  },
  {
    id: encodeProyekFromSph(19, 2026),
    nama: "Pertek Emisi Udara — PT Nusantara Energi Prima",
    perusahaanId: seedPerusahaanId(7),
    perusahaanNama: "PT Nusantara Energi Prima",
    area: "Jakarta Selatan",
    tahun: 2026,
    layananNama: ["Persetujuan Teknis Emisi Udara"],
    status: "on_track",
    nilaiKontrak: 74_120_000,
    sphId: encodeSph(19, 5, 2026),
    assignees: [
      { karyawanId: KRY9, nama: "Rizky Firmansyah" },
    ],
    milestones: [
      m({ id: "ML-009-1", nama: "Survey Lokasi & Pengukuran Emisi", urutan: 1, assignees: [rizky], targetDate: "2026-05-20", actualDate: "2026-05-21", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-009-2", nama: "Penyusunan Dokumen Pertek", urutan: 2, assignees: [rizky], targetDate: "2026-06-15", actualDate: "2026-06-16", status: "selesai", pemicuTermin: { fakturId: encodeInvTermin(19, 2026, 0), persen: 40 } }),
      m({ id: "ML-009-3", nama: "Pengesahan Pertek Emisi Udara", urutan: 3, assignees: [], targetDate: "2026-07-15", actualDate: null, status: "on_track", pemicuTermin: { fakturId: encodeInvTermin(19, 2026, 1), persen: 60 } }),
    ],
    createdAt: "2026-05-09T11:00:00.000Z",
  },
  {
    id: encodeProyekFromSph(20, 2026),
    nama: "UKL-UPL — PT Rimba Lestari Kalimantan",
    perusahaanId: seedPerusahaanId(11),
    perusahaanNama: "PT Rimba Lestari Kalimantan",
    area: "Pontianak Kota",
    tahun: 2026,
    layananNama: ["Dokumen UKL-UPL"],
    status: "selesai",
    nilaiKontrak: 49_050_000,
    sphId: encodeSph(20, 4, 2026),
    assignees: [
      { karyawanId: KRY3, nama: "Agus Setiawan" },
      { karyawanId: KRY4, nama: "Dewi Anggraini" },
    ],
    milestones: [
      m({ id: "ML-010-1", nama: "Pengumpulan Data & Administrasi", urutan: 1, assignees: [dewi], targetDate: "2026-04-30", actualDate: "2026-04-29", status: "selesai", pemicuTermin: null }),
      m({ id: "ML-010-2", nama: "Penyusunan & Pengesahan UKL-UPL", urutan: 2, assignees: [agus], targetDate: "2026-05-20", actualDate: "2026-05-18", status: "selesai", pemicuTermin: { fakturId: encodeInvTermin(20, 2026, 0), persen: 100 } }),
    ],
    createdAt: "2026-04-26T08:00:00.000Z",
  },
];
