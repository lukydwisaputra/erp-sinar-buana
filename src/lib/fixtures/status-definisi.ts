import type { StatusDefinisi } from "@/lib/schemas/status-definisi";

function d(docType: StatusDefinisi["docType"], id: string, label: string, urutan: number, role: StatusDefinisi["role"]): StatusDefinisi {
  return { id, docType, label, urutan, aktif: true, locked: true, role };
}

/** One row per existing enum value, role pre-set to match today's actual
 * automation-relevant semantics — zero behavior change on first load. */
export const statusDefinisiFixtures: StatusDefinisi[] = [
  // Penawaran (sphStatus)
  d("penawaran", "draft", "Draf", 1, null),
  d("penawaran", "terkirim", "Terkirim", 2, null),
  d("penawaran", "deal", "Deal", 3, null), // SPH-specific business trigger (creates Proyek+Faktur set), not one of the 4 system roles
  d("penawaran", "ditolak", "Ditolak", 4, null),
  d("penawaran", "dibatalkan", "Dibatalkan", 5, "BATAL"),
  // Proyek (proyekStatus)
  d("proyek", "belum_mulai", "Belum Mulai", 1, null),
  d("proyek", "on_track", "Sedang Berjalan", 2, null),
  d("proyek", "terlambat", "Terlambat", 3, null),
  d("proyek", "selesai", "Selesai", 4, "SELESAI"),
  d("proyek", "dibatalkan", "Dibatalkan", 5, "BATAL"),
  // Milestone (milestoneStatus) — no dibatalkan
  d("milestone", "belum_mulai", "Belum Mulai", 1, null),
  d("milestone", "on_track", "Sedang Berjalan", 2, null),
  d("milestone", "terlambat", "Terlambat", 3, null),
  d("milestone", "selesai", "Selesai", 4, "SELESAI"),
  // Faktur (fakturStatus)
  d("faktur", "draft", "Draf", 1, null),
  d("faktur", "terkirim", "Terkirim", 2, null),
  d("faktur", "lunas", "Lunas", 3, "LUNAS"),
  d("faktur", "dibatalkan", "Dibatalkan", 4, "BATAL"),
  // Penggajian slip (slipStatus)
  d("penggajian", "menunggu_pembayaran", "Menunggu Pembayaran", 1, null),
  d("penggajian", "sudah_dibayar", "Sudah Dibayar", 2, "DIBAYAR"),
];
