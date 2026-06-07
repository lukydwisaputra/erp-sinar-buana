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

-- ── 2. Broad SELECT for all authenticated staff ─────────────────────────────
do $$
declare
  t text;
  read_auth text[] := array[
    'companies','company_contacts','service_catalog',
    'document_types','authorities','legal_bases','admin_areas','positions',
    'employment_statuses','salary_components','bank_accounts',
    'cashflow_categories','workflow_statuses','message_templates',
    'milestone_templates','milestone_template_steps',
    'company_profile','tax_settings','numbering_settings','dashboard_settings',
    'quotations','quotation_items','quotation_term_scheme',
    'quotation_rab_personnel','quotation_rab_direct_costs',
    'activity_schedules','activity_schedule_rows','activity_schedule_marked_weeks',
    'projects','project_services','project_assignees','milestones',
    'project_comments','comment_mentions','project_status_log'
  ];
begin
  foreach t in array read_auth loop
    execute format('drop policy if exists read_auth on public.%I', t);
    execute format(
      'create policy read_auth on public.%I for select to authenticated using (true)',
      t);
  end loop;
end $$;

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
                    'quotation_rab_personnel','quotation_rab_direct_costs'];
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
                    'milestones'];
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

-- ── 3f. Faktur — read for all non-viewer staff; write Finance ───────────────
do $$
declare t text;
  f text[] := array['master_invoices','master_invoice_services',
                    'master_invoice_terms','installment_invoices'];
begin
  foreach t in array f loop
    execute format(
      'create policy faktur_sel on public.%I for select to authenticated '
      || 'using (auth_role() in (''admin'',''keuangan'',''sales'',''tim_teknis''))', t);
    execute format(
      'create policy faktur_write on public.%I for all to authenticated '
      || 'using (is_finance()) with check (is_finance())', t);
  end loop;
end $$;

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

-- ── 3h. Arus Kas — Admin/Finance/Viewer read; Finance write (not locked) ────
create policy cashflow_sel on cashflow_entries for select to authenticated
  using (auth_role() in ('admin','keuangan','viewer'));
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

-- ── 3i-bis. Realisasi RAB — biaya/margin proyek = Admin/Finance only ─────────
-- Matches the `view_project_cost` rule (PRD Bab 6.8 / RBAC 2.2): Tim Teknis &
-- Sales see project progress but NOT cost/margin.
create policy rab_actuals_sel on rab_actuals for select to authenticated
  using (is_finance());
create policy rab_actuals_write on rab_actuals for all to authenticated
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
