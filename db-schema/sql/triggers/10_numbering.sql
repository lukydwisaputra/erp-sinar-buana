-- ============================================================================
-- Document numbering (PRD Bab 9.5).
--   * Separate counters per doc type (SPH / INV / GAJ).
--   * Reset each month.
--   * Assigned once on insert; immutable on edit (we only set when NULL).
-- ============================================================================

create or replace function assign_document_number()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_doc     text := TG_ARGV[0];          -- 'SPH' | 'INV' | 'GAJ'
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

  -- payslips has no `date` column (period_start/period_end/paid_date instead)
  -- — branch so each doc type only ever accesses a column its own row has.
  if v_doc = 'GAJ' then
    v_year  := extract(year  from new.period_end)::int;
    v_month := extract(month from new.period_end)::int;
  else
    v_year  := extract(year  from new.date)::int;
    v_month := extract(month from new.date)::int;
  end if;

  select case v_doc when 'SPH' then sph_format when 'INV' then inv_format else gaj_format end,
         seq_padding
    into v_format, v_padding
  from public.numbering_settings
  limit 1;

  if v_format is null then
    v_format  := v_doc || '/{seq}/{month}.{year}';
    v_padding := 3;
  end if;

  -- Atomic per-(doc, year, month) increment with monthly reset.
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

drop trigger if exists trg_installments_number on installment_invoices;
create trigger trg_installments_number
  before insert on installment_invoices
  for each row execute function assign_document_number('INV');

drop trigger if exists trg_payslips_number on payslips;
create trigger trg_payslips_number
  before insert on payslips
  for each row execute function assign_document_number('GAJ');
