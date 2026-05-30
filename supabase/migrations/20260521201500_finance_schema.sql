-- Finance tracker schema for shadcn-fintech
-- Personal finance: accounts, transactions, bills, debts, fund targets, expected inflows

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.account_type as enum ('cash', 'bank', 'mfs');

create type public.category_kind as enum ('expense', 'income');

create type public.transaction_type as enum (
  'income',
  'expense',
  'transfer',
  'bill_payment',
  'goal_contribution',
  'debt_settlement',
  'adjustment'
);

create type public.flow_direction as enum ('in', 'out');

create type public.bill_frequency as enum ('monthly', 'yearly');

create type public.bill_period_status as enum ('pending', 'paid', 'skipped');

create type public.debt_direction as enum ('owed_to_me', 'i_owe');

create type public.debt_status as enum ('open', 'partial', 'settled');

create type public.fund_target_type as enum (
  'emergency',
  'savings',
  'dream',
  'vacation',
  'business',
  'custom'
);

create type public.inflow_source_type as enum (
  'project',
  'client',
  'company',
  'person',
  'refund',
  'other'
);

create type public.inflow_status as enum ('pending', 'received', 'cancelled', 'overdue');

create type public.inflow_confidence as enum ('confirmed', 'likely', 'uncertain');

-- ---------------------------------------------------------------------------
-- Utility functions
-- ---------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  default_currency text not null default 'BDT',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  nickname text,
  phone text,
  avatar_url text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index contacts_user_id_idx on public.contacts (user_id);

create trigger contacts_updated_at
before update on public.contacts
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- accounts (wallets / portfolio)
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type public.account_type not null,
  provider text,
  account_number_last4 text,
  opening_balance numeric(14, 2) not null default 0,
  currency text not null default 'BDT',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index accounts_user_id_idx on public.accounts (user_id);
create index accounts_user_active_idx on public.accounts (user_id, is_active);

create trigger accounts_updated_at
before update on public.accounts
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  kind public.category_kind not null default 'expense',
  icon text,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index categories_user_id_idx on public.categories (user_id);

create trigger categories_updated_at
before update on public.categories
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- transactions (central ledger / audit trail)
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.transaction_type not null,
  direction public.flow_direction not null,
  amount numeric(14, 2) not null check (amount > 0),
  account_id uuid not null references public.accounts (id) on delete restrict,
  counter_account_id uuid references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  occurred_at timestamptz not null default timezone('utc', now()),
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transactions_transfer_counter_account_chk check (
    type <> 'transfer' or counter_account_id is not null
  )
);

create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_occurred_at_idx on public.transactions (user_id, occurred_at desc);
create index transactions_type_idx on public.transactions (user_id, type);
create index transactions_reference_idx on public.transactions (reference_type, reference_id);

create trigger transactions_updated_at
before update on public.transactions
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- income_entries (received income)
-- ---------------------------------------------------------------------------
create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_name text,
  phase text,
  company text,
  amount numeric(14, 2) not null check (amount > 0),
  received_at date not null,
  account_id uuid not null references public.accounts (id) on delete restrict,
  transaction_id uuid references public.transactions (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index income_entries_user_id_idx on public.income_entries (user_id);
create index income_entries_received_at_idx on public.income_entries (user_id, received_at desc);

create trigger income_entries_updated_at
before update on public.income_entries
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- expected_inflows (upcoming / projected income)
-- ---------------------------------------------------------------------------
create table public.expected_inflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  source_type public.inflow_source_type not null default 'other',
  source_name text,
  contact_id uuid references public.contacts (id) on delete set null,
  project_name text,
  phase text,
  amount numeric(14, 2) not null check (amount > 0),
  expected_date date,
  expected_year integer,
  expected_month integer check (expected_month between 1 and 12),
  status public.inflow_status not null default 'pending',
  confidence public.inflow_confidence not null default 'likely',
  received_at timestamptz,
  income_entry_id uuid references public.income_entries (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint expected_inflows_period_chk check (
    expected_date is not null
    or (expected_year is not null and expected_month is not null)
  )
);

create index expected_inflows_user_id_idx on public.expected_inflows (user_id);
create index expected_inflows_status_idx on public.expected_inflows (user_id, status);
create index expected_inflows_date_idx on public.expected_inflows (user_id, expected_date);
create index expected_inflows_period_idx on public.expected_inflows (user_id, expected_year, expected_month);

create trigger expected_inflows_updated_at
before update on public.expected_inflows
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- bills (recurring obligations)
-- ---------------------------------------------------------------------------
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  default_amount numeric(14, 2) not null check (default_amount >= 0),
  frequency public.bill_frequency not null default 'monthly',
  due_day integer not null default 1 check (due_day between 1 and 28),
  category_id uuid references public.categories (id) on delete set null,
  is_installment boolean not null default false,
  installment_total integer check (installment_total is null or installment_total > 0),
  installment_paid integer not null default 0 check (installment_paid >= 0),
  can_toggle_monthly boolean not null default false,
  is_active boolean not null default true,
  default_account_id uuid references public.accounts (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index bills_user_id_idx on public.bills (user_id);

create trigger bills_updated_at
before update on public.bills
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- bill_periods (monthly bill instances)
-- ---------------------------------------------------------------------------
create table public.bill_periods (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  amount_due numeric(14, 2) not null check (amount_due >= 0),
  is_enabled boolean not null default true,
  status public.bill_period_status not null default 'pending',
  paid_at timestamptz,
  transaction_id uuid references public.transactions (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (bill_id, period_year, period_month)
);

create index bill_periods_user_period_idx on public.bill_periods (user_id, period_year, period_month);
create index bill_periods_status_idx on public.bill_periods (user_id, status);

create trigger bill_periods_updated_at
before update on public.bill_periods
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- debts (who owes whom)
-- ---------------------------------------------------------------------------
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  direction public.debt_direction not null,
  counterparty_name text not null,
  counterparty_contact_id uuid references public.contacts (id) on delete set null,
  amount_original numeric(14, 2) not null check (amount_original > 0),
  amount_remaining numeric(14, 2) not null check (amount_remaining >= 0),
  occurred_at date not null default current_date,
  due_at date,
  status public.debt_status not null default 'open',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index debts_user_id_idx on public.debts (user_id);
create index debts_status_idx on public.debts (user_id, status);

create trigger debts_updated_at
before update on public.debts
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- fund_targets (savings / wealth goals)
-- ---------------------------------------------------------------------------
create table public.fund_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  target_type public.fund_target_type not null default 'custom',
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  monthly_contribution numeric(14, 2) not null default 0 check (monthly_contribution >= 0),
  priority integer not null default 0,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index fund_targets_user_id_idx on public.fund_targets (user_id);

create trigger fund_targets_updated_at
before update on public.fund_targets
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- fund_target_contributions
-- ---------------------------------------------------------------------------
create table public.fund_target_contributions (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.fund_targets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  contributed_at date not null default current_date,
  account_id uuid references public.accounts (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index fund_target_contributions_target_idx on public.fund_target_contributions (target_id);
create index fund_target_contributions_user_idx on public.fund_target_contributions (user_id);

-- ---------------------------------------------------------------------------
-- provisions (manual monthly reserves)
-- ---------------------------------------------------------------------------
create table public.provisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  period_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index provisions_user_period_idx on public.provisions (user_id, period_year, period_month);

create trigger provisions_updated_at
before update on public.provisions
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Balance helper (computed from ledger)
-- ---------------------------------------------------------------------------
create or replace function public.account_balance(p_account_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.opening_balance
    + coalesce(
      (
        select sum(
          case
            when t.direction = 'in' then t.amount
            else -t.amount
          end
        )
        from public.transactions t
        where t.account_id = p_account_id
      ),
      0
    )
  from public.accounts a
  where a.id = p_account_id;
$$;

-- ---------------------------------------------------------------------------
-- Auth trigger: auto-create profile
-- ---------------------------------------------------------------------------
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.income_entries enable row level security;
alter table public.expected_inflows enable row level security;
alter table public.bills enable row level security;
alter table public.bill_periods enable row level security;
alter table public.debts enable row level security;
alter table public.fund_targets enable row level security;
alter table public.fund_target_contributions enable row level security;
alter table public.provisions enable row level security;

-- profiles
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Generic user-owned table policies
create policy "Users manage own contacts"
on public.contacts for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own accounts"
on public.accounts for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own categories"
on public.categories for all
to authenticated
using (user_id is null or user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own transactions"
on public.transactions for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own income entries"
on public.income_entries for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own expected inflows"
on public.expected_inflows for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own bills"
on public.bills for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own bill periods"
on public.bill_periods for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own debts"
on public.debts for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own fund targets"
on public.fund_targets for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own fund target contributions"
on public.fund_target_contributions for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own provisions"
on public.provisions for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Default system categories (shared, read-only for all users)
-- ---------------------------------------------------------------------------
insert into public.categories (user_id, name, kind, icon) values
  (null, 'Food & Dining', 'expense', 'utensils'),
  (null, 'Transport', 'expense', 'car'),
  (null, 'Subscriptions', 'expense', 'credit-card'),
  (null, 'Utilities', 'expense', 'zap'),
  (null, 'Family Support', 'expense', 'users'),
  (null, 'Hardware', 'expense', 'cpu'),
  (null, 'Entertainment', 'expense', 'gamepad-2'),
  (null, 'Healthcare', 'expense', 'heart-pulse'),
  (null, 'Project Income', 'income', 'briefcase'),
  (null, 'Freelance', 'income', 'laptop'),
  (null, 'Refund', 'income', 'rotate-ccw'),
  (null, 'Other Income', 'income', 'circle-dollar-sign');
