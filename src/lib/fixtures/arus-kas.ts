import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { penggajianFixtures } from "@/lib/fixtures/penggajian";
import { computeFaktur } from "@/lib/faktur";
import { calcSlip } from "@/lib/schemas/penggajian";

let seq = 0;
function nextId(): string {
  return `AKS-${String(++seq).padStart(4, "0")}`;
}

function generateFromFaktur(): ArusKasEntry[] {
  const entries: ArusKasEntry[] = [];
  for (const f of fakturFixtures) {
    if (f.status !== "lunas") continue;
    const totals = computeFaktur(f);
    const tanggal = f.tanggalBayar || f.tanggal;
    // 1. Pendapatan jasa (Kredit, kategori faktur)
    entries.push({
      id: nextId(), jenis: "kredit", tanggal, jumlah: totals.nilaiTermin,
      kategori: "faktur", sumber: "otomatis_faktur",
      keterangan: `Pendapatan jasa — ${f.perusahaanNama}`,
      referensiId: f.id, referensiLabel: f.id, locked: true,
    });
    // 2. PPN Keluaran (Kredit, kategori pajak)
    if (totals.ppn > 0) {
      entries.push({
        id: nextId(), jenis: "kredit", tanggal, jumlah: totals.ppn,
        kategori: "pajak", sumber: "otomatis_faktur",
        keterangan: `PPN Keluaran — ${f.perusahaanNama}`,
        referensiId: f.id, referensiLabel: f.id, locked: true,
      });
    }
    // 3. PPh 23 dipotong (Debit/pengurang, kategori pajak)
    if (totals.pph23 > 0) {
      entries.push({
        id: nextId(), jenis: "debit", tanggal, jumlah: totals.pph23,
        kategori: "pajak", sumber: "otomatis_faktur",
        keterangan: `PPh 23 dipotong — ${f.perusahaanNama}`,
        referensiId: f.id, referensiLabel: f.id, locked: true,
      });
    }
  }
  return entries;
}

function generateFromPenggajian(): ArusKasEntry[] {
  const entries: ArusKasEntry[] = [];
  for (const batch of penggajianFixtures) {
    for (const slip of batch.slips) {
      if (slip.status !== "sudah_dibayar") continue;
      const { penggajianBersih } = calcSlip(slip);
      entries.push({
        id: nextId(), jenis: "debit",
        tanggal: slip.paidAt?.split("T")[0] ?? batch.createdAt.split("T")[0],
        jumlah: penggajianBersih, kategori: "penggajian", sumber: "otomatis_penggajian",
        keterangan: `Gaji ${slip.karyawanNama} — ${batch.id}`,
        referensiId: batch.id, referensiLabel: batch.id, locked: true,
      });
    }
  }
  return entries;
}

const manualEntries: ArusKasEntry[] = [
  {
    id: nextId(), jenis: "debit", tanggal: "2026-04-05", jumlah: 8_500_000,
    kategori: "Sewa Kantor", sumber: "manual",
    keterangan: "Sewa kantor bulan April", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-04-10", jumlah: 2_750_000,
    kategori: "Utilitas", sumber: "manual",
    keterangan: "Listrik & internet bulan April", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-04-18", jumlah: 1_200_000,
    kategori: "Transport", sumber: "manual",
    keterangan: "Transport operasional", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-05-03", jumlah: 850_000,
    kategori: "ATK", sumber: "manual",
    keterangan: "ATK & perlengkapan kantor", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-05-12", jumlah: 3_500_000,
    kategori: "Administrasi", sumber: "manual",
    keterangan: "Biaya notaris akta perusahaan", locked: false,
  },
  {
    id: nextId(), jenis: "kredit", tanggal: "2026-05-20", jumlah: 5_000_000,
    kategori: "Deposit", sumber: "manual",
    keterangan: "Pengembalian deposit sewa alat", locked: false,
  },
];

// Build the full fixtures array — automated first, then manual.
// NOTE: manualEntries are defined as const above (nextId() was already called
// at module load time), but generateFromFaktur/generateFromPenggajian run
// lazily. We call them immediately so IDs are sequential.
const fakturEntries = generateFromFaktur();
const penggajianEntries = generateFromPenggajian();

export const arusKasFixtures: ArusKasEntry[] = [
  ...fakturEntries,
  ...penggajianEntries,
  ...manualEntries,
];

export function bumpSeq(): number { return ++seq; }
