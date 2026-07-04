import type { PenggajianBatch } from "@/lib/schemas/penggajian";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";

function kryHash(karyawanId: string) {
  return karyawanId.replace("KRY-", "");
}

function makeSlip(
  karyawanSeq: number,
  batchId: string,
  kIdx: number,
  overrides: {
    lembur?: number; bonus?: number; pph21?: number; bpjsPotongan?: number;
    status?: "menunggu_pembayaran" | "sudah_dibayar"; paidAt?: string | null;
  } = {},
) {
  const k = karyawanFixtures[kIdx];
  return {
    id: `SLP-${kryHash(k.id)}-${String(karyawanSeq).padStart(3, "0")}`,
    batchId,
    karyawanId: k.id,
    karyawanNama: k.nama,
    jabatan: k.jabatan,
    // The fixture roster still uses the historical tetap/kontrak/probation
    // labels; the real Karyawan type widened this field to `string` once
    // status_kepegawaian became a client-managed Daftar Pilihan list.
    statusKepegawaian: k.statusKepegawaian as "tetap" | "kontrak" | "probation",
    pengali: k.pengali,
    gajiPokok: k.gajiPokok,
    tunjangan: k.tunjangan,
    lembur: overrides.lembur ?? 0,
    bonus: overrides.bonus ?? 0,
    pph21: overrides.pph21 ?? 0,
    bpjsPotongan: overrides.bpjsPotongan ?? 0,
    bankNama: k.bank.nama ?? "",
    bankNomor: k.bank.nomor ?? "",
    bankAtasNama: k.bank.atasNama ?? "",
    status: overrides.status ?? ("menunggu_pembayaran" as const),
    paidAt: overrides.paidAt ?? null,
  };
}

export const penggajianFixtures: PenggajianBatch[] = [
  {
    id: "GAJ-001",
    periode: { mulai: "2026-03-24", selesai: "2026-04-24" },
    tanggalBayar: "2026-04-25",
    createdAt: "2026-04-25T08:00:00.000Z",
    slips: [
      // kIdx 0 = Budi Santoso — slip ke-1
      makeSlip(1, "GAJ-001", 0, { pph21: 1_500_000, bpjsPotongan: 250_000, status: "sudah_dibayar", paidAt: "2026-04-25T09:00:00.000Z" }),
      // kIdx 1 = Rina Marlina — slip ke-1
      makeSlip(1, "GAJ-001", 1, { pph21: 500_000, bpjsPotongan: 140_000, status: "sudah_dibayar", paidAt: "2026-04-25T09:05:00.000Z" }),
      // kIdx 2 = Agus Setiawan — slip ke-1
      makeSlip(1, "GAJ-001", 2, { pph21: 300_000, bpjsPotongan: 120_000 }),
      // kIdx 3 = Dewi Anggraini — slip ke-1
      makeSlip(1, "GAJ-001", 3, { lembur: 500_000, bpjsPotongan: 85_000 }),
      // kIdx 4 = Fajar Ramadhan — slip ke-1
      makeSlip(1, "GAJ-001", 4, {}),
    ],
  },
  {
    id: "GAJ-002",
    periode: { mulai: "2026-04-24", selesai: "2026-05-24" },
    tanggalBayar: "2026-05-25",
    createdAt: "2026-05-25T08:00:00.000Z",
    slips: [
      // kIdx 0 = Budi Santoso — slip ke-2 (bulan kedua)
      makeSlip(2, "GAJ-002", 0, { pph21: 1_500_000, bpjsPotongan: 250_000, status: "sudah_dibayar", paidAt: "2026-05-25T09:00:00.000Z" }),
      // kIdx 1 = Rina Marlina — slip ke-2
      makeSlip(2, "GAJ-002", 1, { pph21: 500_000, bpjsPotongan: 140_000 }),
      // kIdx 2 = Agus Setiawan — slip ke-2
      makeSlip(2, "GAJ-002", 2, { pph21: 300_000, bpjsPotongan: 120_000 }),
    ],
  },
];
