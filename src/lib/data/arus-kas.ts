import { delay } from "@/lib/data/_delay";
import { arusKasFixtures, bumpSeq } from "@/lib/fixtures/arus-kas";
import { arusKasEntrySchema, type ArusKasEntry, type ArusKasFormValues } from "@/lib/schemas/arus-kas";
// Side-effect import: seeds arusKasFixtures with rows for every already-lunas/
// already-dibayar faktur and penggajian slip. Must be imported wherever
// arusKasFixtures is read, since fixtures/arus-kas.ts itself no longer does
// this seeding (kept automation-agnostic to avoid a require-cycle).
import "@/lib/data/arus-kas-automation";

export async function listArusKas(): Promise<ArusKasEntry[]> {
  await delay();
  return arusKasEntrySchema.array().parse(arusKasFixtures);
}

export async function createArusKas(input: ArusKasFormValues): Promise<ArusKasEntry> {
  await delay(400);
  const id = `AKS-${String(bumpSeq()).padStart(4, "0")}`;
  const entry: ArusKasEntry = {
    id,
    jenis: input.jenis,
    tanggal: input.tanggal,
    jumlah: input.jumlah,
    kategori: input.kategori,
    sumber: "manual",
    keterangan: input.keterangan,
    proyekId: input.proyekId,
    locked: false,
  };
  arusKasFixtures.push(arusKasEntrySchema.parse(entry));
  return arusKasEntrySchema.parse(entry);
}

export async function removeArusKas(id: string): Promise<void> {
  await delay(300);
  const idx = arusKasFixtures.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error(`Entry ${id} tidak ditemukan.`);
  if (arusKasFixtures[idx].locked) throw new Error("Entri otomatis terkunci — ubah melalui dokumen sumber.");
  arusKasFixtures.splice(idx, 1);
}
