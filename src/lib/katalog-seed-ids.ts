/**
 * Fixed uuids for the 15 demo services, shared by `fixtures/katalog.ts`, the
 * fixtures that reference a service by id (`fixtures/penawaran.ts`'s SPH line
 * items), and `scripts/seed-katalog.ts` (which inserts these same ids into
 * the real `service_catalog` table). Katalog is now backed by Postgres —
 * Penawaran isn't wired yet, so its mock `layananId` values must point at
 * real service rows for cross-references to keep resolving.
 *
 * Generated once with `crypto.randomUUID()` — do not regenerate, or every
 * fixture that references a service by number goes stale against the seeded
 * DB rows.
 */
export const KATALOG_SEED_IDS = [
  "56b89b21-c14a-4e1f-a123-6160f613ec98",
  "cd12c51c-947c-4a1a-a922-68a8ce449115",
  "9d8fb943-089c-4304-b289-5518b799dfa5",
  "f8aa9e87-91c7-4922-b374-502ea0693276",
  "8887abf6-0b5f-49ae-9303-ec752e6eabbc",
  "e90d81e2-1000-423e-8ffa-0f456ad68ba4",
  "d17ec69b-818a-449f-98c2-36b5d7879789",
  "5e05742f-09d6-449b-8eb7-9cf834e003cd",
  "fc8190ed-5ed7-4585-9a51-f7854c8c6282",
  "c2d92e96-8181-4d15-9f2d-50fdd6848acc",
  "a4c54859-af7d-4780-9549-ad173640e7b6",
  "eb0638c9-f55d-4605-b730-520bf14c8245",
  "735f61fa-bff7-4094-84ab-2edfdf4e20cf",
  "b549b4dd-1dcb-4f6a-990c-0250558ce73b",
  "7627f52c-a9aa-4851-960c-3a1d3e8aec2c",
] as const;

/** 1-based, matches the old `encodeLayanan(n)` call sites it replaces. */
export function seedLayananId(n: number): string {
  const id = KATALOG_SEED_IDS[n - 1];
  if (!id) throw new Error(`No seed service #${n} (only ${KATALOG_SEED_IDS.length} seeded).`);
  return id;
}
