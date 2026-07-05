/**
 * Fixed uuids for the 10 demo projects, shared by `fixtures/realisasi-rab.ts`
 * (`proyekId` references) and the Arus Kas page's still-mock "Proyek
 * (opsional)" picker (`fixtures/arus-kas.ts`/`arus-kas/page.tsx`), plus
 * `scripts/seed-proyek.ts` (which inserts these same ids into the real
 * `projects` table). Proyek is now backed by Postgres — Realisasi RAB and
 * Arus Kas aren't wired yet, so their mock `proyekId` values must point at
 * real project rows for cross-references to keep resolving.
 *
 * Generated once with `crypto.randomUUID()` — do not regenerate, or every
 * fixture that references a project by id goes stale against the seeded DB
 * rows.
 */
export const PROYEK_SEED_IDS = [
  "75d55f77-fb76-4772-9947-7afde7b273ad",
  "8d4b367d-a234-48fd-b7e6-49b92bf27bd2",
  "ae78a0cb-73c1-4cbf-a4ed-00817132cad1",
  "8d4f0edd-ee32-487b-9983-2a8e77f60d4a",
  "d5079cfe-0e1a-432d-b396-eeef499de341",
  "5610ac67-22c6-443d-8fa1-775856022d0a",
  "7bfb2199-6e93-4ae1-92f0-d98d783bd815",
  "1a3c34fb-6143-4bef-a136-c1997e8d8869",
  "5c897549-15d5-449e-b9f0-a0e6a24123ef",
  "11f35e48-88c9-4429-8e0a-0c052d5ff7a9",
] as const;

/** 1-based, matches the old `encodeProyekFromSph(sphSeq, tahun)` call sites it replaces. */
export function seedProyekId(n: number): string {
  const id = PROYEK_SEED_IDS[n - 1];
  if (!id) throw new Error(`No seed project #${n} (only ${PROYEK_SEED_IDS.length} seeded).`);
  return id;
}
