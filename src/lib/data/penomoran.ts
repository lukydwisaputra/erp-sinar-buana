import { delay } from "@/lib/data/_delay";
import { penomoranConfigFixture } from "@/lib/fixtures/penomoran-config";
import {
  penomoranConfigSchema, formatNomorSchema,
  type DocTypePenomoran, type PenomoranConfig,
} from "@/lib/schemas/penomoran-config";

const counters = new Map<string, number>(); // "sph:2026:5" -> 12

function fmt(n: number, format: string, bulan: number, tahun: number): string {
  return format
    .replaceAll("{urut}", String(n).padStart(3, "0"))
    .replaceAll("{bulan}", String(bulan))
    .replaceAll("{tahun}", String(tahun));
}

function resolveFormat(docType: DocTypePenomoran): string {
  return penomoranConfigFixture.current.formats.find((f) => f.docType === docType)?.format
    ?? `${docType.toUpperCase()}/{urut}/{tahun}`;
}

/** Advances and returns the next formatted number for a doc type, scoped to the
 * current month — the counter key includes year+month so it resets to 1
 * automatically on month rollover (FR-00.7), and counters per doc type are
 * independent of each other. */
export async function nextNomor(docType: DocTypePenomoran, at: Date = new Date()): Promise<string> {
  await delay(100);
  const bulan = at.getMonth() + 1;
  const tahun = at.getFullYear();
  const key = `${docType}:${tahun}:${bulan}`;
  const n = (counters.get(key) ?? 0) + 1;
  counters.set(key, n);
  return fmt(n, resolveFormat(docType), bulan, tahun);
}

export async function getPenomoranConfig(): Promise<PenomoranConfig> {
  await delay();
  return penomoranConfigSchema.parse(penomoranConfigFixture.current);
}

export async function updatePenomoranFormat(docType: DocTypePenomoran, format: string): Promise<PenomoranConfig> {
  await delay(300);
  const parsed = formatNomorSchema.parse({ docType, format });
  const formats = penomoranConfigFixture.current.formats.map((f) => (f.docType === docType ? parsed : f));
  penomoranConfigFixture.current = { formats };
  return penomoranConfigFixture.current;
}
