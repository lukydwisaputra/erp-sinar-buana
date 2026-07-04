/**
 * Fixed uuids for the 20 demo quotations, shared by `fixtures/penawaran.ts`,
 * the fixtures that reference a quotation by id (`fixtures/proyek.ts`'s
 * `sphId`, `fixtures/faktur.ts`'s `sphId`), and `scripts/seed-penawaran.ts`
 * (which inserts these same ids into the real `quotations` table). Penawaran
 * is now backed by Postgres — Proyek/Faktur aren't wired yet, so their mock
 * `sphId` values must point at real quotation rows for cross-references to
 * keep resolving.
 *
 * Generated once with `crypto.randomUUID()` — do not regenerate, or every
 * fixture that references a quotation by number goes stale against the
 * seeded DB rows.
 */
export const PENAWARAN_SEED_IDS = [
  "15bf5a62-c73a-4dd4-b408-6674e185f76f",
  "2bafcd17-181a-460e-bb46-6ffd65fed39b",
  "c240908a-fe21-4369-8b50-dcd728ad1280",
  "ade3f3ca-208b-4f8c-b729-b8fc63f01b0f",
  "6bf1e79c-c6a0-4633-b886-3bb76800c56b",
  "2481ba23-dbc1-408c-84b6-74747bcd980c",
  "bcb22d6f-1a60-4b7c-9e95-7b9d634182e0",
  "9781d69f-605b-4c3c-8394-fcb3c2c71f74",
  "7b0f8b66-d5dc-48f3-b5a5-15c64b386d47",
  "821a83d2-97b2-4255-a222-8216dba891da",
  "f041e58d-c4b8-4aa9-aa99-f18970cca41b",
  "30ea90ed-48be-4771-bf85-19257b109ccd",
  "05be968c-6189-4114-a2aa-450f09f8f5e0",
  "3b098424-f31e-4a17-916b-e653c214e98e",
  "f234bcb5-adbc-4cb5-bd81-42422f95edf6",
  "eca2c732-5dbb-4dc0-83ea-5ca072033239",
  "a7ee948f-ab82-4271-926e-350fae854761",
  "0c6addb0-0b87-4935-9395-a95947e27bf7",
  "b37a9dfc-f4a3-45c6-bb27-59e33ef20c19",
  "0aaafee2-819a-4abd-a25e-c648c96d7ab0",
] as const;

/** 1-based, matches the old `encodeSph(n, bulan, tahun)` call sites it replaces. */
export function seedSphId(n: number): string {
  const id = PENAWARAN_SEED_IDS[n - 1];
  if (!id) throw new Error(`No seed quotation #${n} (only ${PENAWARAN_SEED_IDS.length} seeded).`);
  return id;
}
