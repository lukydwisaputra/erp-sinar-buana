-- ============================================================================
-- RLS helper functions.
-- SECURITY DEFINER so they can read user_profiles regardless of its own RLS;
-- search_path pinned to public for safety.
-- ============================================================================

-- Current user's RBAC role (NULL if no profile / unauthenticated).
create or replace function auth_role()
returns app_role
language sql stable security definer set search_path = public as $$
  select role from public.user_profiles where id = auth.uid();
$$;

-- Current user's linked employee id (for "own payslip" / assignment checks).
create or replace function current_employee_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select employee_id from public.user_profiles where id = auth.uid();
$$;

-- Current user's linked client-company id — external client-contact (PIC)
-- accounts only, role='viewer', scoped to one company's own Proyek/SPH/
-- Faktur (see 10_policies.sql §2b/2c). NULL for internal staff.
create or replace function current_client_company_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select client_company_id from public.user_profiles where id = auth.uid();
$$;

-- Ownership predicates for the client portal — each independently re-derives
-- ownership from company_id rather than trusting a parent row's own RLS, so
-- they stay correct even if a future policy change reorders things.
create or replace function is_own_quotation(qid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.quotations where id = qid and company_id = current_client_company_id());
$$;

create or replace function is_own_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = pid and company_id = current_client_company_id());
$$;

create or replace function is_own_master_invoice(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.master_invoices where id = mid and company_id = current_client_company_id());
$$;

create or replace function is_own_schedule(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.activity_schedules a
    where a.id = sid
      and ((a.quotation_id is not null and is_own_quotation(a.quotation_id))
        or (a.project_id is not null and is_own_project(a.project_id)))
  );
$$;

create or replace function is_own_schedule_row(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.activity_schedule_rows r
    where r.id = rid and is_own_schedule(r.schedule_id)
  );
$$;

create or replace function is_own_milestone(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.milestones m where m.id = mid and is_own_project(m.project_id)
  );
$$;

create or replace function is_own_quotation_kelengkapan(kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.quotation_kelengkapan qk where qk.id = kid and is_own_quotation(qk.quotation_id)
  );
$$;

-- Convenience predicates.
create or replace function is_admin() returns boolean
language sql stable as $$ select auth_role() = 'admin'; $$;

create or replace function is_finance() returns boolean
language sql stable as $$ select auth_role() in ('admin', 'keuangan'); $$;

create or replace function is_sales() returns boolean
language sql stable as $$ select auth_role() in ('admin', 'sales'); $$;

create or replace function is_tech() returns boolean
language sql stable as $$ select auth_role() in ('admin', 'tim_teknis'); $$;
