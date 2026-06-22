import { delay } from "@/lib/data/_delay";
import { kewajibanPajakFixtures } from "@/lib/fixtures/kewajiban-pajak";
import {
  kewajibanPajakSchema,
  type KewajibanPajak,
  type KewajibanStatus,
} from "@/lib/schemas/kewajiban-pajak";

export async function listKewajibanPajak(): Promise<KewajibanPajak[]> {
  await delay();
  return kewajibanPajakSchema.array().parse(kewajibanPajakFixtures);
}

export async function setKewajibanStatus(id: string, status: KewajibanStatus): Promise<KewajibanPajak> {
  await delay(300);
  const item = kewajibanPajakFixtures.find((k) => k.id === id);
  if (!item) throw new Error(`Kewajiban ${id} tidak ditemukan.`);
  item.status = status;
  return kewajibanPajakSchema.parse(item);
}
