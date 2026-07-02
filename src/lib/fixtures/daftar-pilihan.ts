import type { OptionItem } from "@/lib/schemas/daftar-pilihan";

let seq = 0;
function item(kategori: OptionItem["kategori"], nama: string, urutan: number, extra: OptionItem["extra"] = {}): OptionItem {
  return { id: `OPT-${String(++seq).padStart(4, "0")}`, kategori, nama, urutan, aktif: true, locked: false, extra, createdAt: "2026-01-01T00:00:00.000Z" };
}

const JABATAN = [
  "Direktur", "Manajer Keuangan", "Ketua Tim Teknis", "Anggota Tim Teknis", "Pengendali Dokumen",
  "Staf Marketing", "Ahli AMDAL Senior", "Staf Lingkungan", "Insinyur Teknik", "Staf Administrasi",
  "Ahli K3", "Staf GIS", "Senior Konsultan", "Staf Penelitian", "Analis Lingkungan",
  "Admin Keuangan", "Drafter", "Petugas Lapangan", "Staf Legal", "Konsultan Junior",
];

export const daftarPilihanFixtures: OptionItem[] = [
  // jenis_dokumen — union of the hardcoded katalog/page.tsx list AND every already-used value in fixtures/katalog.ts
  ...["Pertek", "AMDAL", "UKL-UPL", "SPPL", "Laporan", "RKL-RPL", "Kajian", "Audit", "DELH"].map((n, i) => item("jenis_dokumen", n, i + 1)),
  ...["Pusat (KLHK)", "Provinsi", "Kabupaten/Kota", "Kawasan Industri"].map((n, i) => item("kewenangan", n, i + 1)),
  ...["PermenLHK No. 5 Tahun 2021", "PP No. 22 Tahun 2021", "PermenLHK No. 11 Tahun 2021"].map((n, i) => item("dasar_hukum", n, i + 1)),
  ...["Kawasan Industri MM2100", "Kawasan Industri Jababeka", "Luar Kawasan"].map((n, i) => item("area_kawasan", n, i + 1)),
  ...JABATAN.map((n, i) => item("jabatan", n, i + 1)),
  item("status_kepegawaian", "Tetap", 1, { pengali: 1.0 }),
  item("status_kepegawaian", "Kontrak", 2, { pengali: 1.0 }),
  item("status_kepegawaian", "Probation", 3, { pengali: 0.8 }),
  item("komponen_gaji", "Tunjangan", 1, { calcMethod: "nominal_tetap" }),
  item("komponen_gaji", "Lembur", 2, { calcMethod: "manual" }),
  item("komponen_gaji", "Bonus", 3, { calcMethod: "manual" }),
  item("komponen_gaji", "PPh 21", 4, { calcMethod: "persen_gaji_pokok" }),
  item("komponen_gaji", "Potongan BPJS", 5, { calcMethod: "persen_gaji_pokok" }),
  item("rekening_bank", "Rekening Operasional Utama", 1, { bank: { nama: "BCA", atasNama: "PT Sinar Buana Mandiri Jaya", nomor: "1234567890" } }),
];
