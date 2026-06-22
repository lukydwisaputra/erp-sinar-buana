import { delay } from "@/lib/data/_delay";
import { realisasiRabFixtures, bumpSeq } from "@/lib/fixtures/realisasi-rab";
import {
  realisasiRabSchema,
  type RealisasiRab,
  type RealisasiRabFormValues,
} from "@/lib/schemas/realisasi-rab";

export async function listRealisasiRab(): Promise<RealisasiRab[]> {
  await delay();
  return realisasiRabSchema.array().parse(realisasiRabFixtures);
}

export async function listRealisasiRabByProyek(proyekId: string): Promise<RealisasiRab[]> {
  await delay();
  return realisasiRabSchema
    .array()
    .parse(realisasiRabFixtures.filter((r) => r.proyekId === proyekId));
}

export async function createRealisasiRab(input: RealisasiRabFormValues): Promise<RealisasiRab> {
  await delay(400);
  const entry: RealisasiRab = {
    id: `RRB-${String(bumpSeq()).padStart(4, "0")}`,
    proyekId: input.proyekId,
    kategori: input.kategori,
    rabLineLabel: input.rabLineLabel,
    jumlah: input.jumlah,
    tanggal: input.tanggal,
    keterangan: input.keterangan,
    arusKasId: input.arusKasId,
  };
  const parsed = realisasiRabSchema.parse(entry);
  realisasiRabFixtures.push(parsed);
  return parsed;
}

export async function removeRealisasiRab(id: string): Promise<void> {
  await delay(300);
  const idx = realisasiRabFixtures.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Realisasi ${id} tidak ditemukan.`);
  realisasiRabFixtures.splice(idx, 1);
}
