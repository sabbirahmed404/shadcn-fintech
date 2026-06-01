-- Organization / Projects: track company & client projects, payout milestones,
-- and team members (dividends informational only).
-- Mirrors the user-owned table conventions in 20260521201500_finance_schema.sql.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.project_status as enum (
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

create type public.project_payout_status as enum ('pending', 'received');

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  client_name text,
  description text,
  status public.project_status not null default 'active',
  start_date date,
  end_date date,
  total_budget numeric(14, 2) not null default 0 check (total_budget >= 0),
  my_share_percent numeric(5, 2) check (my_share_percent is null or (my_share_percent >= 0 and my_share_percent <= 100)),
  my_share_amount numeric(14, 2) check (my_share_amount is null or my_share_amount >= 0),
  currency text not null default 'BDT',
  icon text,
  color text,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index projects_user_id_idx on public.projects (user_id);
create index projects_user_status_idx on public.projects (user_id, status);

create trigger projects_updated_at
before update on public.projects
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- project_payouts (milestones / phases)
-- ---------------------------------------------------------------------------
create table public.project_payouts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  percent numeric(5, 2) check (percent is null or (percent >= 0 and percent <= 100)),
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  status public.project_payout_status not null default 'pending',
  due_date date,
  received_at date,
  account_id uuid references public.accounts (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index project_payouts_project_idx on public.project_payouts (project_id);
create index project_payouts_user_idx on public.project_payouts (user_id);
create index project_payouts_status_idx on public.project_payouts (user_id, status);

create trigger project_payouts_updated_at
before update on public.project_payouts
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- project_members (linked to contacts; dividends are informational)
-- ---------------------------------------------------------------------------
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  name text,
  role text,
  dividend_amount numeric(14, 2) check (dividend_amount is null or dividend_amount >= 0),
  dividend_percent numeric(5, 2) check (dividend_percent is null or (dividend_percent >= 0 and dividend_percent <= 100)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index project_members_project_idx on public.project_members (project_id);
create index project_members_user_idx on public.project_members (user_id);
create index project_members_contact_idx on public.project_members (contact_id);

create trigger project_members_updated_at
before update on public.project_members
for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_payouts enable row level security;
alter table public.project_members enable row level security;

create policy "Users manage own projects"
on public.projects for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own project payouts"
on public.project_payouts for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users manage own project members"
on public.project_members for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
