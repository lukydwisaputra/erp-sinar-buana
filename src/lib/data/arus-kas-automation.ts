import { arusKasFixtures, bumpSeq } from "@/lib/fixtures/arus-kas";
import { penggajianFixtures } from "@/lib/fixtures/penggajian";
import { arusKasEntrySchema, type ArusKasEntry } from "@/lib/schemas/arus-kas";
import { calcSlip, type SlipGaji } from "@/lib/schemas/penggajian";

/**
 * Penggajian-only Arus Kas simulation (Faktur's own posting is now handled
 * by the real `fn_installment_after_change` DB trigger — see the Faktur
 * plan — so `postArusKasForFakturLunas` was retired along with the rest of
 * `src/lib/data/faktur.ts`). Penggajian is still fully mock, so this keeps
 * simulating its own "gaji dibayar" postings into `arusKasFixtures` for
 * internal consistency, even though nothing in the app reads that array for
 * display anymore (Arus Kas's list page now reads real `cashflow_entries`).
 */

function push(entry: Omit<ArusKasEntry, "id">): void {
  const id = `AKS-${String(bumpSeq()).padStart(4, "0")}`;
  arusKasFixtures.push(arusKasEntrySchema.parse({ ...entry, id }));
}

// Idempotency guard — never double-post for the same slip (e.g. double-
// clicking "Tandai Dibayar"). Tracked as an in-memory Set rather than
// scanning arusKasFixtures by referensiId: penggajian entries intentionally
// share one referensiId per batch, so a referensiId-based scan would treat
// the second slip's payment as already posted. Per-slip uniqueness is
// tracked here instead.
const postedSlipKeys = new Set<string>(); // `${batchId}:${slipId}`

export function postArusKasForSlipDibayar(batchId: string, slip: SlipGaji): void {
  const key = `${batchId}:${slip.id}`;
  if (postedSlipKeys.has(key)) return;
  const { penggajianBersih } = calcSlip(slip);
  push({
    jenis: "debit", tanggal: slip.paidAt?.split("T")[0] ?? new Date().toISOString().slice(0, 10),
    jumlah: penggajianBersih, kategori: "Penggajian", sumber: "penggajian",
    keterangan: `Gaji ${slip.karyawanNama} — ${batchId}`, proyekId: null, locked: true, isCancelled: false,
  });
  postedSlipKeys.add(key);
}

// Seed Arus Kas entries for every already-"sudah_dibayar" fixture row at
// module load time, through the exact same function the live status
// mutation calls — so seed-time and runtime are provably the same code path.
for (const batch of penggajianFixtures) {
  for (const slip of batch.slips) {
    if (slip.status === "sudah_dibayar") postArusKasForSlipDibayar(batch.id, slip);
  }
}
