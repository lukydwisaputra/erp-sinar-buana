import { delay } from "@/lib/data/_delay";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import { karyawanSchema, type Karyawan } from "@/lib/schemas/karyawan";

export type ListKaryawanParams = { q?: string };

export async function listKaryawan(params: ListKaryawanParams = {}): Promise<Karyawan[]> {
  await delay();
  const rows = karyawanSchema.array().parse(karyawanFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter((r) => r.nama.toLowerCase().includes(q) || r.jabatan.toLowerCase().includes(q));
}

export async function getKaryawan(id: string): Promise<Karyawan | null> {
  await delay(300);
  const row = karyawanFixtures.find((r) => r.id === id);
  return row ? karyawanSchema.parse(row) : null;
}
