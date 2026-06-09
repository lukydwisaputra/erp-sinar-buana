export type RabRow = { uraian: string; vol: number; satuan: string; hargaSatuan: number };

export type RabTemplate = {
  personil: RabRow[];   // A. Rincian Biaya Personil (satuan "Bln")
  langsung: RabRow[];   // B. Rincian Biaya Langsung (satuan "Ls")
};

/** Standard per-service RAB (matches the real SBMJ doc: A=27jt, B=13jt, total=40jt). */
export const rabTemplate: RabTemplate = {
  personil: [
    { uraian: "Ketua Tim Penyusun", vol: 3, satuan: "Bln", hargaSatuan: 4_000_000 },
    { uraian: "Anggota Tim Penyusun", vol: 3, satuan: "Bln", hargaSatuan: 2_500_000 },
    { uraian: "Document Controller", vol: 3, satuan: "Bln", hargaSatuan: 2_500_000 },
  ],
  langsung: [
    { uraian: "Tunjangan Lapangan — Ketua Tim Penyusun", vol: 1, satuan: "Ls", hargaSatuan: 1_000_000 },
    { uraian: "Tunjangan Lapangan — Asisten Tim Penyusun", vol: 1, satuan: "Ls", hargaSatuan: 500_000 },
    { uraian: "Survey Lapangan", vol: 1, satuan: "Ls", hargaSatuan: 1_000_000 },
    { uraian: "Biaya Penyusunan Dokumen", vol: 1, satuan: "Ls", hargaSatuan: 6_000_000 },
    { uraian: "Biaya Cetak Dokumen", vol: 1, satuan: "Ls", hargaSatuan: 2_000_000 },
    { uraian: "Biaya Komunikasi", vol: 1, satuan: "Ls", hargaSatuan: 500_000 },
    { uraian: "Transportasi dan Akomodasi", vol: 1, satuan: "Ls", hargaSatuan: 2_000_000 },
  ],
};

export function rabRowTotal(r: RabRow): number { return r.vol * r.hargaSatuan; }
export function rabPersonilTotal(t: RabTemplate): number { return t.personil.reduce((s, r) => s + rabRowTotal(r), 0); }
export function rabLangsungTotal(t: RabTemplate): number { return t.langsung.reduce((s, r) => s + rabRowTotal(r), 0); }
export function rabGrandTotal(t: RabTemplate): number { return rabPersonilTotal(t) + rabLangsungTotal(t); }

/** Estimasi Jadwal: 12 standard activities × 12 weeks (3 bulan × 4 minggu). */
export const JADWAL_ACTIVITIES_BASE = [
  "Survey Lokasi",
  "Pengumpulan Data dan Berkas Administrasi",
  "Penyusunan Dokumen",
  "Rapat Internal Awal",
  "Penyelesaian Draft Dokumen dan Gambar",
  "Asistensi dengan Pihak LH",
  "Revisi Dokumen",
  "Finalisasi Dokumen",
  "Pengumpulan Dokumen Final ke LH",
  "Pembahasan Dokumen dengan LH",
  "Revisi Akhir Dokumen",
] as const;

/** Returns 12 activity labels (last = "Penerbitan {service}") + a highlight plan: for each
 * activity (row), the set of 1-based week numbers (1..12) that are shaded. A staircase Gantt. */
export function jadwalTemplate(serviceName: string): { kegiatan: string[]; highlights: number[][] } {
  const kegiatan = [...JADWAL_ACTIVITIES_BASE, `Penerbitan ${serviceName}`];
  const highlights: number[][] = [
    [1], [2], [3, 4], [5], [6], [7], [8], [9], [10], [11], [12], [12],
  ];
  return { kegiatan, highlights };
}

/** Fresh per-item RAB for a NEW service — starts EMPTY (user adds rows). */
export function defaultItemRab(): { personil: RabRow[]; langsung: RabRow[] } {
  return { personil: [], langsung: [] };
}

/** Fresh per-item Estimasi Jadwal for a NEW service — starts EMPTY, one month. */
export function defaultItemJadwal(
  _serviceName?: string,
): { kegiatan: string[]; highlights: number[][]; bulan: number } {
  return { kegiatan: [], highlights: [], bulan: 1 };
}

/** Filled sample RAB (the old standard template) — used to seed demo fixtures. */
export function sampleItemRab(): { personil: RabRow[]; langsung: RabRow[] } {
  return {
    personil: rabTemplate.personil.map((r) => ({ ...r })),
    langsung: rabTemplate.langsung.map((r) => ({ ...r })),
  };
}

/** Filled sample Estimasi Jadwal (old 12-week template) over 3 months — for demo fixtures. */
export function sampleItemJadwal(
  serviceName: string,
): { kegiatan: string[]; highlights: number[][]; bulan: number } {
  return { ...jadwalTemplate(serviceName), bulan: 3 };
}
