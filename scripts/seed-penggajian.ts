/**
 * One-time bootstrap: creates payslips for 2 demo pay periods across a
 * handful of seeded employees, mixing Dibayar/Menunggu Pembayaran/Batal
 * statuses — at least one Dibayar slip to exercise
 * `fn_payslip_after_change`'s cashflow/tax-entry automation (verify
 * resulting cashflow_entries/tax_entries rows appear).
 *
 * Also seeds BPJS `employee_salary_components` rows for the same employees
 * (idempotent, skips if already present) so the real
 * `GET /api/penggajian/defaults/:employeeId` prefill has something
 * realistic to resolve — the existing demo data only had "Tunjangan
 * Transport" configured per employee, no BPJS enrollment yet.
 *
 * Trusts the DB entirely for numbering (`assign_document_number('GAJ')`)
 * and payment automation (`fn_payslip_after_change`) — this script only
 * performs the same plain INSERT/UPDATE statements the app's service layer
 * would issue.
 *
 * Run AFTER `npm run seed:karyawan` (needs real employee rows).
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-faktur.ts.
 * Run: node --env-file=.env.local scripts/seed-penggajian.ts
 */
import postgres from "postgres";
import { seedKaryawanId } from "../src/lib/karyawan-seed-ids.ts";

const BPJS_KESEHATAN_KARYAWAN = "BPJS Kesehatan (Karyawan)";
const BPJS_KESEHATAN_PERUSAHAAN = "BPJS Kesehatan (Perusahaan)";
const BPJS_TK_KARYAWAN = "BPJS TK (Karyawan)";

type ComponentPlan = { name: string; kind: "tunjangan" | "potongan"; amount: number; isEmployerPortion: boolean };
type SlipPlan = {
  employeeSeq: number;
  lembur: number;
  bonus: number;
  pph21: number;
  extraComponents: ComponentPlan[]; // beyond the auto-resolved Tunjangan Transport + BPJS
  markDibayar: boolean;
  markBatal: boolean;
};

type PeriodPlan = {
  periodStart: string;
  periodEnd: string;
  plannedPayDate: string;
  slips: SlipPlan[];
};

const periods: PeriodPlan[] = [
  {
    periodStart: "2026-05-25", periodEnd: "2026-06-24", plannedPayDate: "2026-06-25",
    slips: [
      { employeeSeq: 1, lembur: 500_000, bonus: 0, pph21: 150_000, extraComponents: [], markDibayar: true, markBatal: false },
      { employeeSeq: 2, lembur: 0, bonus: 1_000_000, pph21: 200_000, extraComponents: [], markDibayar: true, markBatal: false },
      { employeeSeq: 3, lembur: 250_000, bonus: 0, pph21: 100_000, extraComponents: [], markDibayar: false, markBatal: false },
      { employeeSeq: 4, lembur: 0, bonus: 0, pph21: 80_000, extraComponents: [], markDibayar: false, markBatal: true },
    ],
  },
  {
    periodStart: "2026-06-25", periodEnd: "2026-07-24", plannedPayDate: "2026-07-25",
    slips: [
      { employeeSeq: 1, lembur: 0, bonus: 0, pph21: 150_000, extraComponents: [], markDibayar: false, markBatal: false },
      { employeeSeq: 3, lembur: 0, bonus: 500_000, pph21: 110_000, extraComponents: [], markDibayar: false, markBatal: false },
    ],
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set (see .env.example).");

  const sql = postgres(databaseUrl);
  try {
    const employeeIds = [...new Set(periods.flatMap((p) => p.slips.map((s) => seedKaryawanId(s.employeeSeq))))];

    // Ensure BPJS enrollment exists for these demo employees (idempotent).
    const bpjsComponents = await sql`
      select id, label from salary_components
      where label in (${BPJS_KESEHATAN_KARYAWAN}, ${BPJS_KESEHATAN_PERUSAHAAN}, ${BPJS_TK_KARYAWAN})
    `;
    if (bpjsComponents.length !== 3) throw new Error("BPJS salary_components not found — run seed:daftar-pilihan first.");
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;
      for (const employeeId of employeeIds) {
        for (const comp of bpjsComponents) {
          const [existing] = await tx`
            select id from employee_salary_components where employee_id = ${employeeId} and salary_component_id = ${comp.id}
          `;
          if (existing) continue;
          await tx`insert into employee_salary_components (employee_id, salary_component_id) values (${employeeId}, ${comp.id})`;
          console.log(`Enrolled employee ${employeeId} in "${comp.label}".`);
        }
      }
    });

    const [belumBayar] = await sql`select id from workflow_statuses where entity = 'penggajian' and system_role is null limit 1`;
    const [dibayar] = await sql`select id from workflow_statuses where entity = 'penggajian' and system_role = 'DIBAYAR' limit 1`;
    const [batal] = await sql`select id from workflow_statuses where entity = 'penggajian' and system_role = 'BATAL' limit 1`;
    if (!belumBayar || !dibayar || !batal) throw new Error("Penggajian workflow_statuses not found — run seed:daftar-pilihan first.");

    for (const period of periods) {
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;

        const [existing] = await tx`
          select id from payslips where period_start = ${period.periodStart} and period_end = ${period.periodEnd} limit 1
        `;
        if (existing) {
          console.log(`Period ${period.periodStart}–${period.periodEnd} already has payslips — skipping.`);
          return;
        }

        for (const slipPlan of period.slips) {
          const employeeId = seedKaryawanId(slipPlan.employeeSeq);
          const [employee] = await tx`
            select e.name, e.base_salary, es.multiplier
            from employees e
            left join employment_statuses es on es.id = e.employment_status_id
            where e.id = ${employeeId}
          `;
          if (!employee) throw new Error(`Employee #${slipPlan.employeeSeq} (${employeeId}) not found — run seed:karyawan first.`);
          const [position] = await tx`select p.label from employees e left join positions p on p.id = e.position_id where e.id = ${employeeId}`;

          const gajiPokok = Number(employee.base_salary);
          const pengali = Number(employee.multiplier ?? 1);
          const baseEffective = gajiPokok * pengali;

          const [tunjanganRow] = await tx`
            select esc.override_value, sc.default_value, sc.calc_type
            from employee_salary_components esc
            join salary_components sc on sc.id = esc.salary_component_id
            where esc.employee_id = ${employeeId} and sc.label = 'Tunjangan Transport'
          `;
          const bpjsRows = await tx`
            select sc.label, sc.calc_type, sc.default_value, sc.is_employer_portion, esc.override_value
            from employee_salary_components esc
            join salary_components sc on sc.id = esc.salary_component_id
            where esc.employee_id = ${employeeId} and sc.label in (${BPJS_KESEHATAN_KARYAWAN}, ${BPJS_KESEHATAN_PERUSAHAAN}, ${BPJS_TK_KARYAWAN})
          `;

          const components: ComponentPlan[] = [];
          if (tunjanganRow) {
            const amount = tunjanganRow.override_value !== null ? Number(tunjanganRow.override_value) : Number(tunjanganRow.default_value);
            components.push({ name: "Tunjangan Transport", kind: "tunjangan", amount, isEmployerPortion: false });
          }
          for (const b of bpjsRows) {
            const raw = b.override_value !== null ? Number(b.override_value) : Number(b.default_value);
            const amount = b.calc_type === "persentase" ? Math.round((raw / 100) * baseEffective) : raw;
            components.push({ name: b.label, kind: "potongan", amount, isEmployerPortion: b.is_employer_portion });
          }
          components.push(...slipPlan.extraComponents);

          const tunjanganTotal = components.filter((c) => c.kind === "tunjangan").reduce((s, c) => s + c.amount, 0);
          const potonganTotal = components.filter((c) => c.kind === "potongan" && !c.isEmployerPortion).reduce((s, c) => s + c.amount, 0);
          const grossPay = baseEffective + tunjanganTotal + slipPlan.lembur + slipPlan.bonus;
          const netPay = grossPay - slipPlan.pph21 - potonganTotal;

          const [payslip] = await tx`
            insert into payslips (
              employee_id, position_snapshot, employment_status_snapshot, multiplier_snapshot,
              period_start, period_end, planned_pay_date, status_id,
              base_salary, base_effective, overtime_amount, bonus_amount, pph21_amount,
              gross_pay, net_pay
            ) values (
              ${employeeId}, ${position?.label ?? null}, null, ${pengali},
              ${period.periodStart}, ${period.periodEnd}, ${period.plannedPayDate}, ${belumBayar.id},
              ${gajiPokok}, ${baseEffective}, ${slipPlan.lembur}, ${slipPlan.bonus}, ${slipPlan.pph21},
              ${grossPay}, ${netPay}
            )
            returning id, number
          `;

          for (const [i, c] of components.entries()) {
            await tx`
              insert into payslip_components (payslip_id, name, kind, amount, is_employer_portion, sort_order)
              values (${payslip.id}, ${c.name}, ${c.kind}, ${c.amount}, ${c.isEmployerPortion}, ${i})
            `;
          }

          if (slipPlan.markDibayar) {
            await tx`update payslips set status_id = ${dibayar.id}, paid_date = ${period.plannedPayDate} where id = ${payslip.id}`;
          } else if (slipPlan.markBatal) {
            await tx`update payslips set status_id = ${batal.id} where id = ${payslip.id}`;
          }

          console.log(`Seeded payslip for ${employee.name} (${payslip.number ?? "no number"}), period ${period.periodStart}–${period.periodEnd}.`);
        }
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
