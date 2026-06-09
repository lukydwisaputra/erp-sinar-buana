import { delay } from "@/lib/data/_delay";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { fakturSchema, type Faktur } from "@/lib/schemas/faktur";

export type ListFakturParams = { q?: string };

export async function listFaktur(params: ListFakturParams = {}): Promise<Faktur[]> {
  await delay();
  const rows = fakturSchema.array().parse(fakturFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => r.id.toLowerCase().includes(q) || r.perusahaanNama.toLowerCase().includes(q));
}

export async function getFaktur(id: string): Promise<Faktur | null> {
  await delay(300);
  const row = fakturFixtures.find((r) => r.id === id);
  return row ? fakturSchema.parse(row) : null;
}
