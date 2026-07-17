-- ============================================================================
-- Row Level Security policies — encode the RBAC matrix (PRD Bab 2.2) and the
-- slip-gaji confidentiality rule (Bab 2.2 note / 5.2).
--
-- Model:
--   1. RLS is enabled on every public table; an `admin_all` policy gives Admin
--      full access everywhere.
--   2. A broad `read_auth` SELECT policy is applied to operational/master/config
--      tables that all signed-in staff may read (incl. config lists the UI needs
--      to render forms — a pragmatic read-only widening of the "Konfigurasi"
--      row, writes stay Admin-only).
--   3. Per-module policies grant the remaining role-specific writes/reads.
--
-- Multiple permissive policies are OR-combined. System-generated rows (numbering,
-- automation, audit) are written by SECURITY DEFINER functions and bypass RLS.
-- ============================================================================

-- ── 1. Enable RLS + Admin full access on every table ────────────────────────
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('drop policy if exists admin_all on public.%I', r.tablename);
    execute format(
      'create policy admin_all on public.%I for all to authenticated '
      || 'using (is_admin()) with check (is_admin())', r.tablename);
  end loop;
end $$;

-- ── 2. Broad SELECT for all authenticated staff — config/lookup tables only.
-- Proyek/SPH/Faktur moved out to §2b/2c below: a client-linked Viewer (PIC
-- portal — see 00_helpers.sql) must NOT get the blanket `using (true)` this
-- block grants, so those tables need role-conditional policies instead. ────
do $$
declare
  t text;
  read_auth text[] := array[
    'service_catalog',
    'document_types','authorities','legal_bases','admin_areas','positions',
    'employment_statuses','salary_components','bank_accounts',
    'cashflow_categories','workflow_statuses','message_templates',
    'milestone_templates','milestone_template_steps',
    'termin_templates','termin_template_steps','pdf_templates',
    'signature_templates',
    'rab_templates','rab_template_rows',
    'jadwal_templates','jadwal_template_rows','jadwal_template_marked_weeks',
    'kelengkapan_templates','kelengkapan_template_items',
    'company_profile','tax_settings','numbering_settings','dashboard_settings',
    'privacy_settings'
  ];
begin
  foreach t in array read_auth loop
    execute format('drop policy if exists read_auth on public.%I', t);
    execute format(
      'create policy read_auth on public.%I for select to authenticated using (true)',
      t);
  end loop;
end $$;

-- ── 2b. Proyek/SPH read — internal staff (everyone but Viewer) read
-- everything, unconditionally, matching what §2's read_auth used to grant
-- them. A client-linked Viewer instead gets §2c's per-row company-scoped
-- policies. Internal RAB planning detail and the comment/activity-log tables
-- are staff-only with NO client_read counterpart at all — never shown to a
-- client even on their own project (same principle as Realisasi RAB being
-- Finance-only elsewhere). ──────────────────────────────────────────────────
do $$
declare
  t text;
  staff_read_tables text[] := array[
    'quotation_rab_personnel','quotation_rab_direct_costs',
    'project_comments','comment_mentions','project_status_log',
    'companies','company_contacts',
    'quotations','quotation_items','quotation_term_scheme',
    'quotation_kelengkapan','quotation_kelengkapan_items',
    'activity_schedules','activity_schedule_rows','activity_schedule_marked_weeks',
    'projects','project_services','project_assignees','milestones','milestone_assignees'
  ];
begin
  foreach t in array staff_read_tables loop
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format(
      'create policy staff_read on public.%I for select to authenticated '
      || 'using (auth_role() <> ''viewer'')', t);
  end loop;
end $$;

-- ── 2c. Client portal — a Viewer linked to a company (Akun Pengguna's
-- "Tautan Perusahaan Klien") sees only that company's own Proyek/SPH rows.
-- Ownership can't be loop-generated (the join path differs per table), each
-- is written out explicitly on purpose — this is security-sensitive enough
-- that readability beats brevity. ───────────────────────────────────────────
drop policy if exists client_read on companies;
create policy client_read on companies for select to authenticated
  using (id = current_client_company_id());

drop policy if exists client_read on company_contacts;
create policy client_read on company_contacts for select to authenticated
  using (company_id = current_client_company_id());

drop policy if exists client_read on quotations;
create policy client_read on quotations for select to authenticated
  using (company_id = current_client_company_id());

drop policy if exists client_read on quotation_items;
create policy client_read on quotation_items for select to authenticated
  using (is_own_quotation(quotation_id));

drop policy if exists client_read on quotation_term_scheme;
create policy client_read on quotation_term_scheme for select to authenticated
  using (is_own_quotation(quotation_id));

drop policy if exists client_read on quotation_kelengkapan;
create policy client_read on quotation_kelengkapan for select to authenticated
  using (is_own_quotation(quotation_id));

drop policy if exists client_read on quotation_kelengkapan_items;
create policy client_read on quotation_kelengkapan_items for select to authenticated
  using (is_own_quotation_kelengkapan(quotation_kelengkapan_id));

drop policy if exists client_read on activity_schedules;
create policy client_read on activity_schedules for select to authenticated
  using (is_own_schedule(id));

drop policy if exists client_read on activity_schedule_rows;
create policy client_read on activity_schedule_rows for select to authenticated
  using (is_own_schedule(schedule_id));

drop policy if exists client_read on activity_schedule_marked_weeks;
create policy client_read on activity_schedule_marked_weeks for select to authenticated
  using (is_own_schedule_row(row_id));

drop policy if exists client_read on projects;
create policy client_read on projects for select to authenticated
  using (company_id = current_client_company_id());

drop policy if exists client_read on project_services;
create policy client_read on project_services for select to authenticated
  using (is_own_project(project_id));

drop policy if exists client_read on project_assignees;
create policy client_read on project_assignees for select to authenticated
  using (is_own_project(project_id));

drop policy if exists client_read on milestones;
create policy client_read on milestones for select to authenticated
  using (is_own_project(project_id));

drop policy if exists client_read on milestone_assignees;
create policy client_read on milestone_assignees for select to authenticated
  using (is_own_milestone(milestone_id));

-- ── 3a. Perusahaan & PIC — Sales may create/update; delete is Admin-only ─────
create policy companies_ins on companies for insert to authenticated with check (auth_role() = 'sales');
create policy companies_upd on companies for update to authenticated using (auth_role() = 'sales') with check (auth_role() = 'sales');
create policy contacts_ins on company_contacts for insert to authenticated with check (auth_role() = 'sales');
create policy contacts_upd on company_contacts for update to authenticated using (auth_role() = 'sales') with check (auth_role() = 'sales');

-- ── 3b. Katalog Layanan — Sales create/update (no delete) ───────────────────
create policy svc_ins on service_catalog for insert to authenticated with check (auth_role() = 'sales');
create policy svc_upd on service_catalog for update to authenticated using (auth_role() = 'sales') with check (auth_role() = 'sales');

-- ── 3c. Data Karyawan — read for Admin/Finance/Tech only; write Admin-only ──
create policy employees_sel on employees for select to authenticated
  using (auth_role() in ('admin','keuangan','tim_teknis'));
create policy emp_comp_sel on employee_salary_components for select to authenticated
  using (auth_role() in ('admin','keuangan','tim_teknis'));

-- ── 3d. Penawaran (SPH) — Sales full CRUD ───────────────────────────────────
do $$
declare t text;
  q text[] := array['quotations','quotation_items','quotation_term_scheme',
                    'quotation_rab_personnel','quotation_rab_direct_costs',
                    'quotation_kelengkapan','quotation_kelengkapan_items'];
begin
  foreach t in array q loop
    execute format(
      'create policy sales_write on public.%I for all to authenticated '
      || 'using (auth_role() = ''sales'') with check (auth_role() = ''sales'')', t);
  end loop;
end $$;

-- Activity schedules are shared by SPH (Sales) and Projects (Tech).
do $$
declare t text;
  s text[] := array['activity_schedules','activity_schedule_rows',
                    'activity_schedule_marked_weeks'];
begin
  foreach t in array s loop
    execute format(
      'create policy sched_write on public.%I for all to authenticated '
      || 'using (auth_role() in (''sales'',''tim_teknis'')) '
      || 'with check (auth_role() in (''sales'',''tim_teknis''))', t);
  end loop;
end $$;

-- ── 3e. Manajemen Proyek — Tech create/update; comments by any non-viewer ───
do $$
declare t text;
  p text[] := array['projects','project_services','project_assignees',
                    'milestones','milestone_assignees'];
begin
  foreach t in array p loop
    execute format(
      'create policy tech_ins on public.%I for insert to authenticated '
      || 'with check (is_tech())', t);
    execute format(
      'create policy tech_upd on public.%I for update to authenticated '
      || 'using (is_tech()) with check (is_tech())', t);
  end loop;
end $$;

create policy comments_ins on project_comments for insert to authenticated
  with check (auth_role() <> 'viewer');
create policy comments_upd_own on project_comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy mentions_ins on comment_mentions for insert to authenticated
  with check (auth_role() <> 'viewer');

-- ── 3f. Faktur — Keuangan-only end to end (read + write); Sales/Tim Teknis
-- see nothing, not even via a linked Proyek or Dasbor. A client-linked Viewer
-- gets its own narrower company-scoped read below (§3f-bis) — not is_finance,
-- never write access. ───────────────────────────────────────────────────────
do $$
declare t text;
  f text[] := array['master_invoices','master_invoice_services',
                    'master_invoice_terms','installment_invoices'];
begin
  foreach t in array f loop
    execute format(
      'create policy faktur_sel on public.%I for select to authenticated '
      || 'using (is_finance())', t);
    execute format(
      'create policy faktur_write on public.%I for all to authenticated '
      || 'using (is_finance()) with check (is_finance())', t);
  end loop;
end $$;

-- ── 3f-bis. Client portal — a Viewer sees their own company's invoices
-- (read-only, additive to faktur_sel above, which stays admin/keuangan-only). ─
drop policy if exists client_read on master_invoices;
create policy client_read on master_invoices for select to authenticated
  using (company_id = current_client_company_id());

drop policy if exists client_read on master_invoice_services;
create policy client_read on master_invoice_services for select to authenticated
  using (is_own_master_invoice(master_invoice_id));

drop policy if exists client_read on master_invoice_terms;
create policy client_read on master_invoice_terms for select to authenticated
  using (is_own_master_invoice(master_invoice_id));

drop policy if exists client_read on installment_invoices;
create policy client_read on installment_invoices for select to authenticated
  using (is_own_master_invoice(master_invoice_id));

-- ── 3g. Penggajian — Finance full; staff see only their OWN slip ────────────
create policy payslips_sel on payslips for select to authenticated
  using (is_finance() or employee_id = current_employee_id());
create policy payslips_write on payslips for all to authenticated
  using (is_finance()) with check (is_finance());

create policy payslip_comp_sel on payslip_components for select to authenticated
  using (exists (
    select 1 from payslips p
    where p.id = payslip_components.payslip_id
      and (is_finance() or p.employee_id = current_employee_id())));
create policy payslip_comp_write on payslip_components for all to authenticated
  using (is_finance()) with check (is_finance());

-- ── 3h. Arus Kas — Keuangan-only read (no Viewer); Finance write (not locked)
create policy cashflow_sel on cashflow_entries for select to authenticated
  using (is_finance());
create policy cashflow_ins on cashflow_entries for insert to authenticated
  with check (is_finance());
create policy cashflow_upd on cashflow_entries for update to authenticated
  using (is_finance() and is_locked = false)
  with check (is_finance() and is_locked = false);
create policy cashflow_del on cashflow_entries for delete to authenticated
  using (is_finance() and is_locked = false);

-- ── 3i. Perpajakan (Tax Center) — Admin/Finance only ────────────────────────
create policy tax_sel on tax_entries for select to authenticated using (is_finance());
create policy tax_write on tax_entries for all to authenticated
  using (is_finance()) with check (is_finance());

-- tax_settings already has the generic read_auth SELECT (all 5 roles need
-- ppnRate/pph23Rate/quotationValidityDays for SPH creation) + admin_all —
-- this adds the missing Keuangan write grant per the Tax Center RBAC row
-- (PRD 02-peran-rbac.md: Admin CRUDE, Keuangan CRUDES), matching tax_entries.
create policy tax_settings_write on tax_settings for all to authenticated
  using (is_finance()) with check (is_finance());

-- ── 3i-bis. Realisasi RAB — biaya/margin proyek = Admin/Finance only ─────────
-- Matches the `view_project_cost` rule (PRD Bab 6.8 / RBAC 2.2): Tim Teknis &
-- Sales see project progress but NOT cost/margin.
create policy rab_actuals_sel on rab_actuals for select to authenticated
  using (is_finance());
create policy rab_actuals_write on rab_actuals for all to authenticated
  using (is_finance()) with check (is_finance());

-- ── 3i-ter. Estimasi RAB (per-project, one-time copy of the SPH's RAB) —
-- same Admin/Finance-only rule as Realisasi RAB above; Tim Teknis/Sales/
-- client never see project cost planning, only progress. ───────────────────
drop policy if exists project_rab_estimates_sel on project_rab_estimates;
create policy project_rab_estimates_sel on project_rab_estimates for select to authenticated
  using (is_finance());
drop policy if exists project_rab_estimates_write on project_rab_estimates;
create policy project_rab_estimates_write on project_rab_estimates for all to authenticated
  using (is_finance()) with check (is_finance());

drop policy if exists project_rab_items_sel on project_rab_items;
create policy project_rab_items_sel on project_rab_items for select to authenticated
  using (is_finance());
drop policy if exists project_rab_items_write on project_rab_items;
create policy project_rab_items_write on project_rab_items for all to authenticated
  using (is_finance()) with check (is_finance());

-- ── 3j. Akun Pengguna — self read; Admin manages ───────────────────────────
create policy profiles_sel on user_profiles for select to authenticated
  using (id = auth.uid() or is_admin());

-- ── 3k. Notifications — own only ────────────────────────────────────────────
create policy notif_sel on notifications for select to authenticated
  using (user_id = auth.uid());
create policy notif_upd on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 3l. Attachments — invoice/comment files broad; tax = Finance; slip = own ─
create policy attach_sel on attachments for select to authenticated using (
  is_admin()
  or (payslip_id is null and tax_entry_id is null)
  or (tax_entry_id is not null and is_finance())
  or (payslip_id is not null and (
        is_finance()
        or exists (select 1 from payslips p
                   where p.id = attachments.payslip_id
                     and p.employee_id = current_employee_id())))
);
create policy attach_write on attachments for all to authenticated
  using (is_admin() or uploaded_by = auth.uid())
  with check (is_admin() or uploaded_by = auth.uid());

-- ── 3m. Internal numbering counters — Finance read; writes via DEFINER fn ────
create policy dns_sel on document_number_sequences for select to authenticated
  using (is_finance());

-- audit_log: Admin-only (covered by admin_all); inserts via DEFINER fn_audit.

-- ── 3n. Pengiriman Dokumen ───────────────────────────────────────────────────
-- email_accounts holds an encrypted SMTP secret — Admin-only read (not the
-- broad read_auth widening other settings singletons get; Konfigurasi's
-- Pengiriman tab is itself an admin-only route per nav.ts). Write already
-- covered by admin_all.
create policy email_accounts_sel on email_accounts for select to authenticated
  using (is_admin());

-- document_deliveries — read/create for the roles that actually use the
-- "Kirim Dokumen" dialog (SPH=sales, Faktur/Slip=keuangan), matching the
-- /dokumen page's nav.ts role list. No staff update/delete policy: rows are
-- append-only from the app's perspective — the worker flips status via
-- service_role (bypasses RLS), and Admin already has full access via admin_all.
create policy deliveries_sel on document_deliveries for select to authenticated
  using (auth_role() in ('admin','keuangan','sales'));
create policy deliveries_ins on document_deliveries for insert to authenticated
  with check (auth_role() in ('admin','keuangan','sales'));
