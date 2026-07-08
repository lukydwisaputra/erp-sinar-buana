/**
 * Long-running pg-boss consumer for Pengiriman's email queue
 * (docs/architecture.md §7 — "App jobs (need Node)"). Connects as
 * `service_role` (architecture.md: "the worker connects as service_role —
 * it acts system-wide"), same pattern src/lib/db/tx.ts's withServiceRole
 * uses, reimplemented locally here with a plain `postgres` client.
 *
 * Standalone by design (no `@/` imports, only relative ones — Node's native
 * TS execution doesn't resolve the `@/` bundler alias, only Next does) —
 * same convention as scripts/seed-*.ts.
 *
 * Run: node --env-file=.env.local scripts/worker.ts
 * Leave running in its own terminal during dev; production runs a built
 * `dist/worker.js` (see infra/docker-compose.yml's worker service).
 */
import postgres from "postgres";
import { PgBoss } from "pg-boss";
import nodemailer from "nodemailer";
import { decryptSecret } from "../src/lib/crypto.ts";
import { fillTokens } from "../src/lib/pengiriman/token-fill.ts";

const DELIVERY_EMAIL_QUEUE = "pengiriman.email";
type EmailDeliveryJob = { deliveryId: string };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be set (see .env.example).");

const sql = postgres(databaseUrl);
const boss = new PgBoss(databaseUrl);
boss.on("error", (err: Error) => console.error("[pg-boss]", err));

type Tokens = Record<string, string>;

function formatPeriode(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatTanggal(d: string): string {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/** Resolves the token set for a delivery's document type by joining its owner document. */
async function resolveTokens(
  tx: postgres.TransactionSql,
  delivery: { document_type: string; quotation_id: string | null; installment_invoice_id: string | null; payslip_id: string | null; document_number: string },
): Promise<Tokens> {
  if (delivery.document_type === "sph" && delivery.quotation_id) {
    const [row] = await tx`
      select c.name as company_name
      from quotations q join companies c on c.id = q.company_id
      where q.id = ${delivery.quotation_id}`;
    return { no_sph: delivery.document_number, nama_perusahaan: row?.company_name ?? "" };
  }
  if (delivery.document_type === "invoice" && delivery.installment_invoice_id) {
    const [row] = await tx`
      select c.name as company_name, ii.due_date as due_date
      from installment_invoices ii
      join master_invoices mi on mi.id = ii.master_invoice_id
      join companies c on c.id = mi.company_id
      where ii.id = ${delivery.installment_invoice_id}`;
    return {
      no_inv: delivery.document_number,
      nama_perusahaan: row?.company_name ?? "",
      jatuh_tempo: row?.due_date ? formatTanggal(row.due_date) : "",
    };
  }
  if (delivery.document_type === "slip_gaji" && delivery.payslip_id) {
    const [row] = await tx`
      select e.name as employee_name, p.period_start as period_start, p.period_end as period_end
      from payslips p join employees e on e.id = p.employee_id
      where p.id = ${delivery.payslip_id}`;
    return {
      nama_karyawan: row?.employee_name ?? "",
      periode: row ? formatPeriode(row.period_start, row.period_end) : "",
    };
  }
  return {};
}

async function processDelivery(deliveryId: string): Promise<void> {
  try {
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;

      const [delivery] = await tx`select * from document_deliveries where id = ${deliveryId}`;
      if (!delivery) return; // gone — nothing to do

      const [account] = await tx`select * from email_accounts where singleton = true`;
      if (!account?.is_configured) throw new Error("Akun email belum dikonfigurasi.");

      const [template] = await tx`
        select * from message_templates
        where channel = 'email' and document_type = ${delivery.document_type} and is_active = true`;
      if (!template) throw new Error(`Template email untuk ${delivery.document_type} tidak ditemukan.`);

      const tokens = await resolveTokens(tx, delivery);
      const subject = fillTokens(template.subject ?? "", tokens);
      const body = fillTokens(template.body, tokens);

      const transporter = nodemailer.createTransport({
        host: account.host,
        port: account.port,
        secure: account.port === 465,
        auth: { user: account.username, pass: decryptSecret(account.password_encrypted) },
      });
      await transporter.sendMail({
        from: `"${account.from_nama}" <${account.from_email}>`,
        to: delivery.recipient_contact,
        subject,
        text: body,
      });

      await tx`
        update document_deliveries
        set status = 'sent', sent_at = now(), error = null
        where id = ${deliveryId}`;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Must re-elevate to service_role here too — the failed transaction above
    // rolled back its own "set local role", so a bare statement on `sql`
    // would run as the plain, un-elevated `app` role and get silently
    // filtered by RLS (no staff UPDATE policy exists on document_deliveries
    // by design — see db-schema/sql/rls/10_policies.sql).
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;
      await tx`update document_deliveries set status = 'failed', error = ${message} where id = ${deliveryId}`;
    });
    throw err; // re-throw so pg-boss's own retry/backoff still applies
  }
}

async function main() {
  await boss.start();
  await boss.createQueue(DELIVERY_EMAIL_QUEUE);
  await boss.work<EmailDeliveryJob>(DELIVERY_EMAIL_QUEUE, async ([job]) => {
    console.log("[worker] processing delivery", job.data.deliveryId);
    await processDelivery(job.data.deliveryId);
    console.log("[worker] sent delivery", job.data.deliveryId);
  });
  console.log("[worker] listening on", DELIVERY_EMAIL_QUEUE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
