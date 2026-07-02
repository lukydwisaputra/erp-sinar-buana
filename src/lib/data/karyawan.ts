import { delay } from "@/lib/data/_delay";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import { karyawanSchema, type Karyawan } from "@/lib/schemas/karyawan";
import { encodeKaryawan } from "@/lib/id-generator";
import { listOptions } from "@/lib/data/daftar-pilihan";

export type ListKaryawanParams = { q?: string };

export type CreateKaryawanInput = Omit<Karyawan, "id" | "status" | "pengali">;

let nextSeq = karyawanFixtures.length + 1;

/**
 * Looks up the default multiplier for a Status Kepegawaian from Daftar Pilihan
 * (Konfigurasi Sistem), falling back to the historical hardcoded default if the
 * admin hasn't configured (or has deleted) the matching option — this is only a
 * default at create time, not authoritative; the stored pengali stays editable
 * per-employee afterward via updateKaryawan.
 */
async function defaultPengali(statusKepegawaian: Karyawan["statusKepegawaian"]): Promise<number> {
  const options = await listOptions("status_kepegawaian", { includeInactive: true });
  const match = options.find((o) => o.nama.toLowerCase() === statusKepegawaian);
  return match?.extra.pengali ?? (statusKepegawaian === "probation" ? 0.8 : 1);
}

export async function createKaryawan(input: CreateKaryawanInput): Promise<Karyawan> {
  await delay(300);
  const pengali = await defaultPengali(input.statusKepegawaian);
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
