/**
 * One-time bootstrap: fills in the `company_profile` singleton row's fields
 * that the old mock (`src/lib/fixtures/company-profile.ts`, deleted once
 * this module moved to real Postgres) hardcoded but the DB seed
 * (`db-schema/sql/seed/00_seed.sql`) only set `legal_name`/`is_pkp` for.
 * Idempotent — a plain UPDATE on the singleton row, safe to rerun.
 *
 * Run AFTER `npm run seed:karyawan` (looks up the seeded "Budi Santoso"
 * employee by id to set `default_signer_employee_id`).
 *
 * Standalone by design (no `@/` imports), same convention as
 * scripts/seed-katalog.ts. Run: node --env-file=.env.local scripts/seed-company-profile.ts
 */
import postgres from "postgres";
import { seedKaryawanId } from "../src/lib/karyawan-seed-ids.ts";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;

      const signerId = seedKaryawanId(1); // Budi Santoso, seeded as "Direktur"
      const [signer] = await tx`select id from employees where id = ${signerId}`;
      if (!signer) throw new Error(`Employee #1 (${signerId}) not found — run seed:karyawan first.`);

      await tx`
        update company_profile set
          tagline = 'KONSULTAN LINGKUNGAN',
          city = 'Bandung',
          address = ${"Perum Purwasari Permai C.89, Kab. Karawang\nGrand Cinunuk Residence C.10, Kab. Bandung"},
          phone = '0856-2483-2610',
          email = 'contact.sbmj@gmail.com',
          website = 'www.portalkonsultan.com',
          npwp = '01.234.567.8-901.000',
          default_signer_employee_id = ${signerId}
        where singleton = true
      `;
      console.log("company_profile updated with tagline/city/address/contact/signer.");
    });
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
