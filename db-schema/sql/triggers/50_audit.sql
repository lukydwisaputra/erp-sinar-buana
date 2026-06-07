-- ============================================================================
-- Audit log + project status log (PRD Bab 6.4, 13).
--   * Generic audit trigger on sensitive tables: invoices, payslips, projects,
--     tax entries, cashflow, and the configuration tables.
--   * Detects soft delete (deleted_at NULL -> set) and restore (set -> NULL).
--   * Actor = auth.uid() (the Supabase-authenticated user = user_profiles.id).
--   * A dedicated project status log feeds the activity feed.
-- ============================================================================

create or replace function fn_audit()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_action audit_action;
  v_actor  uuid;
  v_old    jsonb;
  v_new    jsonb;
  v_id     uuid;
begin
  begin
    v_actor := auth.uid();
  exception when others then
    v_actor := null;  -- outside a Supabase request context
  end;

  if TG_OP = 'INSERT' then
    v_action := 'insert';
    v_new := to_jsonb(new);
    v_id  := (v_new ->> 'id')::uuid;
  elsif TG_OP = 'DELETE' then
    v_action := 'hard_delete';
    v_old := to_jsonb(old);
    v_id  := (v_old ->> 'id')::uuid;
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id  := (v_new ->> 'id')::uuid;
    if (v_old ? 'deleted_at') then
      if v_old ->> 'deleted_at' is null and v_new ->> 'deleted_at' is not null then
        v_action := 'delete';
      elsif v_old ->> 'deleted_at' is not null and v_new ->> 'deleted_at' is null then
        v_action := 'restore';
      else
        v_action := 'update';
      end if;
    else
      v_action := 'update';
    end if;
  end if;

  insert into public.audit_log
    (table_name, record_id, action, actor_id, old_data, new_data)
  values
    (TG_TABLE_NAME, v_id, v_action, v_actor, v_old, v_new);

  return null;  -- AFTER trigger
end;
$$;

-- Attach the audit trigger to the sensitive tables.
do $$
declare
  t text;
  audited_tables text[] := array[
    'companies', 'service_catalog', 'employees',
    'quotations', 'projects',
    'master_invoices', 'installment_invoices',
    'payslips', 'cashflow_entries', 'tax_entries',
    'workflow_statuses', 'cashflow_categories', 'salary_components',
    'employment_statuses', 'bank_accounts', 'tax_settings',
    'numbering_settings', 'company_profile', 'user_profiles'
  ];
begin
  foreach t in array audited_tables loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format(
      'create trigger trg_audit after insert or update or delete on public.%I '
      || 'for each row execute function fn_audit()', t);
  end loop;
end $$;

-- ── Project status log ──────────────────────────────────────────────────────
create or replace function fn_project_status_log()
returns trigger language plpgsql
security definer set search_path = public as $$
declare v_actor uuid;
begin
  if TG_OP = 'UPDATE' and new.status_id is distinct from old.status_id then
    begin v_actor := auth.uid(); exception when others then v_actor := null; end;
    insert into public.project_status_log
      (project_id, from_status_id, to_status_id, changed_by)
    values (new.id, old.status_id, new.status_id, v_actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_status_log on projects;
create trigger trg_project_status_log
  after update on projects
  for each row execute function fn_project_status_log();
