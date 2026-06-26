import { delay } from "@/lib/data/_delay";
import { kelengkapanFixtures } from "@/lib/fixtures/kelengkapan";
import { kelengkapanTemplateSchema, type KelengkapanTemplate } from "@/lib/schemas/kelengkapan";
import { encodeKelengkapan } from "@/lib/id-generator";

let _counter = kelengkapanFixtures.length;

export async function listKelengkapan(): Promise<KelengkapanTemplate[]> {
  await delay();
  return kelengkapanTemplateSchema.array().parse(kelengkapanFixtures);
}

export async function getKelengkapan(id: string): Promise<KelengkapanTemplate | null> {
  await delay(200);
  const row = kelengkapanFixtures.find((r) => r.id === id);
  return row ? kelengkapanTemplateSchema.parse(row) : null;
}

export async function createKelengkapan(
  input: Omit<KelengkapanTemplate, "id">,
): Promise<KelengkapanTemplate> {
  await delay(300);
  _counter += 1;
  const row: KelengkapanTemplate = { id: encodeKelengkapan(_counter), ...input };
  kelengkapanFixtures.push(row);
  return kelengkapanTemplateSchema.parse(row);
}

export async function updateKelengkapan(
  id: string,
  input: Omit<KelengkapanTemplate, "id">,
): Promise<KelengkapanTemplate> {
  await delay(300);
  const idx = kelengkapanFixtures.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Kelengkapan ${id} not found`);
  kelengkapanFixtures[idx] = { id, ...input };
  return kelengkapanTemplateSchema.parse(kelengkapanFixtures[idx]);
}

export async function deleteKelengkapan(id: string): Promise<void> {
  await delay(300);
  const idx = kelengkapanFixtures.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Kelengkapan ${id} not found`);
  kelengkapanFixtures.splice(idx, 1);
}
