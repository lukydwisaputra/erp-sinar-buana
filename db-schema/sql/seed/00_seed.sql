-- ============================================================================
-- Seed defaults (PRD: example values are DEFAULTS, client-managed via Bab 9).
-- Idempotent — safe to re-run. Apply last, after schema + triggers + RLS.
-- ============================================================================

-- ── Singletons ──────────────────────────────────────────────────────────────
insert into company_profile (legal_name, is_pkp)
  values ('PT SINAR BUANA MANDIRI JAYA', true)
  on conflict (singleton) do nothing;

insert into tax_settings default values on conflict (singleton) do nothing;
insert into numbering_settings default values on conflict (singleton) do nothing;
insert into dashboard_settings default values on conflict (singleton) do nothing;
insert into email_accounts default values on conflict (singleton) do nothing;
insert into privacy_settings default values on conflict (singleton) do nothing;

-- ── Cashflow categories (4 locked system + BPJS) ────────────────────────────
-- expense_nature drives the Dashboard P&L (PRD Bab 8.2). PAJAK = NON_LABA_RUGI
-- (titipan/kredit, not an expense); project HPP comes from rab_actuals, so no
-- locked category is HPP. FAKTUR is the income category (nature unused for kredit).
insert into cashflow_categories (label, system_key, expense_nature, is_system, sort_order) values
  ('Faktur',     'FAKTUR',     'OPERASIONAL',   true, 1),
  ('Penggajian', 'PENGGAJIAN', 'OPERASIONAL',   true, 2),
  ('Pajak',      'PAJAK',      'NON_LABA_RUGI', true, 3),
  ('BPJS',       'BPJS',       'OPERASIONAL',   true, 4),
  ('Bonus',      'BONUS',      'OPERASIONAL',   true, 5)
on conflict do nothing;

-- ── Cashflow categories — Pembatalan Penawaran (client request). Locked/system
-- so fn_installment_after_change can look up ADMIN_PEMBATALAN reliably. ──────
insert into cashflow_categories (label, system_key, expense_nature, is_system, sort_order) values
  ('Pengembalian Pembatalan',       'REFUND_PEMBATALAN', 'OPERASIONAL', true, 6),
  ('Biaya Administrasi Pembatalan', 'ADMIN_PEMBATALAN',  'OPERASIONAL', true, 7)
on conflict do nothing;

-- ── Workflow statuses (label + stable system role) ──────────────────────────
insert into workflow_statuses (entity, label, system_role, sort_order, is_default) values
  -- Penawaran
  ('penawaran','Draft',             null,      1, true),
  ('penawaran','Leads - Terkirim',  null,      2, false),
  ('penawaran','Convert - Deal',    null,      3, false),
  ('penawaran','Batal',             'BATAL',   9, false),
  -- Proyek
  ('proyek','PO/Kontrak',           null,      1, true),
  ('proyek','Collecting Data',      null,      2, false),
  ('proyek','Drafting',             null,      3, false),
  ('proyek','Tunggu Pengesahan',    null,      4, false),
  ('proyek','Pending',              null,      5, false),
  ('proyek','Selesai',              'SELESAI', 6, false),
  ('proyek','Batal',                'BATAL',   9, false),
  -- Faktur (master + termin)
  ('faktur','Belum Lunas',          null,      1, true),
  ('faktur','Lunas',                'LUNAS',   2, false),
  ('faktur','Batal',                'BATAL',   9, false),
  -- Penggajian
  ('penggajian','Menunggu Pembayaran', null,    1, true),
  ('penggajian','Sudah Dibayar',       'DIBAYAR',2, false),
  ('penggajian','Batal',               'BATAL', 9, false),
  -- Milestone
  ('milestone','Belum',             null,      1, true),
  ('milestone','Proses',            null,      2, false),
  ('milestone','Selesai',           'SELESAI', 3, false)
on conflict (entity, label) do nothing;

-- ── Lookups ─────────────────────────────────────────────────────────────────
insert into authorities (label, sort_order) values
  ('Provinsi', 1), ('Kota/Kabupaten', 2), ('Kawasan Industri', 3)
on conflict do nothing;

insert into document_types (label, sort_order) values
  ('Rintek LB3', 1), ('Standar Teknis (Pertek)', 2), ('SPPL', 3),
  ('UKL-UPL', 4), ('RKL-RPL Rinci', 5), ('Andalalin', 6),
  ('SLO', 7), ('Laporan Semester', 8)
on conflict do nothing;

insert into positions (label, sort_order) values
  ('Direktur', 1), ('Ketua Tim', 2), ('Staff Teknik', 3),
  ('Document Controller', 4), ('Anggota', 5), ('Keuangan', 6)
on conflict do nothing;

insert into employment_statuses (label, multiplier, sort_order) values
  ('Probation', 0.8, 1), ('Tetap', 1.0, 2), ('Kontrak', 1.0, 3)
on conflict do nothing;

insert into salary_components (label, kind, calc_type, default_value, is_employer_portion, sort_order) values
  ('Tunjangan Transport',        'tunjangan', 'nominal',    0, false, 1),
  ('Lembur',                     'tunjangan', 'per_hari',   0, false, 2),
  ('BPJS Kesehatan (Karyawan)',  'potongan',  'persentase', 1, false, 3),
  ('BPJS Kesehatan (Perusahaan)','potongan',  'persentase', 4, true,  4),
  ('BPJS TK (Karyawan)',         'potongan',  'persentase', 2, false, 5)
on conflict do nothing;

insert into bank_accounts (label, bank_name, account_holder, account_number, is_default, sort_order) values
  ('BNI - Operasional', 'BNI', 'SINAR BUANA MANDIRI JAYA', '0559332815', true, 1)
on conflict do nothing;

-- ── Default milestone template (12 langkah dari Estimasi Jadwal nyata) ───────
do $$
declare v_tpl uuid;
begin
  if not exists (select 1 from milestone_templates
                 where name = 'Template Standar Dokumen Lingkungan (12 Langkah)') then
    insert into milestone_templates (name, description)
      values ('Template Standar Dokumen Lingkungan (12 Langkah)',
              'Langkah default proyek dokumen lingkungan (PRD Bab 6.2).')
      returning id into v_tpl;

    insert into milestone_template_steps (template_id, name, sort_order, triggers_term) values
      (v_tpl, 'Survey Lokasi',                        1,  false),
      (v_tpl, 'Pengumpulan Data & Berkas Administrasi',2, false),
      (v_tpl, 'Penyusunan Dokumen',                   3,  false),
      (v_tpl, 'Rapat Internal Awal',                  4,  false),
      (v_tpl, 'Penyelesaian Draft & Gambar',          5,  false),
      (v_tpl, 'Asistensi dengan Pihak LH',            6,  false),
      (v_tpl, 'Revisi Dokumen',                       7,  false),
      (v_tpl, 'Finalisasi Dokumen',                   8,  false),
      (v_tpl, 'Pengumpulan Dokumen Final ke LH',      9,  false),
      (v_tpl, 'Pembahasan dengan LH',                 10, false),
      (v_tpl, 'Revisi Akhir',                         11, false),
      (v_tpl, 'Penerbitan Dokumen',                   12, true);
  end if;
end $$;

-- ── Message templates (defaults; tokens substituted by the app) ─────────────
insert into message_templates (channel, document_type, subject, body) values
  ('email','sph','Penawaran Harga {no_sph} - {nama_perusahaan}',
    'Yth. {pic},\n\nBersama ini kami sampaikan Surat Penawaran Harga {no_sph}. Dokumen terlampir.\n\nHormat kami,\nPT SINAR BUANA MANDIRI JAYA'),
  ('email','invoice','Invoice {no_inv} - {nama_perusahaan}',
    'Yth. {pic},\n\nTerlampir Invoice {no_inv} dengan jatuh tempo {jatuh_tempo}.\n\nTerima kasih.'),
  ('email','slip_gaji','Slip Gaji {periode}',
    'Yth. {nama_karyawan},\n\nTerlampir slip gaji periode {periode}.\n\nRahasia & hanya untuk Anda.'),
  ('whatsapp','sph',null,
    'Halo {pic}, berikut Penawaran Harga {no_sph} dari PT SBMJ. Mohon cek lampiran PDF. Terima kasih.'),
  ('whatsapp','invoice',null,
    'Halo {pic}, terlampir Invoice {no_inv} (jatuh tempo {jatuh_tempo}). Terima kasih.'),
  ('whatsapp','slip_gaji',null,
    'Halo {nama_karyawan}, terlampir slip gaji periode {periode}. Bersifat rahasia.')
on conflict (channel, document_type) do nothing;
