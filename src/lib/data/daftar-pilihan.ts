import { delay } from "@/lib/data/_delay";
import { daftarPilihanFixtures } from "@/lib/fixtures/daftar-pilihan";
import { optionItemSchema, type OptionItem, type DaftarPilihanKategori, type OptionExtra } from "@/lib/schemas/daftar-pilihan";

let _seq = daftarPilihanFixtures.length;

export async function listOptions(kategori: DaftarPilihanKategori, opts: { includeInactive?: boolean } = {}): Promise<OptionItem[]> {
  await delay();
  const rows = daftarPilihanFixtures
    .filter((o) => o.kategori === kategori && (opts.includeInactive || o.aktif))
    .sort((a, b) => a.urutan - b.urutan);
  return optionItemSchema.array().parse(rows);
}

export async function createOption(kategori: DaftarPilihanKategori, nama: string, extra: OptionExtra = {}): Promise<OptionItem> {
  await delay(300);
  const trimmed = nama.trim();
  if (!trimmed) throw new Error("Nama wajib diisi.");
  if (daftarPilihanFixtures.some((o) => o.kategori === kategori && o.nama.toLowerCase() === trimmed.toLowerCase()))
    throw new Error("Item dengan nama ini sudah ada."); // VR-00.1
  const siblingMax = Math.max(0, ...daftarPilihanFixtures.filter((o) => o.kategori === kategori).map((o) => o.urutan));
  const entry = optionItemSchema.parse({
    id: `OPT-${String(++_seq).padStart(4, "0")}`, kategori, nama: trimmed, urutan: siblingMax + 1,
    aktif: true, locked: false, extra, createdAt: new Date().toISOString(),
  });
  daftarPilihanFixtures.push(entry);
  return entry;
}

export async function updateOption(id: string, patch: Partial<Pick<OptionItem, "nama" | "aktif" | "extra">>): Promise<OptionItem> {
  await delay(300);
  const idx = daftarPilihanFixtures.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error(`Item ${id} tidak ditemukan.`);
  if (daftarPilihanFixtures[idx].locked && patch.nama !== undefined)
    throw new Error("Item terkunci tidak dapat diganti nama.");
  daftarPilihanFixtures[idx] = { ...daftarPilihanFixtures[idx], ...patch };
  return optionItemSchema.parse(daftarPilihanFixtures[idx]);
}

/** FR-00.9: this is a hard delete for never-used custom items only; deactivating
 * (aktif:false via updateOption) is the normal path for retiring an in-use option
 * without breaking historical data. */
export async function deleteOption(id: string): Promise<void> {
  await delay(300);
  const idx = daftarPilihanFixtures.findIndex((o) => o.id === id);
  if (idx === -1) return;
  if (daftarPilihanFixtures[idx].locked) throw new Error("Item terkunci tidak dapat dihapus.");
  daftarPilihanFixtures.splice(idx, 1);
}

/** Reuses the exact swap-adjacent-urutan idiom from src/lib/data/proyek.ts's moveMilestone(). */
export async function moveOption(id: string, direction: "up" | "down"): Promise<OptionItem[]> {
  await delay(100);
  const target = daftarPilihanFixtures.find((o) => o.id === id);
  if (!target) throw new Error(`Item ${id} tidak ditemukan.`);
  const siblings = daftarPilihanFixtures.filter((o) => o.kategori === target.kategori).sort((a, b) => a.urutan - b.urutan);
  const idx = siblings.findIndex((o) => o.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return siblings;
  [siblings[idx].urutan, siblings[swapIdx].urutan] = [siblings[swapIdx].urutan, siblings[idx].urutan];
  return siblings.sort((a, b) => a.urutan - b.urutan);
}
