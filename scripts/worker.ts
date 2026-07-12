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
 * Leave running in its own terminal during dev; production runs the exact
 * same command inside infra/worker/Dockerfile's image (no separate build
 * step — Node's native TS type-stripping handles both).
 */
import { setDefaultResultOrder } from "node:dns";
import postgres from "postgres";
import { PgBoss } from "pg-boss";
import nodemailer from "nodemailer";
import { chromium, type Browser } from "@playwright/test";
import { decryptSecret } from "../src/lib/crypto.ts";
import { fillTokens } from "../src/lib/pengiriman/token-fill.ts";
import { reportError } from "../src/lib/observability/sentry.ts";

// See src/lib/db/client.ts's matching comment — Coolify's internal Docker
// network resolves "postgres" to both an IPv4 and an unroutable IPv6
// address; force IPv4 so connections don't intermittently pick the broken one.
setDefaultResultOrder("ipv4first");

const DELIVERY_EMAIL_QUEUE = "pengiriman.email";
type EmailDeliveryJob = { deliveryId: string };

const PASSWORD_RESET_EMAIL_QUEUE = "auth.password-reset";
type PasswordResetEmailJob = { to: string; resetUrl: string };

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must be set (see .env.example).");

// PDF attachments: headless-render the same print routes a browser would
// hit (src/app/print/**), reusing the real React document components — see
// .env.example for both vars. Neither is required to boot the worker (only
// checked inside renderDocumentPdf), so a dev environment that doesn't need
// attachments yet doesn't need them set.
const appUrl = process.env.APP_URL;
const renderSecret = process.env.INTERNAL_RENDER_SECRET;

const sql = postgres(databaseUrl);
const boss = new PgBoss(databaseUrl);
boss.on("error", (err: Error) => reportError(err, { source: "pg-boss" }));

// One browser instance for the worker's whole lifetime — launching Chromium
// per email would be needlessly slow. Started lazily on first use, not at
// boot, so a worker that never sends anything doesn't pay the startup cost.
let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

type DeliveryRow = {
  document_type: string;
  quotation_id: string | null;
  installment_invoice_id: string | null;
  payslip_id: string | null;
  document_number: string;
};

const PRINT_PATH_BY_DOC_TYPE: Record<string, (delivery: DeliveryRow) => string | null> = {
  sph: (d) => (d.quotation_id ? `/print/sph/${d.quotation_id}` : null),
  invoice: (d) => (d.installment_invoice_id ? `/print/faktur/${d.installment_invoice_id}` : null),
  slip_gaji: (d) => (d.payslip_id ? `/print/slip/${d.payslip_id}` : null),
};

/** Renders one of `src/app/print/**` to a PDF buffer via headless Chromium.
 * Throws (rather than returning null) on any failure — an attachment that
 * silently never shows up is worse than a delivery that visibly retries/fails,
 * matching this worker's existing "no partial success" error handling. */
async function renderDocumentPdf(delivery: DeliveryRow): Promise<Buffer> {
  if (!appUrl || !renderSecret) {
    throw new Error("APP_URL and INTERNAL_RENDER_SECRET must both be set to attach PDFs (see .env.example).");
  }
  const path = PRINT_PATH_BY_DOC_TYPE[delivery.document_type]?.(delivery);
  if (!path) throw new Error(`No print route for document_type=${delivery.document_type}.`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const url = `${appUrl}${path}?token=${encodeURIComponent(renderSecret)}`;
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      throw new Error(`Print route returned ${response?.status() ?? "no response"} for ${path}.`);
    }
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await page.close();
  }
}

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
async function resolveTokens(tx: postgres.TransactionSql, delivery: DeliveryRow): Promise<Tokens> {
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
    // Its own short transaction, separate from the main send below —
    // renderDocumentPdf is a multi-second external round-trip (HTTP + full
    // page render), not something to hold a Postgres transaction open for.
    const [delivery] = await sql.begin<DeliveryRow[]>(async (tx) => {
      await tx`set local role service_role`;
      return tx<DeliveryRow[]>`select * from document_deliveries where id = ${deliveryId}`;
    });
    if (!delivery) return; // gone — nothing to do

    const pdf = await renderDocumentPdf(delivery);
    const pdfFilename = `${delivery.document_number.replace(/[/\\]/g, "-")}.pdf`;

    await sql.begin(async (tx) => {
      await tx`set local role service_role`;

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
        attachments: [{ filename: pdfFilename, content: pdf, contentType: "application/pdf" }],
      });

      await tx`
        update document_deliveries
        set status = 'sent', sent_at = now(), error = null
        where id = ${deliveryId}`;
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reportError(err, { source: "processDelivery", deliveryId });
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

/** Sends the "reset your password" link. No owning document, no PDF — a plain
 * transactional email via the same email_accounts singleton processDelivery uses. */
async function sendPasswordResetEmail(job: PasswordResetEmailJob): Promise<void> {
  const [account] = await sql`select * from email_accounts where singleton = true`;
  if (!account?.is_configured) {
    throw new Error("Akun email belum dikonfigurasi — tautan reset tidak terkirim.");
  }

  const transporter = nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465,
    auth: { user: account.username, pass: decryptSecret(account.password_encrypted) },
  });
  await transporter.sendMail({
    from: `"${account.from_nama}" <${account.from_email}>`,
    to: job.to,
    subject: "Atur ulang sandi Anda",
    text:
      `Klik tautan berikut untuk mengatur sandi baru (berlaku 1 jam):\n\n${job.resetUrl}\n\n` +
      `Jika Anda tidak meminta ini, abaikan email ini.`,
  });
}

const TAX_OVERDUE_SWEEP_QUEUE = "tax.overdue-sweep";

/** Flips `belum_disetor` + past-`due_date` tax_entries rows to `terlambat`
 * (db-schema/sql/triggers/40_tax_automation.sql's `mark_overdue_tax_entries()`,
 * whose own doc comment says "call from a scheduled job / pg_cron" — this is
 * that job). Same service_role elevation pattern as processDelivery. */
async function sweepOverdueTaxEntries(): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`set local role service_role`;
    await tx`select mark_overdue_tax_entries()`;
  });
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

  await boss.createQueue(PASSWORD_RESET_EMAIL_QUEUE);
  await boss.work<PasswordResetEmailJob>(PASSWORD_RESET_EMAIL_QUEUE, async ([job]) => {
    console.log("[worker] sending password-reset email to", job.data.to);
    await sendPasswordResetEmail(job.data);
    console.log("[worker] sent password-reset email to", job.data.to);
  });
  console.log("[worker] listening on", PASSWORD_RESET_EMAIL_QUEUE);

  await boss.createQueue(TAX_OVERDUE_SWEEP_QUEUE);
  await boss.schedule(TAX_OVERDUE_SWEEP_QUEUE, "0 1 * * *", {});
  await boss.work(TAX_OVERDUE_SWEEP_QUEUE, async () => {
    console.log("[worker] sweeping overdue tax entries");
    await sweepOverdueTaxEntries();
    console.log("[worker] overdue tax entries swept");
  });
  console.log("[worker] scheduled", TAX_OVERDUE_SWEEP_QUEUE, "daily at 01:00");
}

main().catch((err) => {
  reportError(err, { source: "main" });
  process.exit(1);
});
