-- ==========================================================================
-- Add missing budget columns to profiles
-- ==========================================================================

alter table public.profiles
  add column monthly_budget numeric(14, 2) not null default 30000,
  add column category_budgets jsonb not null default '{}'::jsonb;
