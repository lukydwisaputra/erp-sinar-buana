-- ============================================================================
-- Shared helper functions + updated_at maintenance.
-- Apply after migrations/0000_init.sql and sql/indexes.sql.
-- ============================================================================

-- Resolve a workflow status to its stable system role (or NULL).
create or replace function status_role(p_status uuid)
returns status_system_role
language sql stable as $$
  select system_role from public.workflow_statuses where id = p_status;
$$;

-- Find a status id for an entity + system role (used to auto-advance statuses).
create or replace function status_id_for(
  p_entity workflow_entity,
  p_role   status_system_role
) returns uuid
language sql stable as $$
  select id from public.workflow_statuses
  where entity = p_entity and system_role = p_role
  order by sort_order
  limit 1;
$$;

-- Resolve a locked cashflow category id by its system key.
create or replace function cashflow_category_id(p_key cashflow_category_system_key)
returns uuid
language sql stable as $$
  select id from public.cashflow_categories where system_key = p_key limit 1;
$$;

-- ── updated_at maintenance ──────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Attach set_updated_at() to every public table that has an updated_at column.
do $$
declare r record;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I', r.table_name);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I '
      || 'for each row execute function set_updated_at()', r.table_name);
  end loop;
end $$;
