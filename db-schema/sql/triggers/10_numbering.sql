-- ============================================================================
-- Document numbering (PRD Bab 9.5).
--   * Separate counters per doc type.
--   * SPH / INV / GAJ reset each month (keyed by real year/month).
--   * PRY / PRS / KLG / LYN / KRY never reset — one-off record-creation
--     events (project, company, checklist template, service catalog entry,
--     employee), not recurring periodic documents. Keyed on a fixed
--     (year=0, month=0) sentinel in document_number_sequences so the same
--     counter row is reused forever; they don't read any date column off
--     the row.
--   * Faktur Induk (master_invoices) uses 'INV' too, but resets YEARLY, not
--     monthly (e.g. INV/001/2026, no month token) — keyed off `created_at`'s
--     year with month fixed at the (year, 0) bucket, since the table has no
--     `date` column of its own. Invoice Termin (installment_invoices) is NOT
--     independently numbered by this trigger at all anymore — its displayed
--     number is derived app-side as "{indukNumber}-T{index}"
--     (src/lib/faktur/mapping.ts), matching the PRD's Induk→Termin hierarchy
--     (a termin has no identity of its own separate from its Induk). 'FKI'
--     is a retired, unused doc type — kept in the enum (Postgres can't
--     cheaply drop enum values) but no trigger references it anymore.
--   * Assigned once on insert; immutable on edit (we only set when NULL).
-- ============================================================================

create or replace function assign_document_number()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_doc     text := TG_ARGV[0];          -- 'SPH' | 'INV' | 'GAJ' | 'PRY' | 'PRS' | 'KLG' | 'LYN' | 'KRY'
  v_reset   boolean := v_doc in ('SPH', 'INV', 'GAJ');
  v_year    int;
  v_month   int;
  v_seq     int;
  v_format  text;
  v_padding int;
begin
  -- Immutable: never reassign once a number exists (survives edits).
  if new.number is not null then
    return new;
  end if;

  if not v_reset then
    -- Non-reset types have no date column to key off — fixed sentinel.
    v_year  := 0;
    v_month := 0;
  elsif v_doc = 'GAJ' then
    -- payslips has no `date` column (period_start/period_end/paid_date instead)
    -- — branch so each doc type only ever accesses a column its own row has.
    v_year  := extract(year  from new.period_end)::int;
    v_month := extract(month from new.period_end)::int;
  elsif v_doc = 'INV' and TG_TABLE_NAME = 'master_invoices' then
    -- master_invoices has no `date` column either — key off created_at.
    -- Resets yearly, not monthly, so month is pinned to a fixed 0 bucket
    -- (format has no {month} token — e.g. INV/001/2026).
    v_year  := extract(year from new.created_at)::int;
    v_month := 0;
  else
    v_year  := extract(year  from new.date)::int;
    v_month := extract(month from new.date)::int;
  end if;

  select case v_doc
           when 'SPH' then sph_format
           when 'INV' then inv_format
           when 'GAJ' then gaj_format
           when 'PRY' then pry_format
           when 'PRS' then prs_format
           when 'KLG' then klg_format
           when 'LYN' then lyn_format
           else kry_format -- 'KRY'
         end,
         seq_padding
    into v_format, v_padding
  from public.numbering_settings
  limit 1;

  if v_format is null then
    v_format  := case when v_reset then v_doc || '/{seq}/{month}.{year}' else v_doc || '/{seq}' end;
    v_padding := 3;
  end if;

  -- Atomic per-(doc, year, month) increment; non-reset types always hit the
  -- same (doc, 0, 0) row, so last_number just keeps climbing.
  insert into public.document_number_sequences (doc_type, year, month, last_number)
    values (v_doc::numbered_doc_type, v_year, v_month, 1)
  on conflict (doc_type, year, month)
    do update set last_number = public.document_number_sequences.last_number + 1,
                  updated_at  = now()
  returning last_number into v_seq;

  new.number := replace(replace(replace(
      v_format,
      '{seq}',   lpad(v_seq::text, v_padding, '0')),
      '{month}', v_month::text),
      '{year}',  v_year::text);
  new.number_year  := v_year;
  new.number_month := v_month;
  return new;
end;
$$;

drop trigger if exists trg_quotations_number on quotations;
create trigger trg_quotations_number
  before insert on quotations
  for each row execute function assign_document_number('SPH');

-- Invoice Termin is NOT independently numbered — dropped, not recreated.
-- Its displayed number is derived app-side from its parent Induk's number
-- + its position (see src/lib/faktur/mapping.ts's toInvoiceTermin).
drop trigger if exists trg_installments_number on installment_invoices;

drop trigger if exists trg_payslips_number on payslips;
create trigger trg_payslips_number
  before insert on payslips
  for each row execute function assign_document_number('GAJ');

drop trigger if exists trg_projects_number on projects;
create trigger trg_projects_number
  before insert on projects
  for each row execute function assign_document_number('PRY');

drop trigger if exists trg_companies_number on companies;
create trigger trg_companies_number
  before insert on companies
  for each row execute function assign_document_number('PRS');

drop trigger if exists trg_kelengkapan_templates_number on kelengkapan_templates;
create trigger trg_kelengkapan_templates_number
  before insert on kelengkapan_templates
  for each row execute function assign_document_number('KLG');

drop trigger if exists trg_master_invoices_number on master_invoices;
create trigger trg_master_invoices_number
  before insert on master_invoices
  for each row execute function assign_document_number('INV');

drop trigger if exists trg_service_catalog_number on service_catalog;
create trigger trg_service_catalog_number
  before insert on service_catalog
  for each row execute function assign_document_number('LYN');

drop trigger if exists trg_employees_number on employees;
create trigger trg_employees_number
  before insert on employees
  for each row execute function assign_document_number('KRY');

-- ============================================================================
-- One-time backfill: PRY/PRS/KLG/LYN/KRY/master_invoices existed before their
-- trigger did (BEFORE INSERT-only), so pre-existing rows have number IS
-- NULL. Assign them in created_at order, then seed document_number_sequences
-- so the next trigger-assigned number continues from there. Idempotent —
-- re-running only touches rows still missing a number (a no-op once nothing
-- is NULL).
-- ============================================================================

do $$
declare
  v_format  text;
  v_padding int;
begin
  -- Proyek
  select pry_format, seq_padding into v_format, v_padding from public.numbering_settings limit 1;
  with numbered as (
    select id, row_number() over (order by created_at, id) as rn
    from public.projects where number is null
  )
  update public.projects p
  set number = replace(coalesce(v_format, 'PRY/{seq}'), '{seq}', lpad(n.rn::text, coalesce(v_padding, 3), '0')),
      number_year = 0, number_month = 0
  from numbered n where p.id = n.id;

  insert into public.document_number_sequences (doc_type, year, month, last_number)
  select 'PRY'::numbered_doc_type, 0, 0, count(*) from public.projects where number is not null
  having count(*) > 0
  on conflict (doc_type, year, month) do update set last_number = excluded.last_number, updated_at = now();

  -- Perusahaan
  select prs_format, seq_padding into v_format, v_padding from public.numbering_settings limit 1;
  with numbered as (
    select id, row_number() over (order by created_at, id) as rn
    from public.companies where number is null
  )
  update public.companies c
  set number = replace(coalesce(v_format, 'PRS/{seq}'), '{seq}', lpad(n.rn::text, coalesce(v_padding, 3), '0')),
      number_year = 0, number_month = 0
  from numbered n where c.id = n.id;

  insert into public.document_number_sequences (doc_type, year, month, last_number)
  select 'PRS'::numbered_doc_type, 0, 0, count(*) from public.companies where number is not null
  having count(*) > 0
  on conflict (doc_type, year, month) do update set last_number = excluded.last_number, updated_at = now();

  -- Kelengkapan Administrasi (template)
  select klg_format, seq_padding into v_format, v_padding from public.numbering_settings limit 1;
  with numbered as (
    select id, row_number() over (order by created_at, id) as rn
    from public.kelengkapan_templates where number is null
  )
  update public.kelengkapan_templates k
  set number = replace(coalesce(v_format, 'KLG/{seq}'), '{seq}', lpad(n.rn::text, coalesce(v_padding, 3), '0')),
      number_year = 0, number_month = 0
  from numbered n where k.id = n.id;

  insert into public.document_number_sequences (doc_type, year, month, last_number)
  select 'KLG'::numbered_doc_type, 0, 0, count(*) from public.kelengkapan_templates where number is not null
  having count(*) > 0
  on conflict (doc_type, year, month) do update set last_number = excluded.last_number, updated_at = now();

  -- Faktur Induk (master invoice) — real YEARLY-reset 'INV' numbering
  -- (e.g. INV/001/2026, no month token), keyed off created_at (no `date`
  -- column on this table), bucketed per year only (month pinned to 0,
  -- matching the trigger's own INV/master_invoices branch).
  select inv_format, seq_padding into v_format, v_padding from public.numbering_settings limit 1;
  with numbered as (
    select id,
           extract(year from created_at)::int as yr,
           row_number() over (
             partition by extract(year from created_at)
             order by created_at, id
           ) as rn
    from public.master_invoices where number is null
  )
  update public.master_invoices m
  set number = replace(replace(
        coalesce(v_format, 'INV/{seq}/{year}'),
        '{seq}',  lpad(n.rn::text, coalesce(v_padding, 3), '0')),
        '{year}', n.yr::text),
      number_year = n.yr, number_month = 0
  from numbered n where m.id = n.id;

  insert into public.document_number_sequences (doc_type, year, month, last_number)
  select 'INV'::numbered_doc_type, number_year, 0, count(*)
  from public.master_invoices where number is not null
  group by number_year
  on conflict (doc_type, year, month) do update set last_number = excluded.last_number, updated_at = now();

  -- Katalog Layanan (service catalog)
  select lyn_format, seq_padding into v_format, v_padding from public.numbering_settings limit 1;
  with numbered as (
    select id, row_number() over (order by created_at, id) as rn
    from public.service_catalog where number is null
  )
  update public.service_catalog s
  set number = replace(coalesce(v_format, 'LYN/{seq}'), '{seq}', lpad(n.rn::text, coalesce(v_padding, 3), '0')),
      number_year = 0, number_month = 0
  from numbered n where s.id = n.id;

  insert into public.document_number_sequences (doc_type, year, month, last_number)
  select 'LYN'::numbered_doc_type, 0, 0, count(*) from public.service_catalog where number is not null
  having count(*) > 0
  on conflict (doc_type, year, month) do update set last_number = excluded.last_number, updated_at = now();

  -- Karyawan (employees)
  select kry_format, seq_padding into v_format, v_padding from public.numbering_settings limit 1;
  with numbered as (
    select id, row_number() over (order by created_at, id) as rn
    from public.employees where number is null
  )
  update public.employees e
  set number = replace(coalesce(v_format, 'KRY/{seq}'), '{seq}', lpad(n.rn::text, coalesce(v_padding, 3), '0')),
      number_year = 0, number_month = 0
  from numbered n where e.id = n.id;

  insert into public.document_number_sequences (doc_type, year, month, last_number)
  select 'KRY'::numbered_doc_type, 0, 0, count(*) from public.employees where number is not null
  having count(*) > 0
  on conflict (doc_type, year, month) do update set last_number = excluded.last_number, updated_at = now();
end $$;
