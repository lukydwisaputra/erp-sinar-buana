import type { PenggajianBatch } from "@/lib/schemas/penggajian";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";

function makeSlip(
  slipNum: number,
  batchId: string,
  kIdx: number,
  overrides: {
    lembur?: number; bonus?: number; pph21?: number; bpjsPotongan?: number;
    status?: "menunggu_pembayaran" | "sudah_dibayar"; paidAt?: string | null;
  } = {},
) {
  const k = karyawanFixtures[kIdx];
  return {
    id: `SLP-${String(slipNum).padStart(3, "0")}`,
    batchId,
    karyawanId: k.id,
    karyawanNama: k.nama,
    jabatan: k.jabatan,
    statusKepegawaian: k.statusKepegawaian,
    pengali: k.pengali,
    gajiPokok: k.gajiPokok,
    tunjangan: k.tunjangan,
    lembur: overrides.lembur ?? 0,
    bonus: overrides.bonus ?? 0,
    pph21: overrides.pph21 ?? 0,
    bpjsPotongan: overrides.bpjsPotongan ?? 0,
    bankNama: k.bank.nama,
    bankNomor: k.bank.nomor,
    bankAtasNama: k.bank.atasNama,
    status: overrides.status ?? ("menunggu_pembayaran" as const),
    paidAt: overrides.paidAt ?? null,
  };
}

export let penggajianFixtures: PenggajianBatch[] = [
  {
    id: "GAJ-001",
    periode: { mulai: "2026-03-24", selesai: "2026-04-24" },
    createdAt: "2026-04-25T08:00:00.000Z",
    slips: [
      // kIdx 0 = Budi Santoso (Direktur, tetap, 25jt)
      makeSlip(1, "GAJ-001", 0, { pph21: 1_500_000, bpjsPotongan: 250_000, status: "sudah_dibayar", paidAt: "2026-04-25T09:00:00.000Z" }),
      // kIdx 1 = Rina Marlina (Manajer Keuangan, tetap, 14jt)
      makeSlip(2, "GAJ-001", 1, { pph21: 500_000, bpjsPotongan: 140_000, status: "sudah_dibayar", paidAt: "2026-04-25T09:05:00.000Z" }),
      // kIdx 2 = Agus Setiawan (Ketua Tim Teknis, tetap, 12jt)
      makeSlip(3, "GAJ-001", 2, { pph21: 300_000, bpjsPotongan: 120_000 }),
      // kIdx 3 = Dewi Anggraini (Anggota Tim Teknis, kontrak, 8.5jt)
      makeSlip(4, "GAJ-001", 3, { lembur: 500_000, bpjsPotongan: 85_000 }),
      // kIdx 4 = Fajar Ramadhan (Pengendali Dokumen, probation, 0.8x, 6.5jt)
      makeSlip(5, "GAJ-001", 4, {}),
    ],
  },
  {
    id: "GAJ-002",
    periode: { mulai: "2026-04-24", selesai: "2026-05-24" },
    createdAt: "2026-05-25T08:00:00.000Z",
    slips: [
      // kIdx 6 = Hendra Permana (Ahli AMDAL Senior, tetap, 18jt)
      makeSlip(6, "GAJ-002", 6, { pph21: 800_000, bpjsPotongan: 180_000 }),
      // kIdx 8 = Rizky Firmansyah (Insinyur Teknik, tetap, 13jt)
      makeSlip(7, "GAJ-002", 8, { bpjsPotongan: 130_000 }),
      // kIdx 9 = Yuli Astuti (Staf Administrasi, probation, 0.8x, 5.5jt)
      makeSlip(8, "GAJ-002", 9, {}),
    ],
  },
];
