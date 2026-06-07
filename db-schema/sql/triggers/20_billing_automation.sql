-- ============================================================================
-- Billing automation (PRD Bab 5.1, 7.3, 10.4).
--   * Guard: total of all terms must not exceed the master invoice Total Biaya.
--   * Installment -> LUNAS  : create 3 locked cashflow entries (service income,
--                             output VAT, withheld PPh23) + Tax Center entries.
--   * Roll-up               : master invoice becomes LUNAS once paid value >=
--                             Total Biaya.
--   * Installment -> BATAL  : cancel its locked cashflow + drop unsettled auto
--                             tax entries.
-- Tax amounts come from the snapshot columns on the installment (app computes
-- them with round-half-up; PPN is 0 when the company is non-PKP).
-- ============================================================================

-- ── Guard: Σ term values ≤ Total Biaya ──────────────────────────────────────
create or replace function fn_installment_validate()
returns trigger language plpgsql as $$
declare
  v_total numeric;
  v_sum   numeric;
begin
  select total_cost into v_total
  from public.master_invoices where id = new.master_invoice_id;

  select coalesce(sum(current_term_value), 0) into v_sum
  from public.installment_invoices
  where master_invoice_id = new.master_invoice_id
    and id <> new.id
    and deleted_at is null;

  if v_sum + coalesce(new.current_term_value, 0) > coalesce(v_total, 0) + 0.01 then
    raise exception
      'Total termin (%) melebihi Total Biaya faktur induk (%)',
      v_sum + coalesce(new.current_term_value, 0), v_total;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_installment_validate on installment_invoices;
create trigger trg_installment_validate
  before insert or update on installment_invoices
  for each row execute function fn_installment_validate();

-- ── Status-driven automation ────────────────────────────────────────────────
create or replace function fn_installment_after_change()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_new_role  status_system_role := status_role(new.status_id);
  v_old_role  status_system_role := case when TG_OP = 'UPDATE'
                                         then status_role(old.status_id) end;
  v_company   uuid;
  v_period    date := date_trunc('month', coalesce(new.paid_date, new.date))::date;
  v_day_ppn   smallint;
  v_day_pph   smallint;
  v_ppn_due   date;
  v_pph_due   date;
  v_when      date := coalesce(new.paid_date, new.date);
begin
  -- INTO LUNAS
  if v_new_role = 'LUNAS' and (v_old_role is distinct from 'LUNAS') then
    if not exists (select 1 from public.cashflow_entries
                   where installment_invoice_id = new.id and is_locked) then
      select company_id into v_company
      from public.master_invoices where id = new.master_invoice_id;

      select ppn_setor_day, pph23_setor_day into v_day_ppn, v_day_pph
      from public.tax_settings limit 1;

      v_ppn_due := (date_trunc('month', v_period) + interval '1 month'
                    + (coalesce(v_day_ppn, 31) - 1) * interval '1 day')::date;
      v_pph_due := (date_trunc('month', v_period) + interval '1 month'
                    + (coalesce(v_day_pph, 10) - 1) * interval '1 day')::date;

      -- (1) Service income (full term value) — Kredit, category FAKTUR
      insert into public.cashflow_entries
        (type, date, amount, category_id, source, tax_component, description,
         is_locked, installment_invoice_id)
      values
        ('kredit', v_when, new.current_term_value, cashflow_category_id('FAKTUR'),
         'faktur', 'jasa', 'Pendapatan jasa ' || coalesce(new.number, ''),
         true, new.id);

      -- (2) Output VAT (held for the state) — Kredit, category PAJAK
      if coalesce(new.ppn, 0) > 0 then
        insert into public.cashflow_entries
          (type, date, amount, category_id, source, tax_component, description,
           is_locked, installment_invoice_id)
        values
          ('kredit', v_when, new.ppn, cashflow_category_id('PAJAK'),
           'faktur', 'ppn_keluaran', 'PPN Keluaran ' || coalesce(new.number, ''),
           true, new.id);

        insert into public.tax_entries
          (tax_type, nature, tax_period, amount, installment_invoice_id,
           company_id, due_date, settlement_status)
        values
          ('ppn_keluaran', 'kewajiban', v_period, new.ppn, new.id,
           v_company, v_ppn_due, 'belum_disetor');
      end if;

      -- (3) PPh23 withheld by client (reduces cash received) — Debit, PAJAK
      if coalesce(new.pph23, 0) > 0 then
        insert into public.cashflow_entries
          (type, date, amount, category_id, source, tax_component, description,
           is_locked, installment_invoice_id)
        values
          ('debit', v_when, new.pph23, cashflow_category_id('PAJAK'),
           'faktur', 'pph23_dipotong',
           'PPh23 dipotong klien ' || coalesce(new.number, ''), true, new.id);

        insert into public.tax_entries
          (tax_type, nature, tax_period, amount, installment_invoice_id,
           company_id, due_date, settlement_status)
        values
          ('pph23_dipotong', 'kredit', v_period, new.pph23, new.id,
           v_company, v_pph_due, 'belum_disetor');
      end if;
    end if;

    -- Roll up master invoice to LUNAS once paid value covers Total Biaya.
    if (select coalesce(sum(current_term_value), 0)
        from public.installment_invoices
        where master_invoice_id = new.master_invoice_id
          and deleted_at is null
          and status_role(status_id) = 'LUNAS')
       >= (select total_cost from public.master_invoices
           where id = new.master_invoice_id)
    then
      update public.master_invoices
        set status_id = coalesce(status_id_for('faktur', 'LUNAS'), status_id)
        where id = new.master_invoice_id
          and status_role(status_id) is distinct from 'LUNAS';
    end if;
  end if;

  -- INTO BATAL: cancel dependent locked cashflow + drop unsettled auto tax.
  if v_new_role = 'BATAL' and (v_old_role is distinct from 'BATAL') then
    update public.cashflow_entries set is_cancelled = true
      where installment_invoice_id = new.id and is_locked;
    update public.tax_entries set deleted_at = now()
      where installment_invoice_id = new.id
        and settlement_status = 'belum_disetor'
        and deleted_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_installment_after_change on installment_invoices;
create trigger trg_installment_after_change
  after insert or update on installment_invoices
  for each row execute function fn_installment_after_change();
