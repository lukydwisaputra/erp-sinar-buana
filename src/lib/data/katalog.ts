import { delay } from "@/lib/data/_delay";
import { katalogFixtures } from "@/lib/fixtures/katalog";
import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { proyekFixtures } from "@/lib/fixtures/proyek";
import { layananSchema, type Layanan } from "@/lib/schemas/katalog";

function computeMetrik(nama: string): Layanan["metrik"] {
  const dipakaiSPH = penawaranFixtures.filter((s) =>
    s.items.some((i) => i.nama === nama),
  ).length;
  const dipakaiProyek = proyekFixtures.filter((p) =>
    p.layananNama.includes(nama),
  ).length;
  return { dipakaiSPH, dipakaiProyek };
}

function withMetrik(raw: (typeof katalogFixtures)[number]): Layanan {
  return layananSchema.parse({ ...raw, metrik: computeMetrik(raw.nama) });
}

export type ListKatalogParams = { q?: string };

export async function listKatalog(params: ListKatalogParams = {}): Promise<Layanan[]> {
  await delay();
  const rows = katalogFixtures.map(withMetrik);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => r.nama.toLowerCase().includes(q) || r.jenisDokumen.toLowerCase().includes(q));
}

export async function getLayanan(id: string): Promise<Layanan | null> {
  await delay(300);
  const row = katalogFixtures.find((r) => r.id === id);
  return row ? withMetrik(row) : null;
}

export async function deleteLayanan(id: string): Promise<void> {
  await delay(200);
  const idx = katalogFixtures.findIndex((r) => r.id === id);
  if (idx !== -1) katalogFixtures.splice(idx, 1);
}

export type UpdateLayananInput = {
  nama?: string;
  jenisDokumen?: string;
  kewenangan?: string;
  dasarHukum?: string;
  hargaStandar?: number | null;
  tags?: string[];
  status?: Layanan["status"];
};

export async function updateLayanan(id: string, input: UpdateLayananInput): Promise<Layanan> {
  await delay(300);
  const idx = katalogFixtures.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Layanan ${id} tidak ditemukan`);
  katalogFixtures[idx] = { ...katalogFixtures[idx], ...input };
  return withMetrik(katalogFixtures[idx]);
}
