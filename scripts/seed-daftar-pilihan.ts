/**
 * Top-up seed for Konfigurasi > Daftar Pilihan (db-schema/sql/seed/00_seed.sql
 * already seeds 6 of 8 categories with starter rows — this only fills the two
 * gaps `legal_bases`/`admin_areas` were left empty on purpose (PRD anticipated
 * this: dropdown "baru berisi pilihan setelah modul Konfigurasi tersambung"),
 * plus the extra job titles the Karyawan seed data (scripts/seed-karyawan.ts)
 * needs beyond the 6 generic `positions` rows already seeded.
 * Idempotent — checks by label per table before inserting.
 * Run: node --env-file=.env.local scripts/seed-daftar-pilihan.ts
 */
import postgres from "postgres";

const legalBases = [
  "PermenLHK No. 5 Tahun 2021",
  "PP No. 22 Tahun 2021",
  "PermenLHK No. 11 Tahun 2021",
];

const adminAreas = [
  "Kawasan Industri MM2100",
  "Kawasan Industri Jababeka",
  "Luar Kawasan",
];

// Job titles the 20 Karyawan seed rows use (scripts/seed-karyawan.ts) beyond
// the 6 generic ones db-schema/sql/seed/00_seed.sql already seeded (Direktur,
// Ketua Tim, Staff Teknik, Document Controller, Anggota, Keuangan).
const positions = [
  "Manajer Keuangan", "Ketua Tim Teknis", "Anggota Tim Teknis", "Pengendali Dokumen",
  "Staf Marketing", "Ahli AMDAL Senior", "Staf Lingkungan", "Insinyur Teknik",
  "Staf Administrasi", "Ahli K3", "Staf GIS", "Senior Konsultan", "Staf Penelitian",
  "Analis Lingkungan", "Admin Keuangan", "Drafter", "Petugas Lapangan",
  "Staf Legal", "Konsultan Junior",
];

async function seedLookup(
  sql: postgres.Sql,
  table: string,
  labels: string[],
) {
  await sql.begin(async (tx) => {
    await tx`set local role service_role`;
    const [{ max }] = await tx`select coalesce(max(sort_order), 0) as max from ${tx(table)}`;
    let nextOrder = Number(max);
    for (const label of labels) {
      const [existing] = await tx`select id from ${tx(table)} where label = ${label}`;
      if (existing) {
        console.log(`${table}: "${label}" already exists — skipping.`);
        continue;
      }
      nextOrder += 1;
      await tx`insert into ${tx(table)} (label, sort_order) values (${label}, ${nextOrder})`;
      console.log(`${table}: seeded "${label}".`);
    }
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    await seedLookup(sql, "legal_bases", legalBases);
    await seedLookup(sql, "admin_areas", adminAreas);
    await seedLookup(sql, "positions", positions);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
