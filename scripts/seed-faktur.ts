/**
 * One-time bootstrap: creates a Faktur Induk (with a term scheme) and a
 * handful of generated Invoice Termin for 4 of the 10 demo projects — enough
 * to exercise the Arus Kas/Pajak read-only visibility pass (at least one
 * termin marked Lunas produces real cashflow_entries/tax_entries rows via
 * fn_installment_after_change) and to leave at least one project with an
 * un-generated remaining term (exercises "Buat Termin Berikutnya" fresh).
 *
 * Idempotent — re-running skips projects that already have a Faktur Induk.
 * Trusts the DB triggers entirely: `assign_document_number('INV')` assigns
 * `number`/`number_year`/`number_month` on insert, `fn_installment_validate`
 * guards the sum-vs-total-biaya invariant, `fn_installment_after_change`
 * creates cashflow_entries/tax_entries and rolls the master invoice up to
 * Lunas when marked so — this script never duplicates that logic, it only
 * performs the same plain INSERT/UPDATE statements the app's service layer
 * would issue.
 *
 * Run AFTER `npm run seed:proyek` (needs real project/company/service rows).
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-proyek.ts.
 * Run: node --env-file=.env.local scripts/seed-faktur.ts
 */
import postgres from "postgres";
import { seedProyekId } from "../src/lib/proyek-seed-ids.ts";

type TermScheme = { label: string; persen: number };
type TerminPlan = { termIndex: number; tanggal: string; markLunas: boolean };

type FakturPlan = {
  proyekSeq: number;
  terminScheme: TermScheme[];
  /** Which terms (by index into terminScheme) to actually generate, in order. */
  generate: TerminPlan[];
  notes: string;
};

const PPN_PERSEN = 12;
const PPH23_PERSEN = 2;

const plans: FakturPlan[] = [
  {
    proyekSeq: 1,
    terminScheme: [{ label: "Termin I", persen: 50 }, { label: "Termin II", persen: 50 }],
    generate: [
      { termIndex: 0, tanggal: "2026-06-10", markLunas: true },
      { termIndex: 1, tanggal: "2026-06-25", markLunas: false },
    ],
    notes: "Faktur demo — 2 termin, termin I lunas.",
  },
  {
    proyekSeq: 4,
    terminScheme: [{ label: "Termin I", persen: 40 }, { label: "Termin II", persen: 40 }, { label: "Termin III", persen: 20 }],
    generate: [
      { termIndex: 0, tanggal: "2026-02-01", markLunas: true },
      { termIndex: 1, tanggal: "2026-03-01", markLunas: false },
    ],
    notes: "Faktur demo — 3 termin, termin I lunas, termin II belum lunas, termin III belum dibuat.",
  },
  {
    proyekSeq: 7,
    terminScheme: [{ label: "Termin I", persen: 100 }],
    generate: [
      { termIndex: 0, tanggal: "2026-05-15", markLunas: true },
    ],
    notes: "Faktur demo — 1 termin, lunas penuh (induk ikut roll-up ke Lunas).",
  },
  {
    proyekSeq: 10,
    terminScheme: [{ label: "Termin I", persen: 50 }, { label: "Termin II", persen: 50 }],
    generate: [
      { termIndex: 0, tanggal: "2026-05-01", markLunas: false },
    ],
    notes: "Faktur demo — 1 dari 2 termin dibuat, masih Belum Lunas (uji Buat Termin Berikutnya).",
  },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    const [bank] = await sql`select id from bank_accounts limit 1`;
    if (!bank) throw new Error(`No bank_accounts row found — run seed:daftar-pilihan first.`);
    const [belumLunas] = await sql`select id from workflow_statuses where entity = 'faktur' and system_role is null limit 1`;
    if (!belumLunas) throw new Error(`Faktur status "Belum Lunas" (entity=faktur, system_role null) not found.`);
    const [lunas] = await sql`select id from workflow_statuses where entity = 'faktur' and system_role = 'LUNAS' limit 1`;
    if (!lunas) throw new Error(`Faktur status with system_role=LUNAS not found.`);

    for (const plan of plans) {
      const proyekId = seedProyekId(plan.proyekSeq);

      await sql.begin(async (tx) => {
        await tx`set local role service_role`;

        const [existing] = await tx`select id from master_invoices where project_id = ${proyekId}`;
        if (existing) {
          console.log(`Proyek #${plan.proyekSeq} already has a Faktur Induk (${existing.id}) — skipping.`);
          return;
        }

        const [project] = await tx`select id, name, company_id, contract_value from projects where id = ${proyekId}`;
        if (!project) throw new Error(`Project #${plan.proyekSeq} (${proyekId}) not found — run seed:proyek first.`);
        const serviceRows = await tx`select service_id from project_services where project_id = ${proyekId}`;

        const totalBiaya = Number(project.contract_value);

        const [induk] = await tx`
          insert into master_invoices (project_id, company_id, total_cost, status_id, notes)
          values (${proyekId}, ${project.company_id}, ${totalBiaya}, ${belumLunas.id}, ${plan.notes})
          returning id
        `;

        for (const row of serviceRows) {
          await tx`insert into master_invoice_services (master_invoice_id, service_id) values (${induk.id}, ${row.service_id})`;
        }
        for (const [i, t] of plan.terminScheme.entries()) {
          await tx`
            insert into master_invoice_terms (master_invoice_id, label, percentage, sort_order)
            values (${induk.id}, ${t.label}, ${t.persen}, ${i})
          `;
        }
        const termRows = await tx`select id, label, percentage, sort_order from master_invoice_terms where master_invoice_id = ${induk.id} order by sort_order`;

        for (const plan_ of plan.generate) {
          const term = termRows[plan_.termIndex];
          const nilaiTermin = (Number(term.percentage) / 100) * totalBiaya;
          const dpp = (11 / 12) * nilaiTermin;
          const ppn = Math.round((PPN_PERSEN / 100) * dpp);
          const pph23 = (PPH23_PERSEN / 100) * nilaiTermin;
          const totalAfterTax = nilaiTermin + ppn - pph23;
          const netIncome = nilaiTermin - pph23;

          const [installment] = await tx`
            insert into installment_invoices (
              master_invoice_id, term_id, label, date, due_date, bank_account_id, status_id,
              current_term_value, dpp, ppn, pph23, total_after_tax, gross_income, net_income
            ) values (
              ${induk.id}, ${term.id}, ${term.label}, ${plan_.tanggal}, ${addDays(plan_.tanggal, 14)}, ${bank.id}, ${belumLunas.id},
              ${nilaiTermin}, ${dpp}, ${ppn}, ${pph23}, ${totalAfterTax}, ${nilaiTermin}, ${netIncome}
            )
            returning id, number
          `;

          if (plan_.markLunas) {
            await tx`update installment_invoices set status_id = ${lunas.id}, paid_date = ${addDays(plan_.tanggal, 10)} where id = ${installment.id}`;
          }
        }

        console.log(`Seeded Faktur Induk for proyek #${plan.proyekSeq} (${induk.id}), ${plan.generate.length}/${plan.terminScheme.length} termin generated.`);
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
