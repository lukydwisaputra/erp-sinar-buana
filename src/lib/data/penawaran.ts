import { delay } from "@/lib/data/_delay";
import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { sphSchema, type Sph, type SphStatus } from "@/lib/schemas/penawaran";

export type ListPenawaranParams = { q?: string };

export async function listPenawaran(params: ListPenawaranParams = {}): Promise<Sph[]> {
  await delay();
  const rows = sphSchema.array().parse(penawaranFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) => r.id.toLowerCase().includes(q) || r.perusahaanNama.toLowerCase().includes(q),
  );
}

export async function getPenawaran(id: string): Promise<Sph | null> {
  await delay(300);
  const row = penawaranFixtures.find((r) => r.id === id);
  return row ? sphSchema.parse(row) : null;
}

export async function updatePenawaranStatus(id: string, newStatus: SphStatus): Promise<void> {
  await delay(300);
  const idx = penawaranFixtures.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`SPH ${id} not found`);
  penawaranFixtures[idx] = { ...penawaranFixtures[idx], status: newStatus };
  // Deal-time Proyek/Faktur creation is no longer triggered from here — the
  // real Penawaran/Proyek modules use their own explicit create flows now
  // (this mock file only survives to serve the still-unwired Faktur/Dasbor
  // consumers that call the functions above).
}

export async function deletePenawaran(id: string): Promise<void> {
  await delay(300);
  const idx = penawaranFixtures.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`SPH ${id} not found`);
  penawaranFixtures.splice(idx, 1);
}
