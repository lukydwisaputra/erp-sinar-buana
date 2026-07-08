/**
 * Fixed uuids for the 20 demo employees, shared by `fixtures/karyawan.ts`, the
 * fixtures that reference an employee by id (`fixtures/proyek.ts`'s assignees),
 * and `scripts/seed-karyawan.ts` (which inserts these same ids into the real
 * `employees` table). Karyawan, Penggajian, and Pengiriman are all now backed
 * by Postgres.
 *
 * Generated once with `crypto.randomUUID()` — do not regenerate, or every
 * fixture that references an employee by number goes stale against the seeded
 * DB rows.
 */
export const KARYAWAN_SEED_IDS = [
  "6d5e9172-f87e-4611-bf97-87b0d0be55d3",
  "ccdc59f8-0045-4e3e-b5ad-30afee1e855a",
  "ab7f0470-90a4-44d9-9310-8bee11068794",
  "a58f158f-ca4d-493a-8ccc-7f05e9714a50",
  "dd7bb3a4-207f-46dd-87ab-2d049764489d",
  "060fcd73-a886-4243-b5bb-ea1896a9e2f0",
  "f13ef12e-b894-4230-9a4a-d0d564d322c0",
  "960d5404-6c40-4bb4-8cca-7dec138a4fdb",
  "d5d8fd15-bec8-472a-bf8a-4d040a9ee11c",
  "a761b4da-76f0-4f43-8af7-c6b082bf8b79",
  "e57c66f2-3d2e-430b-a957-874636e862a5",
  "30a10455-b502-48f6-80b7-7c9094213a60",
  "c4e42154-3e4a-4143-bf53-9b70d5f589b9",
  "ffe4b3b1-f6ab-483a-b81d-a3b7dcae0f0c",
  "ffa3bec2-683e-49f8-b479-718a80f2182e",
  "68541378-be7d-44fd-901e-a4f177d39a1e",
  "bb097fc3-2f3f-4daa-af58-90f5795fb0dc",
  "cf02dd80-675c-4c74-b678-9bce86a197bf",
  "27256600-a444-4b32-8fa8-7e94e9deebcd",
  "a4832bbf-1298-4e50-bc62-f92b653a25a4",
] as const;

/** 1-based, matches the old `encodeKaryawan(n)` call sites it replaces. */
export function seedKaryawanId(n: number): string {
  const id = KARYAWAN_SEED_IDS[n - 1];
  if (!id) throw new Error(`No seed employee #${n} (only ${KARYAWAN_SEED_IDS.length} seeded).`);
  return id;
}
