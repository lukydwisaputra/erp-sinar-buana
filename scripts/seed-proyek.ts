/**
 * One-time bootstrap: inserts the 10 demo projects that the still
 * mock-fixture Realisasi RAB/Arus Kas cross-referenced by id historically
 * (now Realisasi RAB is wired too — see seed-realisasi-rab.ts, which depends
 * on these ids). Idempotent — re-running skips projects that already exist.
 *
 * Simplification: seeds headers + project_services + project_assignees only,
 * mirroring the old fixtures/proyek.ts data (10 rows, one per Deal SPH) —
 * skips milestones (the old fixture data never nested any milestone, so a
 * flat seed wouldn't exercise anything a hand-crafted curl test doesn't
 * already cover more thoroughly; see the verification pass for nested
 * milestone create/delete-cascade testing instead). All 10 rows default to
 * "Luar Kawasan" for area — admin_areas only has 3 coarse industrial-park
 * categories, not city-level entries, so there's no closer match for the
 * original free-text city names.
 *
 * Run AFTER `npm run seed:penawaran`, `npm run seed:karyawan`,
 * `npm run seed:katalog` (companyId/sphId/serviceId/employeeId are the fixed
 * seed uuids those scripts already inserted).
 *
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-perusahaan.ts.
 * Run: node --env-file=.env.local scripts/seed-proyek.ts
 */
import postgres from "postgres";
import { seedProyekId } from "../src/lib/proyek-seed-ids.ts";
import { seedPerusahaanId } from "../src/lib/perusahaan-seed-ids.ts";
import { seedSphId } from "../src/lib/penawaran-seed-ids.ts";
import { seedLayananId } from "../src/lib/katalog-seed-ids.ts";
import { seedKaryawanId } from "../src/lib/karyawan-seed-ids.ts";

type Project = {
  seq: number;
  nama: string;
  perusahaan: number;
  sph: number;
  services: number[];
  statusLabel: string;
  nilaiKontrak: number;
  assignees: number[];
  createdAt: string;
  workYear: number;
};

// Mirrors the old src/lib/fixtures/proyek.ts (header fields only — see the
// milestones note above) — kept in sync by hand since that file was deleted
// once Proyek moved to a real backend.
const projects: Project[] = [
  { seq: 1, nama: "Pertek Air Limbah — PT Maju Bersama Industri", perusahaan: 1, sph: 1, services: [1, 4], statusLabel: "Drafting", nilaiKontrak: 136_250_000, assignees: [3, 4], createdAt: "2026-05-04", workYear: 2026 },
  { seq: 2, nama: "Dokumen AMDAL — PT Karya Logam", perusahaan: 3, sph: 2, services: [2], statusLabel: "Drafting", nilaiKontrak: 381_500_000, assignees: [3], createdAt: "2026-05-10", workYear: 2026 },
  { seq: 3, nama: "Pertek Emisi Udara — PT Cahaya Teknik Mandiri", perusahaan: 6, sph: 4, services: [5], statusLabel: "Drafting", nilaiKontrak: 74_120_000, assignees: [3, 5], createdAt: "2026-06-01", workYear: 2026 },
  { seq: 4, nama: "UKL-UPL & Laporan RKL-RPL — PT Nusantara Energi Prima", perusahaan: 7, sph: 6, services: [3, 4], statusLabel: "Selesai", nilaiKontrak: 76_300_000, assignees: [3, 8], createdAt: "2026-01-10", workYear: 2026 },
  { seq: 5, nama: "Dokumen AMDAL — CV Agro Subur Mandiri", perusahaan: 8, sph: 7, services: [2], statusLabel: "Selesai", nilaiKontrak: 381_500_000, assignees: [7, 3], createdAt: "2026-02-16", workYear: 2026 },
  { seq: 6, nama: "Pertek Emisi Udara — CV Pembangunan Baru Jaya", perusahaan: 10, sph: 9, services: [5], statusLabel: "Tunggu Pengesahan", nilaiKontrak: 74_120_000, assignees: [9, 5], createdAt: "2026-03-20", workYear: 2026 },
  { seq: 7, nama: "UKL-UPL — PT Karya Logam (Proyek 2)", perusahaan: 3, sph: 13, services: [3], statusLabel: "Drafting", nilaiKontrak: 49_050_000, assignees: [4], createdAt: "2026-05-09", workYear: 2026 },
  { seq: 8, nama: "UKL-UPL & Laporan RKL-RPL — PT Delta Pratama", perusahaan: 15, sph: 18, services: [3, 4], statusLabel: "Drafting", nilaiKontrak: 76_300_000, assignees: [8, 3], createdAt: "2026-06-17", workYear: 2026 },
  { seq: 9, nama: "Pertek Emisi Udara — PT Nusantara Energi Prima", perusahaan: 7, sph: 19, services: [5], statusLabel: "Drafting", nilaiKontrak: 74_120_000, assignees: [9], createdAt: "2026-05-09", workYear: 2026 },
  { seq: 10, nama: "UKL-UPL — PT Rimba Lestari Kalimantan", perusahaan: 11, sph: 20, services: [3], statusLabel: "Selesai", nilaiKontrak: 49_050_000, assignees: [3, 4], createdAt: "2026-04-26", workYear: 2026 },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    for (const p of projects) {
      const id = seedProyekId(p.seq);
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;

        const [existing] = await tx`select id from projects where id = ${id}`;
        if (existing) {
          console.log(`Project #${p.seq} (${id}) already exists — skipping.`);
          return;
        }

        const [area] = await tx`select id from admin_areas where label = 'Luar Kawasan'`;
        if (!area) throw new Error(`Admin area "Luar Kawasan" not found — run seed:daftar-pilihan first.`);
        const [status] = await tx`select id from workflow_statuses where entity = 'proyek' and label = ${p.statusLabel}`;
        if (!status) throw new Error(`Status "${p.statusLabel}" (entity=proyek) not found.`);

        await tx`
          insert into projects (
            id, name, company_id, admin_area_id, work_year, status_id,
            contract_value, quotation_id, created_at
          ) values (
            ${id}, ${p.nama}, ${seedPerusahaanId(p.perusahaan)}, ${area.id}, ${p.workYear}, ${status.id},
            ${p.nilaiKontrak}, ${seedSphId(p.sph)}, ${p.createdAt}
          )
        `;

        for (const svc of p.services) {
          await tx`insert into project_services (project_id, service_id) values (${id}, ${seedLayananId(svc)})`;
        }
        for (const emp of p.assignees) {
          await tx`insert into project_assignees (project_id, employee_id, role) values (${id}, ${seedKaryawanId(emp)}, 'anggota')`;
        }
        console.log(`Seeded project #${p.seq} (${id})`);
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
