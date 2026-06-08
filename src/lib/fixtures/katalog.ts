import type { Layanan } from "@/lib/schemas/katalog";

export const katalogFixtures: Layanan[] = [
  { id: "LYN-001", nama: "Penyusunan Pertek Air Limbah", jenisDokumen: "Pertek", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 75_000_000, tags: ["Air Limbah"], templateMilestone: "Pertek 5 Tahap", status: "aktif", metrik: { dipakaiSPH: 12, dipakaiProyek: 7 } },
  { id: "LYN-002", nama: "Dokumen AMDAL", jenisDokumen: "AMDAL", kewenangan: "Pusat (KLHK)", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 350_000_000, tags: ["AMDAL", "Kajian Besar"], templateMilestone: "AMDAL Lengkap", status: "aktif", metrik: { dipakaiSPH: 4, dipakaiProyek: 2 } },
  { id: "LYN-003", nama: "Dokumen UKL-UPL", jenisDokumen: "UKL-UPL", kewenangan: "Kabupaten/Kota", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 45_000_000, tags: [], templateMilestone: "UKL-UPL Standar", status: "aktif", metrik: { dipakaiSPH: 18, dipakaiProyek: 11 } },
  { id: "LYN-004", nama: "Laporan Pelaksanaan RKL-RPL Semester", jenisDokumen: "Laporan", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 25_000_000, tags: ["Laporan Semester", "Berulang"], templateMilestone: null, status: "aktif", metrik: { dipakaiSPH: 22, dipakaiProyek: 14 } },
  { id: "LYN-005", nama: "Persetujuan Teknis Emisi Udara", jenisDokumen: "Pertek", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 11 Tahun 2021", hargaStandar: 68_000_000, tags: ["Emisi Udara"], templateMilestone: "Pertek 5 Tahap", status: "aktif", metrik: { dipakaiSPH: 6, dipakaiProyek: 3 } },
  { id: "LYN-006", nama: "Penyusunan SPPL", jenisDokumen: "SPPL", kewenangan: "Kabupaten/Kota", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: null, tags: [], templateMilestone: null, status: "terarsip", metrik: { dipakaiSPH: 2, dipakaiProyek: 1 } },
];
