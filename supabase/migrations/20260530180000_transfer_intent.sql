-- ==========================================================================
-- Transfer Intent Migration
-- Additive — builds on 20260521201500_finance_schema.sql and
-- 20260530170000_wealth_os_enhancements.sql
--
-- Adds support for person-to-person money movement on the Transfers page and
-- the dashboard Quick Ledger, with intents: plain / lend / borrow / repay.
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- transactions.contact_id — tag ledger entries with the person involved
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column contact_id uuid references public.contacts (id) on delete set null;

create index transactions_contact_id_idx on public.transactions (contact_id);

-- ---------------------------------------------------------------------------
-- Relax the transfer constraint
-- A 'transfer' is either internal (between two own accounts → counter_account_id)
-- OR person-to-person (to/from a contact → contact_id). One of them must be set.
-- ---------------------------------------------------------------------------
alter table public.transactions
  drop constraint transactions_transfer_counter_account_chk;

alter table public.transactions
  add constraint transactions_transfer_counter_account_chk check (
    type <> 'transfer'
    or counter_account_id is not null
    or contact_id is not null
  );

-- ---------------------------------------------------------------------------
-- Keep debts.amount_remaining / status in sync when a settlement is inserted.
-- Makes the "Repay" intent functional without client-side recomputation.
-- ---------------------------------------------------------------------------
create or replace function public.fn_apply_debt_settlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_remaining numeric(14, 2);
  v_original numeric(14, 2);
begin
  select amount_remaining - new.amount, amount_original
    into v_new_remaining, v_original
  from public.debts
  where id = new.debt_id;

  v_new_remaining := greatest(v_new_remaining, 0);

  update public.debts
  set
    amount_remaining = v_new_remaining,
    status = case
      when v_new_remaining <= 0 then 'settled'::public.debt_status
      when v_new_remaining < v_original then 'partial'::public.debt_status
      else status
    end
  where id = new.debt_id;

  return new;
end;
$$;

create trigger trg_apply_debt_settlement
after insert on public.debt_settlements
for each row execute function public.fn_apply_debt_settlement();
