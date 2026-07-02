import type { Template } from "@/lib/schemas/template";

let seq = 0;
const nextId = () => `TPL-${String(++seq).padStart(4, "0")}`;

export const templateFixtures: Template[] = [
  {
    id: nextId(), jenis: "milestone", nama: "Pertek 5 Tahap", jenisLayananTerkait: "Pertek",
    aktif: true, pdfMeta: null, terminSteps: [],
    milestoneSteps: [
      { nama: "Pengumpulan Data Lapangan", urutan: 1 },
      { nama: "Penyusunan Draf Dokumen", urutan: 2 },
      { nama: "Review Internal", urutan: 3 },
      { nama: "Pengajuan ke Instansi", urutan: 4 },
      { nama: "Persetujuan Teknis Terbit", urutan: 5 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: nextId(), jenis: "milestone", nama: "AMDAL Lengkap", jenisLayananTerkait: "AMDAL",
    aktif: true, pdfMeta: null, terminSteps: [],
    milestoneSteps: [
      { nama: "Kick-off & Pengumpulan Data Rona Awal", urutan: 1 },
      { nama: "Penyusunan KA-ANDAL", urutan: 2 },
      { nama: "Sidang Komisi Penilai KA-ANDAL", urutan: 3 },
      { nama: "Penyusunan ANDAL & RKL-RPL", urutan: 4 },
      { nama: "Sidang Komisi Penilai ANDAL", urutan: 5 },
      { nama: "Perbaikan Dokumen Pasca Sidang", urutan: 6 },
      { nama: "Penerbitan Persetujuan Lingkungan", urutan: 7 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: nextId(), jenis: "milestone", nama: "UKL-UPL Standar", jenisLayananTerkait: "UKL-UPL",
    aktif: true, pdfMeta: null, terminSteps: [],
    milestoneSteps: [
      { nama: "Survei & Pengumpulan Data", urutan: 1 },
      { nama: "Penyusunan Draf UKL-UPL", urutan: 2 },
      { nama: "Pemeriksaan Instansi Lingkungan", urutan: 3 },
      { nama: "Penerbitan Rekomendasi UKL-UPL", urutan: 4 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: nextId(), jenis: "termin", nama: "Termin 3 Tahap Standar", jenisLayananTerkait: null,
    aktif: true, pdfMeta: null, milestoneSteps: [],
    terminSteps: [
      { label: "Termin I — Uang Muka", persen: 30, pemicu: "Kontrak ditandatangani" },
      { label: "Termin II — Progres", persen: 40, pemicu: "Draf dokumen selesai" },
      { label: "Termin III — Pelunasan", persen: 30, pemicu: "Dokumen terbit" },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: nextId(), jenis: "pdf", nama: "Template Invoice Standar", jenisLayananTerkait: null,
    aktif: true, milestoneSteps: [], terminSteps: [],
    pdfMeta: {
      headerNote: "Mohon melakukan pembayaran sesuai nomor rekening yang tercantum.",
      footerNote: "Terima kasih atas kepercayaan Anda kepada PT Sinar Buana Mandiri Jaya.",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];
