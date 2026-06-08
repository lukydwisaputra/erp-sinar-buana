import { delay } from "@/lib/data/_delay";
import { katalogFixtures } from "@/lib/fixtures/katalog";
import { layananSchema, type Layanan } from "@/lib/schemas/katalog";

export type ListKatalogParams = { q?: string };

export async function listKatalog(params: ListKatalogParams = {}): Promise<Layanan[]> {
  await delay();
  const rows = layananSchema.array().parse(katalogFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => r.nama.toLowerCase().includes(q) || r.jenisDokumen.toLowerCase().includes(q));
}

export async function getLayanan(id: string): Promise<Layanan | null> {
  await delay(300);
  const row = katalogFixtures.find((r) => r.id === id);
  return row ? layananSchema.parse(row) : null;
}
