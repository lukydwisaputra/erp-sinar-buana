import { delay } from "@/lib/data/_delay";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import { karyawanSchema, type Karyawan } from "@/lib/schemas/karyawan";
import { encodeKaryawan } from "@/lib/id-generator";

export type ListKaryawanParams = { q?: string };

export type CreateKaryawanInput = Omit<Karyawan, "id" | "status" | "pengali">;

let nextSeq = karyawanFixtures.length + 1;

export async function createKaryawan(input: CreateKaryawanInput): Promise<Karyawan> {
  await delay(300);
  const pengali = input.statusKepegawaian === "probation" ? 0.8 : 1;
  const row: Karyawan = {
    ...input,
    id: encodeKaryawan(nextSeq++),
    status: "aktif",
    pengali,
  };
  const parsed = karyawanSchema.parse(row);
  karyawanFixtures.push(parsed);
  return parsed;
}

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

export type UpdateKaryawanInput = Partial<Omit<Karyawan, "id">>;

export async function updateKaryawan(id: string, input: UpdateKaryawanInput): Promise<Karyawan> {
  await delay(300);
  const idx = karyawanFixtures.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Karyawan ${id} tidak ditemukan`);
  karyawanFixtures[idx] = { ...karyawanFixtures[idx], ...input };
  return karyawanSchema.parse(karyawanFixtures[idx]);
}

export async function deactivateKaryawan(id: string): Promise<void> {
  await delay(200);
  const idx = karyawanFixtures.findIndex((r) => r.id === id);
  if (idx !== -1) karyawanFixtures[idx] = { ...karyawanFixtures[idx], status: "terarsip" };
}
