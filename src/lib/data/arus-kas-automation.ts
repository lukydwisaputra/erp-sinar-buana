import { arusKasFixtures, bumpSeq } from "@/lib/fixtures/arus-kas";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { penggajianFixtures } from "@/lib/fixtures/penggajian";
import { arusKasEntrySchema, type ArusKasEntry } from "@/lib/schemas/arus-kas";
import { computeFaktur } from "@/lib/faktur";
import { calcSlip, type SlipGaji } from "@/lib/schemas/penggajian";
import type { Faktur } from "@/lib/schemas/faktur";

/**
 * Shared Arus Kas posting logic — imported by both the fixture-seed generator
 * (src/lib/fixtures/arus-kas.ts, for the historical fixture rows already
 * "lunas"/"sudah_dibayar" at load time) and the live status-mutation paths in
 * src/lib/data/faktur.ts / penggajian.ts, so seed-time and runtime can never
 * drift into two different implementations of the same rule again.
 */

function push(entry: Omit<ArusKasEntry, "id">): void {
  const id = `AKS-${String(bumpSeq()).padStart(4, "0")}`;
  arusKasFixtures.push(arusKasEntrySchema.parse({ ...entry, id }));
}

// Idempotency guards — never double-post for the same faktur/slip (e.g.
// re-saving an already-lunas invoice, or double-clicking "Tandai Dibayar").
// Tracked as in-memory Sets rather than scanning arusKasFixtures by
// referensiId: penggajian entries intentionally keep `referensiId = batchId`
// (the Arus Kas page links "/penggajian/${referensiId}", which expects a
// batch id, not a per-slip key) — so multiple slips in the same batch share
// one referensiId, and a referensiId-based scan would treat the second slip's
// payment as already posted. Per-slip uniqueness is tracked here instead.
const postedFakturIds = new Set<string>();
const postedSlipKeys = new Set<string>(); // `${batchId}:${slipId}`

export function postArusKasForFakturLunas(f: Faktur): void {
  if (postedFakturIds.has(f.id)) return;
  const totals = computeFaktur(f);
  const tanggal = f.tanggalBayar || f.tanggal;
  push({
    jenis: "kredit", tanggal, jumlah: totals.nilaiTermin, kategori: "faktur", sumber: "otomatis_faktur",
    keterangan: `Pendapatan jasa — ${f.perusahaanNama}`, referensiId: f.id, referensiLabel: f.id, locked: true,
  });
  if (totals.ppn > 0) {
    push({
      jenis: "kredit", tanggal, jumlah: totals.ppn, kategori: "pajak", sumber: "otomatis_faktur",
      keterangan: `PPN Keluaran — ${f.perusahaanNama}`, referensiId: f.id, referensiLabel: f.id, locked: true,
    });
  }
  if (totals.pph23 > 0) {
    push({
      jenis: "debit", tanggal, jumlah: totals.pph23, kategori: "pajak", sumber: "otomatis_faktur",
      keterangan: `PPh 23 dipotong — ${f.perusahaanNama}`, referensiId: f.id, referensiLabel: f.id, locked: true,
    });
  }
  postedFakturIds.add(f.id);
}

export function postArusKasForSlipDibayar(batchId: string, slip: SlipGaji): void {
  const key = `${batchId}:${slip.id}`;
  if (postedSlipKeys.has(key)) return;
  const { penggajianBersih } = calcSlip(slip);
  push({
    jenis: "debit", tanggal: slip.paidAt?.split("T")[0] ?? new Date().toISOString().slice(0, 10),
    jumlah: penggajianBersih, kategori: "penggajian", sumber: "otomatis_penggajian",
    keterangan: `Gaji ${slip.karyawanNama} — ${batchId}`, referensiId: batchId, referensiLabel: batchId, locked: true,
  });
  postedSlipKeys.add(key);
}

// Seed Arus Kas entries for every already-"lunas"/"sudah_dibayar" fixture row
// at module load time, through the exact same functions the live status
// mutations call — so seed-time and runtime are provably the same code path.
// Every data-layer module that reads arusKasFixtures (listArusKas, faktur.ts,
// penggajian.ts, the dasbor orchestrators) imports this module, which
// guarantees this seeding runs before arusKasFixtures is read.
for (const f of fakturFixtures) {
  if (f.status === "lunas") postArusKasForFakturLunas(f);
}
for (const batch of penggajianFixtures) {
  for (const slip of batch.slips) {
    if (slip.status === "sudah_dibayar") postArusKasForSlipDibayar(batch.id, slip);
  }
}
