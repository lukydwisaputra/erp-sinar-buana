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

-- Convenience predicates.
create or replace function is_admin() returns boolean
language sql stable as $$ select auth_role() = 'admin'; $$;

create or replace function is_finance() returns boolean
language sql stable as $$ select auth_role() in ('admin', 'keuangan'); $$;

create or replace function is_sales() returns boolean
language sql stable as $$ select auth_role() in ('admin', 'sales'); $$;

create or replace function is_tech() returns boolean
language sql stable as $$ select auth_role() in ('admin', 'tim_teknis'); $$;
