import { delay } from "@/lib/data/_delay";
import { templateFixtures } from "@/lib/fixtures/template";
import { templateSchema, type Template, type TemplateJenis } from "@/lib/schemas/template";

let _seq = templateFixtures.length;

export async function listTemplates(jenis?: TemplateJenis): Promise<Template[]> {
  await delay();
  const rows = jenis ? templateFixtures.filter((t) => t.jenis === jenis) : templateFixtures;
  return templateSchema.array().parse(rows);
}

export async function getTemplate(id: string): Promise<Template | null> {
  await delay(200);
  const row = templateFixtures.find((t) => t.id === id);
  return row ? templateSchema.parse(row) : null;
}

export async function createTemplate(input: Omit<Template, "id" | "createdAt">): Promise<Template> {
  await delay(300);
  const entry = templateSchema.parse({
    ...input,
    id: `TPL-${String(++_seq).padStart(4, "0")}`,
    createdAt: new Date().toISOString(),
  });
  templateFixtures.push(entry);
  return entry;
}

export async function updateTemplate(id: string, patch: Partial<Omit<Template, "id" | "createdAt">>): Promise<Template> {
  await delay(300);
  const idx = templateFixtures.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error(`Template ${id} tidak ditemukan.`);
  templateFixtures[idx] = templateSchema.parse({ ...templateFixtures[idx], ...patch });
  return templateFixtures[idx];
}

export async function deleteTemplate(id: string): Promise<void> {
  await delay(300);
  const idx = templateFixtures.findIndex((t) => t.id === id);
  if (idx !== -1) templateFixtures.splice(idx, 1);
}

export async function duplicateTemplate(id: string, namaBaru: string): Promise<Template> {
  await delay(300);
  const src = templateFixtures.find((t) => t.id === id);
  if (!src) throw new Error(`Template ${id} tidak ditemukan.`);
  const copy: Template = {
    ...src,
    id: `TPL-${String(++_seq).padStart(4, "0")}`,
    nama: namaBaru,
    createdAt: new Date().toISOString(),
  };
  const parsed = templateSchema.parse(copy);
  templateFixtures.push(parsed);
  return parsed;
}

/** Reuses the swap-adjacent-urutan idiom used everywhere else in Konfigurasi,
 * scoped to one template's own milestone steps. */
export async function moveMilestoneStep(templateId: string, index: number, direction: "up" | "down"): Promise<Template> {
  await delay(100);
  const idx = templateFixtures.findIndex((t) => t.id === templateId);
  if (idx === -1) throw new Error(`Template ${templateId} tidak ditemukan.`);
  const steps = [...templateFixtures[idx].milestoneSteps].sort((a, b) => a.urutan - b.urutan);
  const swapIdx = direction === "up" ? index - 1 : index + 1;
  if (swapIdx < 0 || swapIdx >= steps.length) return templateFixtures[idx];
  [steps[index].urutan, steps[swapIdx].urutan] = [steps[swapIdx].urutan, steps[index].urutan];
  templateFixtures[idx] = { ...templateFixtures[idx], milestoneSteps: steps.sort((a, b) => a.urutan - b.urutan) };
  return templateFixtures[idx];
}
