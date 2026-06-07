import { delay } from "@/lib/data/_delay";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { perusahaanSchema, type Perusahaan } from "@/lib/schemas/perusahaan";

export type ListPerusahaanParams = { q?: string };

/** Future-API shape: returns Zod-validated rows after a simulated delay. */
export async function listPerusahaan(params: ListPerusahaanParams = {}): Promise<Perusahaan[]> {
  await delay();
  const rows = perusahaanSchema.array().parse(perusahaanFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => r.nama.toLowerCase().includes(q) || r.pic.toLowerCase().includes(q));
}

export async function getPerusahaan(id: string): Promise<Perusahaan | null> {
  await delay(300);
  const row = perusahaanFixtures.find((r) => r.id === id);
  return row ? perusahaanSchema.parse(row) : null;
}
