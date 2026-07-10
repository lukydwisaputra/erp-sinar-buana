/**
 * One-time bootstrap: inserts the demo milestone/termin/PDF templates the
 * old mock (`src/lib/fixtures/template.ts`, deleted once this tab moved to
 * real Postgres) hardcoded. Idempotent — checked by name against each
 * table's unique index, safe to rerun.
 *
 * Milestone templates here are distinct from the already-seeded "Template
 * Standar Dokumen Lingkungan (12 Langkah)" (db-schema/sql/seed/00_seed.sql,
 * from the Proyek pass) — these 3 are the mock's own demo set.
 *
 * Standalone by design (no `@/` imports), same convention as
 * scripts/seed-kelengkapan.ts. Run: node --env-file=.env.local scripts/seed-templates.ts
 */
import postgres from "postgres";

type MilestoneTemplate = { nama: string; steps: { nama: string; triggersTerm: boolean }[] };
type TerminTemplate = { nama: string; steps: { label: string; persen: number; pemicu: string }[] };
type PdfTemplate = { nama: string; documentType: "sph" | "invoice" | "slip_gaji"; headerNote: string; footerNote: string };

const milestoneTemplates: MilestoneTemplate[] = [
  {
    nama: "Pertek 5 Tahap",
    steps: [
      { nama: "Pengumpulan Data Lapangan", triggersTerm: false },
      { nama: "Penyusunan Draf Dokumen", triggersTerm: false },
      { nama: "Review Internal", triggersTerm: false },
      { nama: "Pengajuan ke Instansi", triggersTerm: false },
      { nama: "Persetujuan Teknis Terbit", triggersTerm: true },
    ],
  },
  {
    nama: "AMDAL Lengkap",
    steps: [
      { nama: "Kick-off & Pengumpulan Data Rona Awal", triggersTerm: false },
      { nama: "Penyusunan KA-ANDAL", triggersTerm: false },
      { nama: "Sidang Komisi Penilai KA-ANDAL", triggersTerm: false },
      { nama: "Penyusunan ANDAL & RKL-RPL", triggersTerm: false },
      { nama: "Sidang Komisi Penilai ANDAL", triggersTerm: false },
      { nama: "Perbaikan Dokumen Pasca Sidang", triggersTerm: false },
      { nama: "Penerbitan Persetujuan Lingkungan", triggersTerm: true },
    ],
  },
  {
    nama: "UKL-UPL Standar",
    steps: [
      { nama: "Survei & Pengumpulan Data", triggersTerm: false },
      { nama: "Penyusunan Draf UKL-UPL", triggersTerm: false },
      { nama: "Pemeriksaan Instansi Lingkungan", triggersTerm: false },
      { nama: "Penerbitan Rekomendasi UKL-UPL", triggersTerm: true },
    ],
  },
];

const terminTemplates: TerminTemplate[] = [
  {
    nama: "Termin 3 Tahap Standar",
    steps: [
      { label: "Termin I — Uang Muka", persen: 30, pemicu: "Kontrak ditandatangani" },
      { label: "Termin II — Progres", persen: 40, pemicu: "Draf dokumen selesai" },
      { label: "Termin III — Pelunasan", persen: 30, pemicu: "Dokumen terbit" },
    ],
  },
];

const pdfTemplates: PdfTemplate[] = [
  {
    nama: "Template Invoice Standar",
    documentType: "invoice",
    headerNote: "Mohon melakukan pembayaran sesuai nomor rekening yang tercantum.",
    footerNote: "Terima kasih atas kepercayaan Anda kepada PT Sinar Buana Mandiri Jaya.",
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set (see .env.example).");

  const sql = postgres(databaseUrl);
  try {
    for (const t of milestoneTemplates) {
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;
        const [existing] = await tx`select id from milestone_templates where name = ${t.nama}`;
        if (existing) { console.log(`Milestone template "${t.nama}" already exists — skipping.`); return; }
        const [tpl] = await tx`insert into milestone_templates (name) values (${t.nama}) returning id`;
        for (const [i, s] of t.steps.entries()) {
          await tx`insert into milestone_template_steps (template_id, name, sort_order, triggers_term)
                    values (${tpl.id}, ${s.nama}, ${i}, ${s.triggersTerm})`;
        }
        console.log(`Seeded milestone template: ${t.nama} (${t.steps.length} steps)`);
      });
    }

    for (const t of terminTemplates) {
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;
        const [existing] = await tx`select id from termin_templates where name = ${t.nama}`;
        if (existing) { console.log(`Termin template "${t.nama}" already exists — skipping.`); return; }
        const [tpl] = await tx`insert into termin_templates (name) values (${t.nama}) returning id`;
        for (const [i, s] of t.steps.entries()) {
          await tx`insert into termin_template_steps (template_id, label, percentage, milestone_trigger_label, sort_order)
                    values (${tpl.id}, ${s.label}, ${s.persen}, ${s.pemicu || null}, ${i})`;
        }
        console.log(`Seeded termin template: ${t.nama} (${t.steps.length} steps)`);
      });
    }

    for (const t of pdfTemplates) {
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;
        const [existing] = await tx`select id from pdf_templates where name = ${t.nama}`;
        if (existing) { console.log(`PDF template "${t.nama}" already exists — skipping.`); return; }
        await tx`insert into pdf_templates (name, document_type, header_note, footer_note)
                  values (${t.nama}, ${t.documentType}, ${t.headerNote}, ${t.footerNote})`;
        console.log(`Seeded PDF template: ${t.nama}`);
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
