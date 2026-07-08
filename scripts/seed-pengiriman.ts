/**
 * One-time bootstrap for Pengiriman: seeds the `email_accounts` singleton
 * with dev-friendly MailDev values (see infra/README.md — host=localhost,
 * port=1025, unauthenticated) so a fresh dev DB has a working "configured"
 * SMTP account without filling the Konfigurasi form first, plus a handful
 * of demo `document_deliveries` rows spanning both channels, all 3 document
 * types, and all 3 statuses (including a `failed` row, to exercise the
 * status badge on /dokumen).
 *
 * Pengiriman doesn't own document creation, so this script queries a few
 * existing quotations/installment_invoices/payslips rows directly rather
 * than hardcoding ids — run AFTER `seed:penawaran`, `seed:faktur`, and
 * `seed:penggajian` (needs real rows to point at).
 *
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-faktur.ts and scripts/seed-penggajian.ts.
 * Run: node --env-file=.env.local scripts/seed-pengiriman.ts
 */
import postgres from "postgres";
import { encryptSecret } from "../src/lib/crypto.ts";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set (see .env.example).");

  const sql = postgres(databaseUrl);

  await sql.begin(async (tx) => {
    await tx`set local role service_role`;

    // ── email_accounts singleton — dev MailDev account ──────────────────
    const [existingAccount] = await tx`select is_configured from email_accounts where singleton = true`;
    if (!existingAccount?.is_configured) {
      await tx`
        update email_accounts set
          host = 'localhost', port = 1025, username = 'dev', from_nama = 'SBMJ (Dev)',
          from_email = 'noreply@sbmj.local', password_encrypted = ${encryptSecret("dev-not-a-real-password")},
          is_configured = true
        where singleton = true`;
      console.log("Seeded email_accounts (dev MailDev account).");
    } else {
      console.log("email_accounts already configured — skipping.");
    }

    // ── document_deliveries demo rows ────────────────────────────────────
    const [{ count }] = await tx`select count(*)::int from document_deliveries`;
    if (count > 0) {
      console.log(`document_deliveries already has ${count} rows — skipping.`);
      return;
    }

    const sphRows = await tx`
      select q.id, q.number, c.name as company_name
      from quotations q join companies c on c.id = q.company_id
      where q.number is not null order by q.created_at limit 2`;
    const invRows = await tx`
      select ii.id, ii.number, c.name as company_name
      from installment_invoices ii
      join master_invoices mi on mi.id = ii.master_invoice_id
      join companies c on c.id = mi.company_id
      where ii.number is not null order by ii.created_at limit 2`;
    const slipRows = await tx`
      select p.id, p.number, e.name as employee_name, e.phone as employee_phone, e.email as employee_email
      from payslips p join employees e on e.id = p.employee_id
      where p.number is not null order by p.created_at limit 2`;

    if (sphRows.length === 0 || invRows.length === 0 || slipRows.length === 0) {
      console.log("Not enough seeded quotations/installment_invoices/payslips yet — run seed:penawaran/seed:faktur/seed:penggajian first.");
      return;
    }

    const rows: {
      channel: "email" | "whatsapp";
      document_type: "sph" | "invoice" | "slip_gaji";
      owner_column: "quotation_id" | "installment_invoice_id" | "payslip_id";
      owner_id: string;
      document_number: string;
      recipient_name: string;
      recipient_contact: string;
      status: "queued" | "sent" | "failed";
      error: string | null;
      sent_at: Date | null;
    }[] = [
      {
        channel: "whatsapp", document_type: "sph", owner_column: "quotation_id", owner_id: sphRows[0].id,
        document_number: sphRows[0].number, recipient_name: `PIC ${sphRows[0].company_name}`,
        recipient_contact: "6281234567890", status: "sent", error: null, sent_at: new Date(),
      },
      {
        channel: "email", document_type: "sph", owner_column: "quotation_id", owner_id: sphRows[1]?.id ?? sphRows[0].id,
        document_number: sphRows[1]?.number ?? sphRows[0].number, recipient_name: `PIC ${sphRows[1]?.company_name ?? sphRows[0].company_name}`,
        recipient_contact: "pic@contoh-klien.co.id", status: "sent", error: null, sent_at: new Date(),
      },
      {
        channel: "email", document_type: "invoice", owner_column: "installment_invoice_id", owner_id: invRows[0].id,
        document_number: invRows[0].number, recipient_name: `PIC ${invRows[0].company_name}`,
        recipient_contact: "finance@contoh-klien.co.id", status: "sent", error: null, sent_at: new Date(),
      },
      {
        channel: "whatsapp", document_type: "invoice", owner_column: "installment_invoice_id", owner_id: invRows[1]?.id ?? invRows[0].id,
        document_number: invRows[1]?.number ?? invRows[0].number, recipient_name: `PIC ${invRows[1]?.company_name ?? invRows[0].company_name}`,
        recipient_contact: "6281234567891", status: "sent", error: null, sent_at: new Date(),
      },
      {
        channel: "email", document_type: "slip_gaji", owner_column: "payslip_id", owner_id: slipRows[0].id,
        document_number: slipRows[0].number, recipient_name: slipRows[0].employee_name,
        recipient_contact: slipRows[0].employee_email ?? "karyawan@sbmj.co.id", status: "sent", error: null, sent_at: new Date(),
      },
      {
        channel: "email", document_type: "slip_gaji", owner_column: "payslip_id", owner_id: slipRows[1]?.id ?? slipRows[0].id,
        document_number: slipRows[1]?.number ?? slipRows[0].number, recipient_name: slipRows[1]?.employee_name ?? slipRows[0].employee_name,
        recipient_contact: "alamat-tidak-valid", status: "failed", error: "Uji SMTP: 550 Recipient address rejected.", sent_at: null,
      },
      {
        channel: "email", document_type: "sph", owner_column: "quotation_id", owner_id: sphRows[0].id,
        document_number: sphRows[0].number, recipient_name: `PIC ${sphRows[0].company_name}`,
        recipient_contact: "pic@contoh-klien.co.id", status: "queued", error: null, sent_at: null,
      },
    ];

    for (const r of rows) {
      await tx`
        insert into document_deliveries (
          channel, document_type, ${sql(r.owner_column)}, document_number,
          recipient_name, recipient_contact, status, error, sent_at
        ) values (
          ${r.channel}, ${r.document_type}, ${r.owner_id}, ${r.document_number},
          ${r.recipient_name}, ${r.recipient_contact}, ${r.status}, ${r.error}, ${r.sent_at}
        )`;
    }
    console.log(`Seeded ${rows.length} document_deliveries rows.`);
  });

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
