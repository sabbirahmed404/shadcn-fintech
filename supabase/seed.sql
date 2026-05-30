-- ==========================================================================
-- Wealth OS — Comprehensive Seed Data (BDT ৳)
-- ==========================================================================
-- This seed creates a demo user and populates all tables with realistic
-- Bangladesh Taka–denominated financial data.
-- ==========================================================================

-- ---------------------------------------------------------------------------
-- 1. Demo user (Supabase local auth)
-- ---------------------------------------------------------------------------
-- Insert into auth.users with a known UUID so we can reference it everywhere.
-- Password: "password123" (bcrypt hash below)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'sabbir@wealthos.local',
  '$2a$10$ZohPuppSstLChCX1k5LqN.WW4/IgLq5PWtVhRwVatIu8x.XnPH3va',
  now(),
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Sabbir Ahmed"}',
  now(),
  now(),
  '',
  '',
  ''
) on conflict (id) do nothing;

-- The handle_new_user trigger should auto-create the profile,
-- but in case it doesn't fire during seed, ensure profile exists:
insert into public.profiles (id, display_name, default_currency)
values ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sabbir Ahmed', 'BDT')
on conflict (id) do update set display_name = excluded.display_name;

-- ---------------------------------------------------------------------------
-- 2. Contacts
-- ---------------------------------------------------------------------------
insert into public.contacts (id, user_id, name, nickname, phone, avatar_url) values
  ('c0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Rahim Uddin', 'Rahim', '+8801712345678', '/avatars/1.jpg'),
  ('c0000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Fatima Begum', 'Fatima', '+8801812345679', '/avatars/5.jpg'),
  ('c0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Kamal Hossain', 'Kamal', '+8801912345680', '/avatars/3.jpg'),
  ('c0000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Nusrat Jahan', 'Nusrat', '+8801612345681', '/avatars/9.jpg'),
  ('c0000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tanvir Islam', 'Tanvir', '+8801512345682', '/avatars/8.jpg');

-- ---------------------------------------------------------------------------
-- 3. Accounts (Wallets)
-- ---------------------------------------------------------------------------
insert into public.accounts (id, user_id, name, type, provider, account_number_last4, opening_balance, currency, is_active, sort_order) values
  ('a0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Cash Wallet', 'cash', null, null, 13850.00, 'BDT', true, 1),
  ('a0000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'UCB Bank (Mastercard)', 'bank', 'UCB', '4589', -76910.00, 'BDT', true, 2),
  ('a0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'bKash Personal', 'mfs', 'bKash', '7890', -51061.15, 'BDT', true, 3),
  ('a0000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Nagad', 'mfs', 'Nagad', '3456', -11961.00, 'BDT', true, 4),
  ('a0000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'DB bill rocket', 'mfs', 'Rocket', '5678', 33.00, 'BDT', true, 5),
  ('a0000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Red Hot Pay', 'bank', 'ReddotPay', '1234', 0.72, 'USD', true, 6);

-- ---------------------------------------------------------------------------
-- 4. User-specific categories (supplement system ones)
-- ---------------------------------------------------------------------------
insert into public.categories (id, user_id, name, kind, icon, color) values
  ('ca100001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Groceries', 'expense', 'shopping-cart', 'text-green-500'),
  ('ca100001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mobile Recharge', 'expense', 'smartphone', 'text-blue-500'),
  ('ca100001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CodeMyPixel Income', 'income', 'code', 'text-purple-500'),
  ('ca100001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Freelance Web Dev', 'income', 'laptop', 'text-cyan-500');

-- ---------------------------------------------------------------------------
-- 5. Transactions (Central Ledger) — 3 months of activity
-- ---------------------------------------------------------------------------

-- ── May 2026 Income ─────────────────────────────────────────────────────
insert into public.transactions (id, user_id, type, direction, amount, account_id, category_id, description, occurred_at) values
  -- CodeMyPixel Phase 3 payment
  ('10000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'in', 85000.00, 'a0000001-0000-0000-0000-000000000002', 'ca100001-0000-0000-0000-000000000003', 'CodeMyPixel — Phase 3 Final Delivery', '2026-05-05 10:00:00+06'),
  -- Freelance project
  ('10000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'in', 25000.00, 'a0000001-0000-0000-0000-000000000003', 'ca100001-0000-0000-0000-000000000004', 'Portfolio site for Tanvir', '2026-05-12 14:30:00+06'),

  -- May 2026 Expenses
  ('10000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 12000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Rent — May 2026', '2026-05-01 09:00:00+06'),
  ('10000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 2500.00, 'a0000001-0000-0000-0000-000000000002', null, 'Internet — Amber IT', '2026-05-03 11:00:00+06'),
  ('10000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 1800.00, 'a0000001-0000-0000-0000-000000000002', null, 'Electricity — DESCO', '2026-05-05 12:00:00+06'),
  ('10000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 3500.00, 'a0000001-0000-0000-0000-000000000001', 'ca100001-0000-0000-0000-000000000001', 'Monthly groceries — Shwapno', '2026-05-08 16:00:00+06'),
  ('10000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 500.00, 'a0000001-0000-0000-0000-000000000003', 'ca100001-0000-0000-0000-000000000002', 'GP recharge', '2026-05-10 18:00:00+06'),
  ('10000001-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 1200.00, 'a0000001-0000-0000-0000-000000000003', null, 'Uber rides — week 2', '2026-05-14 20:00:00+06'),
  ('10000001-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 850.00, 'a0000001-0000-0000-0000-000000000001', null, 'Street food & chai', '2026-05-18 13:00:00+06'),
  ('10000001-0000-0000-0000-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 5000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Family support — Ma', '2026-05-20 09:00:00+06'),

  -- Goal contribution
  ('10000001-0000-0000-0000-000000000013', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'goal_contribution', 'out', 15000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Emergency fund contribution — May', '2026-05-22 11:00:00+06');

-- May Transfer: Bank → bKash (separate INSERT for counter_account_id)
insert into public.transactions (id, user_id, type, direction, amount, account_id, counter_account_id, category_id, description, occurred_at) values
  ('10000001-0000-0000-0000-000000000011', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'out', 10000.00, 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003', null, 'Transfer to bKash', '2026-05-15 10:00:00+06'),
  ('10000001-0000-0000-0000-000000000012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'transfer', 'in', 10000.00, 'a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000002', null, 'Received from Bank', '2026-05-15 10:00:00+06');

-- ── April 2026 ──────────────────────────────────────────────────────────
insert into public.transactions (id, user_id, type, direction, amount, account_id, category_id, description, occurred_at) values
  ('10000001-0000-0000-0000-000000000020', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'in', 60000.00, 'a0000001-0000-0000-0000-000000000002', 'ca100001-0000-0000-0000-000000000003', 'CodeMyPixel — Phase 2 Delivery', '2026-04-08 10:00:00+06'),
  ('10000001-0000-0000-0000-000000000021', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'in', 18000.00, 'a0000001-0000-0000-0000-000000000003', 'ca100001-0000-0000-0000-000000000004', 'Logo design for Kamal', '2026-04-15 14:00:00+06'),
  ('10000001-0000-0000-0000-000000000022', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 12000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Rent — April 2026', '2026-04-01 09:00:00+06'),
  ('10000001-0000-0000-0000-000000000023', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 2500.00, 'a0000001-0000-0000-0000-000000000002', null, 'Internet — Amber IT', '2026-04-03 11:00:00+06'),
  ('10000001-0000-0000-0000-000000000024', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 2100.00, 'a0000001-0000-0000-0000-000000000002', null, 'Electricity — DESCO', '2026-04-05 12:00:00+06'),
  ('10000001-0000-0000-0000-000000000025', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 4200.00, 'a0000001-0000-0000-0000-000000000001', 'ca100001-0000-0000-0000-000000000001', 'Monthly groceries — Agora', '2026-04-10 15:00:00+06'),
  ('10000001-0000-0000-0000-000000000026', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 5000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Family support — Ma', '2026-04-20 09:00:00+06'),
  ('10000001-0000-0000-0000-000000000027', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 1500.00, 'a0000001-0000-0000-0000-000000000003', null, 'Pathao rides — April', '2026-04-18 19:00:00+06'),
  ('10000001-0000-0000-0000-000000000028', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'goal_contribution', 'out', 10000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Emergency fund contribution — Apr', '2026-04-25 11:00:00+06');

-- ── March 2026 ──────────────────────────────────────────────────────────
insert into public.transactions (id, user_id, type, direction, amount, account_id, category_id, description, occurred_at) values
  ('10000001-0000-0000-0000-000000000030', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'in', 45000.00, 'a0000001-0000-0000-0000-000000000002', 'ca100001-0000-0000-0000-000000000003', 'CodeMyPixel — Phase 1 Advance', '2026-03-10 10:00:00+06'),
  ('10000001-0000-0000-0000-000000000031', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'income', 'in', 12000.00, 'a0000001-0000-0000-0000-000000000004', 'ca100001-0000-0000-0000-000000000004', 'WordPress fix for Nusrat', '2026-03-18 14:00:00+06'),
  ('10000001-0000-0000-0000-000000000032', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 12000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Rent — March 2026', '2026-03-01 09:00:00+06'),
  ('10000001-0000-0000-0000-000000000033', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 2500.00, 'a0000001-0000-0000-0000-000000000002', null, 'Internet — Amber IT', '2026-03-03 11:00:00+06'),
  ('10000001-0000-0000-0000-000000000034', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 1950.00, 'a0000001-0000-0000-0000-000000000002', null, 'Electricity — DESCO', '2026-03-05 12:00:00+06'),
  ('10000001-0000-0000-0000-000000000035', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 3800.00, 'a0000001-0000-0000-0000-000000000001', 'ca100001-0000-0000-0000-000000000001', 'Monthly groceries — Meena Bazar', '2026-03-12 16:00:00+06'),
  ('10000001-0000-0000-0000-000000000036', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expense', 'out', 5000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Family support — Ma', '2026-03-20 09:00:00+06'),
  ('10000001-0000-0000-0000-000000000037', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'goal_contribution', 'out', 8000.00, 'a0000001-0000-0000-0000-000000000002', null, 'Savings contribution — Mar', '2026-03-28 11:00:00+06');

-- ---------------------------------------------------------------------------
-- 6. Income Entries (CodeMyPixel project tracking)
-- ---------------------------------------------------------------------------
insert into public.income_entries (id, user_id, project_name, phase, company, amount, received_at, account_id, transaction_id, notes) values
  ('1e000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CodeMyPixel', 'Phase 1 — UI/UX Design', 'CodeMyPixel Ltd', 45000.00, '2026-03-10', 'a0000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000030', 'Wireframes + Figma prototypes delivered'),
  ('1e000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CodeMyPixel', 'Phase 2 — Frontend Dev', 'CodeMyPixel Ltd', 60000.00, '2026-04-08', 'a0000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000020', 'Next.js frontend with Shadcn UI delivered'),
  ('1e000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CodeMyPixel', 'Phase 3 — Backend + Deploy', 'CodeMyPixel Ltd', 85000.00, '2026-05-05', 'a0000001-0000-0000-0000-000000000002', '10000001-0000-0000-0000-000000000001', 'Supabase integration, deployment, handoff'),
  -- Freelance entries
  ('1e000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Freelance', 'WordPress Fix', null, 12000.00, '2026-03-18', 'a0000001-0000-0000-0000-000000000004', '10000001-0000-0000-0000-000000000031', 'Bug fix + speed optimization for Nusrat'),
  ('1e000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Freelance', 'Logo Design', null, 18000.00, '2026-04-15', 'a0000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000021', 'Brand identity package for Kamal'),
  ('1e000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Freelance', 'Portfolio Site', null, 25000.00, '2026-05-12', 'a0000001-0000-0000-0000-000000000003', '10000001-0000-0000-0000-000000000002', 'React portfolio for Tanvir');

-- ---------------------------------------------------------------------------
-- 7. Expected Inflows
-- ---------------------------------------------------------------------------
insert into public.expected_inflows (id, user_id, title, source_type, source_name, project_name, phase, amount, expected_date, status, confidence, notes) values
  ('e1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CodeMyPixel Phase 4 — Maintenance', 'project', 'CodeMyPixel Ltd', 'CodeMyPixel', 'Phase 4 — Maintenance Retainer', 20000.00, '2026-06-15', 'pending', 'confirmed', '3-month maintenance contract'),
  ('e1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'E-commerce project — Rahim', 'client', 'Rahim Uddin', null, null, 50000.00, '2026-07-01', 'pending', 'likely', 'Shopify store build, awaiting contract'),
  ('e1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Refund — Amazon BD', 'refund', 'Amazon', null, null, 3500.00, '2026-06-05', 'pending', 'confirmed', 'Returned headphones');

-- ---------------------------------------------------------------------------
-- 8. Bills (Recurring Obligations)
-- ---------------------------------------------------------------------------
insert into public.bills (id, user_id, name, default_amount, frequency, due_day, is_installment, installment_total, installment_paid, can_toggle_monthly, is_active, default_account_id, notes) values
  ('b0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'House Rent', 12000.00, 'monthly', 1, false, null, 0, false, true, 'a0000001-0000-0000-0000-000000000002', 'Mirpur DOHS flat'),
  ('b0000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Internet — Amber IT', 2500.00, 'monthly', 3, false, null, 0, false, true, 'a0000001-0000-0000-0000-000000000002', '100 Mbps plan'),
  ('b0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Electricity — DESCO', 2000.00, 'monthly', 5, false, null, 0, true, true, 'a0000001-0000-0000-0000-000000000002', 'Varies by season'),
  ('b0000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Gas — Titas', 950.00, 'monthly', 10, false, null, 0, true, true, 'a0000001-0000-0000-0000-000000000003', 'Cooking gas'),
  ('b0000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'GP Postpaid', 800.00, 'monthly', 15, false, null, 0, false, true, 'a0000001-0000-0000-0000-000000000003', 'GP postpaid with data pack'),
  ('b0000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Family Support — Ma', 5000.00, 'monthly', 20, false, null, 0, false, true, 'a0000001-0000-0000-0000-000000000002', 'Monthly family contribution'),
  -- Installment: Laptop EMI
  ('b0000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'MacBook EMI — Rangs', 8500.00, 'monthly', 25, true, 12, 7, false, true, 'a0000001-0000-0000-0000-000000000002', 'MacBook Pro M3 — 12 month EMI from Rangs');

-- ---------------------------------------------------------------------------
-- 9. Bill Periods (May 2026 instances)
-- ---------------------------------------------------------------------------
insert into public.bill_periods (bill_id, user_id, period_year, period_month, amount_due, is_enabled, status, paid_at) values
  -- May 2026 — most paid
  ('b0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 12000.00, true, 'paid', '2026-05-01 09:00:00+06'),
  ('b0000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 2500.00, true, 'paid', '2026-05-03 11:00:00+06'),
  ('b0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 1800.00, true, 'paid', '2026-05-05 12:00:00+06'),
  ('b0000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 950.00, true, 'pending', null),
  ('b0000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 800.00, true, 'pending', null),
  ('b0000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 5000.00, true, 'paid', '2026-05-20 09:00:00+06'),
  ('b0000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 8500.00, true, 'pending', null),
  -- April 2026 — all paid
  ('b0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 12000.00, true, 'paid', '2026-04-01 09:00:00+06'),
  ('b0000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 2500.00, true, 'paid', '2026-04-03 11:00:00+06'),
  ('b0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 2100.00, true, 'paid', '2026-04-05 12:00:00+06'),
  ('b0000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 950.00, true, 'paid', '2026-04-10 10:00:00+06'),
  ('b0000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 800.00, true, 'paid', '2026-04-15 10:00:00+06'),
  ('b0000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 5000.00, true, 'paid', '2026-04-20 09:00:00+06'),
  ('b0000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 8500.00, true, 'paid', '2026-04-25 10:00:00+06');

-- ---------------------------------------------------------------------------
-- 10. Subscriptions
-- ---------------------------------------------------------------------------
insert into public.subscriptions (id, user_id, name, provider, logo_url, plan_tier, amount, currency, frequency, billing_anchor_day, next_renewal_date, auto_renew, is_active, started_at, notes) values
  ('5b000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Spotify Premium', 'spotify.com', '/logos/spotify-com.png', 'Individual', 149.00, 'BDT', 'monthly', 10, '2026-06-10', true, true, '2024-01-10', 'Family plan upgrade available at ৳229'),
  ('5b000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ChatGPT Plus', 'openai.com', '/logos/openai-com.png', 'Plus', 2700.00, 'BDT', 'monthly', 6, '2026-06-06', true, true, '2024-06-06', 'GPT-4o access'),
  ('5b000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Figma Professional', 'figma.com', '/logos/figma-com.png', 'Professional', 1800.00, 'BDT', 'monthly', 7, '2026-06-07', true, true, '2025-02-07', 'Dev mode included'),
  ('5b000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'GitHub Pro', 'github.com', '/logos/github-com.png', 'Pro', 550.00, 'BDT', 'monthly', 27, '2026-06-27', true, true, '2023-09-27', 'Copilot included'),
  ('5b000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Netflix', 'netflix.com', '/logos/netflix-com.png', 'Standard', 350.00, 'BDT', 'monthly', 2, '2026-06-02', true, true, '2025-01-02', 'Standard with ads'),
  ('5b000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Vercel Pro', 'vercel.com', '/logos/vercel-com.png', 'Pro', 2400.00, 'BDT', 'monthly', 25, '2026-06-25', true, true, '2025-07-25', 'Hosting for client projects'),
  ('5b000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Notion Plus', 'notion.so', '/logos/notion-so.png', 'Plus', 1100.00, 'BDT', 'monthly', 26, '2026-06-26', false, false, '2024-11-26', 'Switched to Obsidian');

-- ---------------------------------------------------------------------------
-- 11. Debts
-- ---------------------------------------------------------------------------
-- NOTE: amount_remaining starts at amount_original here. The debt_settlements
-- inserted below trigger fn_apply_debt_settlement(), which reduces
-- amount_remaining and recomputes status automatically.
insert into public.debts (id, user_id, direction, counterparty_name, counterparty_contact_id, amount_original, amount_remaining, occurred_at, due_at, status, notes) values
  -- I owe
  ('d0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'i_owe', 'Rahim Uddin', 'c0000001-0000-0000-0000-000000000001', 15000.00, 15000.00, '2026-03-15', '2026-06-30', 'open', 'Borrowed for emergency laptop repair'),
  ('d0000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'i_owe', 'Kamal Hossain', 'c0000001-0000-0000-0000-000000000003', 5000.00, 5000.00, '2026-05-01', '2026-06-15', 'open', 'Dinner + movie split'),
  -- They owe me
  ('d0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'owed_to_me', 'Tanvir Islam', 'c0000001-0000-0000-0000-000000000005', 8000.00, 8000.00, '2026-02-20', '2026-05-31', 'open', 'Lent for course enrollment'),
  ('d0000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'owed_to_me', 'Nusrat Jahan', 'c0000001-0000-0000-0000-000000000004', 3000.00, 3000.00, '2026-04-10', null, 'open', 'Shared Uber ride costs');

-- ---------------------------------------------------------------------------
-- 12. Debt Settlements
-- ---------------------------------------------------------------------------
insert into public.debt_settlements (debt_id, user_id, amount, settled_at, notes) values
  -- Partial payment to Rahim
  ('d0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5000.00, '2026-04-15', 'First installment via bKash'),
  -- Tanvir paid back partially
  ('d0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3000.00, '2026-03-25', 'Cash payment'),
  ('d0000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2000.00, '2026-04-20', 'bKash transfer');

-- ---------------------------------------------------------------------------
-- 13. Kanban Columns (Wealth Targets Board)
-- ---------------------------------------------------------------------------
insert into public.kanban_columns (id, user_id, name, color, sort_order) values
  ('cb000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Planning', '#6366f1', 0),
  ('cb000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Active', '#22c55e', 1),
  ('cb000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Paused', '#f59e0b', 2),
  ('cb000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Achieved', '#10b981', 3);

-- ---------------------------------------------------------------------------
-- 14. Fund Targets (Wealth Goals)
-- ---------------------------------------------------------------------------
insert into public.fund_targets (id, user_id, name, target_type, target_amount, current_amount, target_date, monthly_contribution, priority, icon, is_active, kanban_column_id, kanban_position) values
  ('f1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Emergency Fund', 'emergency', 300000.00, 145000.00, '2027-03-31', 15000.00, 1, 'shield', true, 'cb000001-0000-0000-0000-000000000002', 0),
  ('f1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Savings Reserve', 'savings', 500000.00, 82000.00, '2028-06-30', 20000.00, 2, 'piggy-bank', true, 'cb000001-0000-0000-0000-000000000002', 1),
  ('f1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dream Setup — Standing Desk + Monitor', 'dream', 65000.00, 18000.00, '2026-09-30', 12000.00, 3, 'monitor', true, 'cb000001-0000-0000-0000-000000000001', 0),
  ('f1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Summer Vacation — Cox''s Bazar', 'vacation', 40000.00, 12000.00, '2026-08-15', 8000.00, 4, 'palm-tree', true, 'cb000001-0000-0000-0000-000000000001', 1);

-- ---------------------------------------------------------------------------
-- 15. Fund Target Contributions
-- ---------------------------------------------------------------------------
insert into public.fund_target_contributions (target_id, user_id, amount, contributed_at, account_id, notes) values
  -- Emergency Fund contributions
  ('f1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8000.00, '2026-03-28', 'a0000001-0000-0000-0000-000000000002', 'March contribution'),
  ('f1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10000.00, '2026-04-25', 'a0000001-0000-0000-0000-000000000002', 'April contribution'),
  ('f1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 15000.00, '2026-05-22', 'a0000001-0000-0000-0000-000000000002', 'May contribution — extra from CodeMyPixel'),
  -- Savings
  ('f1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 20000.00, '2026-04-30', 'a0000001-0000-0000-0000-000000000002', 'April savings'),
  ('f1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 20000.00, '2026-05-25', 'a0000001-0000-0000-0000-000000000002', 'May savings'),
  -- Dream Setup
  ('f1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10000.00, '2026-04-28', 'a0000001-0000-0000-0000-000000000002', 'First chunk'),
  ('f1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8000.00, '2026-05-20', 'a0000001-0000-0000-0000-000000000002', 'Second chunk'),
  -- Vacation
  ('f1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5000.00, '2026-04-15', 'a0000001-0000-0000-0000-000000000003', 'Via bKash'),
  ('f1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7000.00, '2026-05-18', 'a0000001-0000-0000-0000-000000000003', 'Freelance bonus into vacation fund');

-- ---------------------------------------------------------------------------
-- 16. Provisions (Manual monthly reserves)
-- ---------------------------------------------------------------------------
insert into public.provisions (user_id, name, amount, period_year, period_month, is_active) values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Emergency Buffer', 5000.00, 2026, 5, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Eid Shopping Reserve', 8000.00, 2026, 5, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Misc / Unexpected', 3000.00, 2026, 5, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Emergency Buffer', 5000.00, 2026, 4, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Misc / Unexpected', 3000.00, 2026, 4, true);

-- ---------------------------------------------------------------------------
-- 17. Monthly Snapshots
-- ---------------------------------------------------------------------------
insert into public.monthly_snapshots (user_id, period_year, period_month, total_income, total_expenses, total_bills, total_provisions, free_money, net_worth_liquid, snapshot_data) values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 3, 57000.00, 25250.00, 24200.00, 8000.00, 24800.00, 148700.00,
   '{"accounts": {"cash": 12200, "bank": 108500, "bkash": 16500, "nagad": 11500}, "top_expenses": ["Rent", "Family Support", "Groceries"]}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 4, 78000.00, 29800.00, 33850.00, 8000.00, 36150.00, 155200.00,
   '{"accounts": {"cash": 10800, "bank": 115400, "bkash": 18000, "nagad": 11000}, "top_expenses": ["Rent", "MacBook EMI", "Family Support"]}'::jsonb),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2026, 5, 110000.00, 25350.00, 30550.00, 16000.00, 54450.00, 162700.00,
   '{"accounts": {"cash": 9650, "bank": 118050, "bkash": 24800, "nagad": 10200}, "top_expenses": ["Rent", "Family Support", "Groceries"]}'::jsonb);

-- ---------------------------------------------------------------------------
-- 18. Refresh materialized view
-- ---------------------------------------------------------------------------
refresh materialized view public.account_balance_cache;
