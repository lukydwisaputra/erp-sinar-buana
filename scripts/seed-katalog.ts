/**
 * One-time bootstrap: inserts the 15 demo services that the still
 * mock-fixture Penawaran module cross-references by id, so those SPH line
 * items keep resolving once Katalog is served from real Postgres instead of
 * fixtures. Idempotent — re-running skips services that already exist.
 *
 * Run AFTER `npm run seed:daftar-pilihan` (document_types/authorities/
 * legal_bases must already have the rows this script looks up by label).
 *
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-perusahaan.ts.
 * Run: node --env-file=.env.local scripts/seed-katalog.ts
 */
import postgres from "postgres";
import { seedLayananId } from "../src/lib/katalog-seed-ids.ts";

type Service = {
  id: string;
  nama: string;
  jenisDokumen: string;
  kewenangan: string;
  dasarHukum: string;
  hargaStandar: number | null;
  isRecurring: boolean;
  isActive: boolean;
};

// Mirrors the old src/lib/fixtures/katalog.ts — kept in sync by hand since
// that file was deleted once Katalog moved to a real backend. "Kabupaten/Kota"
// maps to the already-seeded "Kota/Kabupaten" authority (same concept,
// reordered label) rather than creating a near-duplicate row.
const services: Service[] = [
  { id: seedLayananId(1), nama: "Penyusunan Pertek Air Limbah", jenisDokumen: "Pertek", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 75_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(2), nama: "Dokumen AMDAL", jenisDokumen: "AMDAL", kewenangan: "Pusat (KLHK)", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 350_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(3), nama: "Dokumen UKL-UPL", jenisDokumen: "UKL-UPL", kewenangan: "Kota/Kabupaten", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 45_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(4), nama: "Laporan Pelaksanaan RKL-RPL Semester", jenisDokumen: "Laporan", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 25_000_000, isRecurring: true, isActive: true },
  { id: seedLayananId(5), nama: "Persetujuan Teknis Emisi Udara", jenisDokumen: "Pertek", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 11 Tahun 2021", hargaStandar: 68_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(6), nama: "Penyusunan SPPL", jenisDokumen: "SPPL", kewenangan: "Kota/Kabupaten", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: null, isRecurring: false, isActive: false },
  { id: seedLayananId(7), nama: "Persetujuan Teknis Air Tanah", jenisDokumen: "Pertek", kewenangan: "Provinsi", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 65_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(8), nama: "Penyusunan RKL-RPL Baru", jenisDokumen: "RKL-RPL", kewenangan: "Pusat (KLHK)", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 120_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(9), nama: "Pemantauan Kualitas Lingkungan", jenisDokumen: "Laporan", kewenangan: "Kota/Kabupaten", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 18_000_000, isRecurring: true, isActive: true },
  { id: seedLayananId(10), nama: "Kajian Risiko Lingkungan", jenisDokumen: "Kajian", kewenangan: "Provinsi", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 95_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(11), nama: "Pertek Pembuangan Air Limbah ke Laut", jenisDokumen: "Pertek", kewenangan: "Pusat (KLHK)", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 80_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(12), nama: "Audit Lingkungan Hidup", jenisDokumen: "Audit", kewenangan: "Provinsi", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 55_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(13), nama: "Dokumen DELH", jenisDokumen: "DELH", kewenangan: "Pusat (KLHK)", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 150_000_000, isRecurring: false, isActive: true },
  { id: seedLayananId(14), nama: "Laporan Pemantauan Berkala", jenisDokumen: "Laporan", kewenangan: "Kota/Kabupaten", dasarHukum: "PermenLHK No. 5 Tahun 2021", hargaStandar: 15_000_000, isRecurring: true, isActive: true },
  { id: seedLayananId(15), nama: "Kajian Dampak Usaha", jenisDokumen: "Kajian", kewenangan: "Provinsi", dasarHukum: "PP No. 22 Tahun 2021", hargaStandar: 90_000_000, isRecurring: false, isActive: true },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    for (const s of services) {
      await sql.begin(async (tx) => {
        // BYPASSRLS only takes effect for the *current* role — same reasoning
        // as scripts/seed-admin.ts / seed-perusahaan.ts.
        await tx`set local role service_role`;

        const [existing] = await tx`select id from service_catalog where id = ${s.id}`;
        if (existing) {
          console.log(`Service ${s.nama} (${s.id}) already exists — skipping.`);
          return;
        }

        const [documentType] = await tx`select id from document_types where label = ${s.jenisDokumen}`;
        if (!documentType) throw new Error(`Document type "${s.jenisDokumen}" not found — run seed:daftar-pilihan first.`);
        const [authority] = await tx`select id from authorities where label = ${s.kewenangan}`;
        if (!authority) throw new Error(`Authority "${s.kewenangan}" not found — run seed:daftar-pilihan first.`);
        const [legalBasis] = await tx`select id from legal_bases where label = ${s.dasarHukum}`;
        if (!legalBasis) throw new Error(`Legal basis "${s.dasarHukum}" not found — run seed:daftar-pilihan first.`);

        await tx`
          insert into service_catalog (
            id, name, document_type_id, authority_id, legal_basis_id,
            standard_price, is_recurring, is_active
          ) values (
            ${s.id}, ${s.nama}, ${documentType.id}, ${authority.id}, ${legalBasis.id},
            ${s.hargaStandar}, ${s.isRecurring}, ${s.isActive}
          )
        `;
        console.log(`Seeded service: ${s.nama} (${s.id})`);
      });
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
