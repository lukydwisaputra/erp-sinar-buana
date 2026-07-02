import { delay } from "@/lib/data/_delay";
import { kewajibanPajakFixtures, bumpSeq } from "@/lib/fixtures/kewajiban-pajak";
import {
  kewajibanPajakSchema,
  type KewajibanPajak,
  type KewajibanStatus,
} from "@/lib/schemas/kewajiban-pajak";

export async function listKewajibanPajak(): Promise<KewajibanPajak[]> {
  await delay();
  return kewajibanPajakSchema.array().parse(kewajibanPajakFixtures);
}

export async function createKewajibanPajak(input: Omit<KewajibanPajak, "id">): Promise<KewajibanPajak> {
  await delay(400);
  const id = `KWP-${String(bumpSeq()).padStart(4, "0")}`;
  const item = kewajibanPajakSchema.parse({ ...input, id });
  kewajibanPajakFixtures.push(item);
  return item;
}

export async function setKewajibanStatus(id: string, status: KewajibanStatus): Promise<KewajibanPajak> {
  await delay(300);
  const item = kewajibanPajakFixtures.find((k) => k.id === id);
  if (!item) throw new Error(`Kewajiban ${id} tidak ditemukan.`);
  item.status = status;
  return kewajibanPajakSchema.parse(item);
}

export async function setBuktiPotong(id: string, diterima: boolean): Promise<KewajibanPajak> {
  await delay(300);
  const item = kewajibanPajakFixtures.find((k) => k.id === id);
  if (!item) throw new Error(`Kewajiban ${id} tidak ditemukan.`);
  item.buktiPotongDiterima = diterima;
  return kewajibanPajakSchema.parse(item);
}
