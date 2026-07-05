/**
 * One-time bootstrap: inserts 2 Realisasi RAB rows (Personil + Langsung) per
 * seeded demo project, mirroring the old fixtures/realisasi-rab.ts's
 * 35%/25%-of-contract-value heuristic (2nd project intentionally over-budget
 * to exercise the 🔴 health status in Dasbor's profitability view).
 * Idempotent — re-running skips projects that already have realisasi rows.
 *
 * Run AFTER `npm run seed:proyek` (project ids must already exist).
 *
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-perusahaan.ts.
 * Run: node --env-file=.env.local scripts/seed-realisasi-rab.ts
 */
import postgres from "postgres";
import { seedProyekId } from "../src/lib/proyek-seed-ids.ts";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    for (let seq = 1; seq <= 10; seq++) {
      const projectId = seedProyekId(seq);
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;

        const [project] = await tx`select id, contract_value from projects where id = ${projectId}`;
        if (!project) {
          console.log(`Project #${seq} (${projectId}) not seeded yet — skipping (run seed:proyek first).`);
          return;
        }
        const [existing] = await tx`select id from rab_actuals where project_id = ${projectId} limit 1`;
        if (existing) {
          console.log(`Realisasi RAB for project #${seq} (${projectId}) already exists — skipping.`);
          return;
        }

        const overBudget = seq === 2; // matches the mock's "2nd active project" red-health case
        const nilaiKontrak = Number(project.contract_value);
        const personil = Math.round(nilaiKontrak * (overBudget ? 0.6 : 0.35));
        const langsung = Math.round(nilaiKontrak * (overBudget ? 0.45 : 0.25));

        await tx`
          insert into rab_actuals (project_id, rab_category, rab_line_label, amount, date, note)
          values (${projectId}, 'personil_a', 'Tenaga Ahli', ${personil}, '2026-05-15', 'Realisasi personil')
        `;
        await tx`
          insert into rab_actuals (project_id, rab_category, rab_line_label, amount, date, note)
          values (${projectId}, 'langsung_b', 'Material & Operasional Lapangan', ${langsung}, '2026-05-28', 'Realisasi biaya langsung')
        `;
        console.log(`Seeded realisasi RAB for project #${seq} (${projectId})`);
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
