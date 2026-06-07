-- ============================================================================
-- Payroll automation (PRD Bab 5.2, 7.3, 10.5).
--   * Payslip -> DIBAYAR : one locked cashflow Debit = net pay (take-home),
--                          category PENGGAJIAN; plus Tax Center entries for PPh21
--                          (if > 0) and any employer/employee BPJS components.
--   * Payslip -> BATAL   : cancel its locked cashflow + drop unsettled auto tax.
--
-- Note: net pay already includes bonus (take-home), so bonus is NOT booked as a
-- separate cash-out (would double count). Splitting bonus to the BONUS category
-- for tracking is an app-level option. BPJS tax entries are created from payslip
-- components flagged via salary_components (kind/employer portion).
-- ============================================================================

create or replace function fn_payslip_after_change()
returns trigger language plpgsql
security definer set search_path = public as $$
declare
  v_new_role status_system_role := status_role(new.status_id);
  v_old_role status_system_role := case when TG_OP = 'UPDATE'
                                        then status_role(old.status_id) end;
  v_period   date := date_trunc('month', new.period_end)::date;
  v_day_pph  smallint;
  v_day_bpjs smallint;
  v_pph_due  date;
  v_bpjs_due date;
  v_bpjs     numeric;
  v_when     date := coalesce(new.paid_date, new.period_end);
begin
  -- INTO DIBAYAR
  if v_new_role = 'DIBAYAR' and (v_old_role is distinct from 'DIBAYAR') then
    if not exists (select 1 from public.cashflow_entries
                   where payslip_id = new.id and is_locked) then

      select pph21_setor_day, bpjs_setor_day into v_day_pph, v_day_bpjs
      from public.tax_settings limit 1;

      v_pph_due  := (date_trunc('month', v_period) + interval '1 month'
                     + (coalesce(v_day_pph, 10) - 1) * interval '1 day')::date;
      v_bpjs_due := (date_trunc('month', v_period) + interval '1 month'
                     + (coalesce(v_day_bpjs, 10) - 1) * interval '1 day')::date;

      -- Take-home pay — Debit, category PENGGAJIAN
      insert into public.cashflow_entries
        (type, date, amount, category_id, source, tax_component, description,
         is_locked, payslip_id)
      values
        ('debit', v_when, new.net_pay, cashflow_category_id('PENGGAJIAN'),
         'penggajian', null, 'Gaji bersih ' || coalesce(new.number, ''),
         true, new.id);

      -- PPh21 liability (manual, may be 0 -> skip)
      if coalesce(new.pph21_amount, 0) > 0 then
        insert into public.tax_entries
          (tax_type, nature, tax_period, amount, payslip_id, employee_id,
           due_date, settlement_status)
        values
          ('pph21', 'kewajiban', v_period, new.pph21_amount, new.id,
           new.employee_id, v_pph_due, 'belum_disetor');
      end if;

      -- BPJS liabilities — sum of components whose underlying salary_component is
      -- a BPJS-type deduction (label ilike '%bpjs%'); employer + employee portion.
      select coalesce(sum(pc.amount), 0) into v_bpjs
      from public.payslip_components pc
      left join public.salary_components sc on sc.id = pc.salary_component_id
      where pc.payslip_id = new.id
        and (pc.name ilike '%bpjs%' or coalesce(sc.label, '') ilike '%bpjs%');

      if v_bpjs > 0 then
        insert into public.tax_entries
          (tax_type, nature, tax_period, amount, payslip_id, employee_id,
           due_date, settlement_status)
        values
          ('bpjs_kesehatan', 'kewajiban', v_period, v_bpjs, new.id,
           new.employee_id, v_bpjs_due, 'belum_disetor');
      end if;
    end if;
  end if;

  -- INTO BATAL
  if v_new_role = 'BATAL' and (v_old_role is distinct from 'BATAL') then
    update public.cashflow_entries set is_cancelled = true
      where payslip_id = new.id and is_locked;
    update public.tax_entries set deleted_at = now()
      where payslip_id = new.id
        and settlement_status = 'belum_disetor'
        and deleted_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payslip_after_change on payslips;
create trigger trg_payslip_after_change
  after insert or update on payslips
  for each row execute function fn_payslip_after_change();
