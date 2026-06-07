-- ============================================================================
-- Tax Center automation (PRD Bab 10.6).
--   * Tax entry -> "Sudah Disetor":
--       - nature = kewajiban -> create a locked cashflow Debit (category PAJAK,
--         or BPJS for BPJS types), linked to the tax entry.
--       - nature = kredit (PPh23 withheld) -> NO cash movement (it's a tax credit).
--   * Also flips overdue unsettled entries to 'terlambat' on write (a scheduled
--     job should sweep the table daily for time-based transitions).
-- ============================================================================

create or replace function fn_tax_entry_after_change()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_cat_key cashflow_category_system_key;
  v_when    date := coalesce(new.settled_date, current_date);
begin
  if new.settlement_status = 'sudah_disetor'
     and (TG_OP = 'INSERT' or old.settlement_status is distinct from 'sudah_disetor')
  then
    -- PPh23 withheld is a tax credit — no cash out.
    if new.nature = 'kewajiban' then
      if not exists (select 1 from public.cashflow_entries
                     where tax_entry_id = new.id and is_locked) then
        v_cat_key := case
          when new.tax_type in ('bpjs_kesehatan', 'bpjs_ketenagakerjaan')
          then 'BPJS' else 'PAJAK' end;

        insert into public.cashflow_entries
          (type, date, amount, category_id, source, tax_component, description,
           is_locked, tax_entry_id)
        values
          ('debit', v_when, new.amount, cashflow_category_id(v_cat_key),
           'pajak',
           (case when v_cat_key = 'BPJS' then 'bpjs'
                 when new.tax_type = 'pph21' then 'pph21'
                 else 'ppn_keluaran' end)::cashflow_tax_component,
           'Setor ' || new.tax_type::text
             || coalesce(' (NTPN ' || new.ntpn || ')', ''),
           true, new.id);
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tax_entry_after_change on tax_entries;
create trigger trg_tax_entry_after_change
  after insert or update on tax_entries
  for each row execute function fn_tax_entry_after_change();

-- ── Overdue sweep (call from a scheduled job / pg_cron) ─────────────────────
-- Flips unsettled, past-due entries to 'terlambat' (🔴). Run daily.
create or replace function mark_overdue_tax_entries()
returns void language sql as $$
  update public.tax_entries
     set settlement_status = 'terlambat'
   where settlement_status = 'belum_disetor'
     and due_date is not null
     and due_date < current_date
     and deleted_at is null;
$$;
