/**
 * Fixed uuids for the 20 demo companies, shared by `fixtures/perusahaan.ts`,
 * the fixtures that reference a company (`fixtures/penawaran.ts`, `proyek.ts`,
 * `faktur.ts`), and `scripts/seed-perusahaan.ts` (which inserts these same
 * ids into the real `companies` table). Perusahaan is now backed by
 * Postgres — these modules aren't wired yet, so their mock `perusahaanId`
 * values must point at real company rows for cross-references (Perusahaan's
 * computed `metrik`, company-name lookups) to keep resolving.
 *
 * Generated once with `crypto.randomUUID()` — do not regenerate, or every
 * fixture that references a company by number goes stale against the seeded
 * DB rows.
 */
export const PERUSAHAAN_SEED_IDS = [
  "71533a0f-5ae8-45ad-9a28-09f24d787a73",
  "9f045e70-2cda-4d5f-8780-cdc3c6128fe1",
  "1d7c5ba4-8a83-477b-a4b1-6462816a2c77",
  "edf4627a-eac9-45d1-8739-0d939d9ea935",
  "af507892-0b55-4a81-ab3f-720067e8a397",
  "21eaec40-35c4-41e3-aed2-f0059c0932d5",
  "94763609-e865-4fb9-99ad-8d59e24709a4",
  "ef2309c3-76a0-454e-889b-f7d4671b4ff1",
  "693053ef-e891-4300-af2b-57a33c240ba1",
  "f2b40663-cd59-4d78-a9ac-a4f13ba26304",
  "09d87cfd-f476-4534-8d28-c7fba70a4cd0",
  "151b6d7b-e2f0-46f9-a86c-72acb8346753",
  "a79b7556-19e1-4dd8-a097-13f25677006e",
  "95424d4d-aa21-401a-bd42-0ea000d407f0",
  "b585628d-9091-48a0-8eed-5e719a959468",
  "5e3080e0-0093-406f-9e8a-03f3212206f7",
  "36ba6774-9b04-410c-8dba-7c4a1212f0f0",
  "6ed87c40-9c78-4675-ae4e-e27a0966a2e7",
  "e4f64a9e-9830-435d-ab23-688e69e9b543",
  "ad85c4c2-dddd-4253-bda3-3368443ff22f",
] as const;

/** 1-based, matches the old `encodePerusahaan(n)` call sites it replaces. */
export function seedPerusahaanId(n: number): string {
  const id = PERUSAHAAN_SEED_IDS[n - 1];
  if (!id) throw new Error(`No seed company #${n} (only ${PERUSAHAAN_SEED_IDS.length} seeded).`);
  return id;
}
