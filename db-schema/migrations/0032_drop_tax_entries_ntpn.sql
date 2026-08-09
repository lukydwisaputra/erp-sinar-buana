-- NTPN (Nomor Transaksi Penerimaan Negara) is no longer the relevant tax
-- settlement reference now that payments go through Coretax (see 7adbd71's
-- UI relabel to a generic "Keterangan" — this migration finishes that by
-- retiring the column itself). Any existing NTPN text is dropped along with
-- it; the app now writes settlement notes into the pre-existing (previously
-- unused) "notes" column instead of a dedicated ntpn column.
--
-- The trigger function must be redefined to stop referencing new.ntpn
-- BEFORE the column is dropped — this is CREATE OR REPLACE (safe to rerun,
-- same as db-schema/sql/triggers/40_tax_automation.sql), applied here too
-- so the fix ships atomically with the column drop instead of depending on
-- someone remembering to also re-run the trigger file by hand.
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
             || coalesce(' - ' || new.notes, ''),
           true, new.id);
      end if;
    end if;
  end if;
  return new;
end;
$$;--> statement-breakpoint
ALTER TABLE "tax_entries" DROP COLUMN "ntpn";
