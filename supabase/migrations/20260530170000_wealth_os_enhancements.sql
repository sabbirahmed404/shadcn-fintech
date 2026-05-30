-- ==========================================================================
-- Wealth OS Enhancements Migration
-- Additive — builds on top of 20260521201500_finance_schema.sql
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- New Enums
-- ---------------------------------------------------------------------------
create type public.subscription_frequency as enum (
  'weekly',
  'monthly',
  'quarterly',
  'yearly'
);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  provider text,
  logo_url text,
  plan_tier text,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'BDT',
  frequency public.subscription_frequency not null default 'monthly',
  billing_anchor_day integer check (billing_anchor_day between 1 and 31),
  next_renewal_date date,
  auto_renew boolean not null default true,
  category_id uuid references public.categories (id) on delete set null,
  billing_url text,
  is_active boolean not null default true,
  started_at date,
  cancelled_at date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_user_active_idx on public.subscriptions (user_id, is_active);
create index subscriptions_next_renewal_idx on public.subscriptions (user_id, next_renewal_date);

create trigger subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- debt_settlements (settlement log for partial/full payments)
-- ---------------------------------------------------------------------------
create table public.debt_settlements (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  settled_at date not null default current_date,
  transaction_id uuid references public.transactions (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index debt_settlements_debt_idx on public.debt_settlements (debt_id);
create index debt_settlements_user_idx on public.debt_settlements (user_id);

-- ---------------------------------------------------------------------------
-- kanban_columns (for Wealth Targets management board)
-- ---------------------------------------------------------------------------
create table public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index kanban_columns_user_id_idx on public.kanban_columns (user_id);
create index kanban_columns_user_sort_idx on public.kanban_columns (user_id, sort_order);

create trigger kanban_columns_updated_at
before update on public.kanban_columns
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- fund_targets — add Kanban positioning fields
-- ---------------------------------------------------------------------------
alter table public.fund_targets
  add column kanban_column_id uuid references public.kanban_columns (id) on delete set null,
  add column kanban_position integer not null default 0;

create index fund_targets_kanban_idx on public.fund_targets (kanban_column_id, kanban_position);

-- ---------------------------------------------------------------------------
-- audit_log (denormalized read model for the Audit Ledger page)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  transaction_id uuid references public.transactions (id) on delete set null,
  action text not null,
  direction public.flow_direction not null,
  amount numeric(14, 2) not null,
  category text,
  account_name text,
  counterparty text,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_log_user_id_idx on public.audit_log (user_id);
create index audit_log_user_occurred_idx on public.audit_log (user_id, occurred_at desc);
create index audit_log_direction_idx on public.audit_log (user_id, direction);

-- Trigger: auto-populate audit_log on transaction insert
create or replace function public.fn_audit_log_on_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_name text;
  v_category_name text;
  v_action text;
begin
  -- Resolve account name
  select name into v_account_name
  from public.accounts
  where id = new.account_id;

  -- Resolve category name
  if new.category_id is not null then
    select name into v_category_name
    from public.categories
    where id = new.category_id;
  end if;

  -- Build action label
  v_action := initcap(replace(new.type::text, '_', ' '));
  if new.description is not null and new.description <> '' then
    v_action := v_action || ': ' || new.description;
  end if;

  insert into public.audit_log (
    user_id,
    transaction_id,
    action,
    direction,
    amount,
    category,
    account_name,
    occurred_at,
    metadata
  ) values (
    new.user_id,
    new.id,
    v_action,
    new.direction,
    new.amount,
    v_category_name,
    v_account_name,
    new.occurred_at,
    new.metadata
  );

  return new;
end;
$$;

create trigger trg_audit_log_on_transaction
after insert on public.transactions
for each row execute function public.fn_audit_log_on_transaction();

-- ---------------------------------------------------------------------------
-- monthly_snapshots (dashboard historical data)
-- ---------------------------------------------------------------------------
create table public.monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  total_income numeric(14, 2) not null default 0,
  total_expenses numeric(14, 2) not null default 0,
  total_bills numeric(14, 2) not null default 0,
  total_provisions numeric(14, 2) not null default 0,
  free_money numeric(14, 2) not null default 0,
  net_worth_liquid numeric(14, 2) not null default 0,
  snapshot_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, period_year, period_month)
);

create index monthly_snapshots_user_period_idx
  on public.monthly_snapshots (user_id, period_year desc, period_month desc);

create trigger monthly_snapshots_updated_at
before update on public.monthly_snapshots
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- account_balance_cache (materialized view for fast balance lookups)
-- ---------------------------------------------------------------------------
create materialized view public.account_balance_cache as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.type,
  a.provider,
  a.currency,
  a.is_active,
  public.account_balance(a.id) as balance
from public.accounts a
where a.is_active = true;

create unique index account_balance_cache_pk on public.account_balance_cache (account_id);
create index account_balance_cache_user_idx on public.account_balance_cache (user_id);

-- Helper function to refresh the cache
create or replace function public.refresh_account_balances()
returns void
language sql
security invoker
set search_path = public
as $$
  refresh materialized view concurrently public.account_balance_cache;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security for new tables
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;
alter table public.debt_settlements enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.audit_log enable row level security;
alter table public.monthly_snapshots enable row level security;

create policy "Users manage own subscriptions"
on public.subscriptions for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own debt settlements"
on public.debt_settlements for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own kanban columns"
on public.kanban_columns for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users view own audit log"
on public.audit_log for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users manage own monthly snapshots"
on public.monthly_snapshots for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Additional system categories
-- ---------------------------------------------------------------------------
insert into public.categories (user_id, name, kind, icon) values
  (null, 'Software', 'expense', 'monitor'),
  (null, 'Installment', 'expense', 'calendar-clock'),
  (null, 'Gifts', 'expense', 'gift'),
  (null, 'Education', 'expense', 'graduation-cap'),
  (null, 'Savings Contribution', 'expense', 'piggy-bank'),
  (null, 'Shopping', 'expense', 'shopping-bag'),
  (null, 'Travel', 'expense', 'plane'),
  (null, 'Rent', 'expense', 'home'),
  (null, 'Salary', 'income', 'banknote'),
  (null, 'Investment Return', 'income', 'trending-up'),
  (null, 'Gift Received', 'income', 'gift');
