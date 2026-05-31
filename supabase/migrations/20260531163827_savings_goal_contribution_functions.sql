-- Atomic contribution helpers for savings goals.
-- These functions run as SECURITY INVOKER so existing RLS policies still own authorization.

create or replace function public.fn_add_fund_target_contribution(
  p_target_id uuid,
  p_amount numeric,
  p_contributed_at date default current_date,
  p_notes text default null
)
returns public.fund_target_contributions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_contribution public.fund_target_contributions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Contribution amount must be greater than zero' using errcode = '22023';
  end if;

  update public.fund_targets
  set current_amount = current_amount + p_amount
  where id = p_target_id
    and user_id = v_user_id
    and is_active = true;

  if not found then
    raise exception 'Savings goal not found' using errcode = 'P0002';
  end if;

  insert into public.fund_target_contributions (
    target_id,
    user_id,
    amount,
    contributed_at,
    notes
  )
  values (
    p_target_id,
    v_user_id,
    p_amount,
    coalesce(p_contributed_at, current_date),
    nullif(trim(p_notes), '')
  )
  returning * into v_contribution;

  return v_contribution;
end;
$$;

create or replace function public.fn_update_fund_target_contribution(
  p_contribution_id uuid,
  p_amount numeric,
  p_contributed_at date,
  p_notes text default null
)
returns public.fund_target_contributions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing public.fund_target_contributions;
  v_contribution public.fund_target_contributions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Contribution amount must be greater than zero' using errcode = '22023';
  end if;

  select *
  into v_existing
  from public.fund_target_contributions
  where id = p_contribution_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Contribution not found' using errcode = 'P0002';
  end if;

  update public.fund_targets
  set current_amount = greatest(current_amount + (p_amount - v_existing.amount), 0)
  where id = v_existing.target_id
    and user_id = v_user_id;

  update public.fund_target_contributions
  set amount = p_amount,
      contributed_at = coalesce(p_contributed_at, v_existing.contributed_at),
      notes = nullif(trim(p_notes), '')
  where id = p_contribution_id
    and user_id = v_user_id
  returning * into v_contribution;

  return v_contribution;
end;
$$;

create or replace function public.fn_delete_fund_target_contribution(
  p_contribution_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing public.fund_target_contributions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select *
  into v_existing
  from public.fund_target_contributions
  where id = p_contribution_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Contribution not found' using errcode = 'P0002';
  end if;

  delete from public.fund_target_contributions
  where id = p_contribution_id
    and user_id = v_user_id;

  update public.fund_targets
  set current_amount = greatest(current_amount - v_existing.amount, 0)
  where id = v_existing.target_id
    and user_id = v_user_id;
end;
$$;

revoke execute on function public.fn_add_fund_target_contribution(uuid, numeric, date, text) from public;
revoke execute on function public.fn_update_fund_target_contribution(uuid, numeric, date, text) from public;
revoke execute on function public.fn_delete_fund_target_contribution(uuid) from public;

grant execute on function public.fn_add_fund_target_contribution(uuid, numeric, date, text) to authenticated;
grant execute on function public.fn_update_fund_target_contribution(uuid, numeric, date, text) to authenticated;
grant execute on function public.fn_delete_fund_target_contribution(uuid) to authenticated;

create index if not exists fund_targets_active_priority_idx
on public.fund_targets (user_id, is_active, priority, created_at);

create index if not exists fund_target_contributions_target_date_idx
on public.fund_target_contributions (target_id, contributed_at desc, created_at desc);

create index if not exists fund_target_contributions_account_id_idx
on public.fund_target_contributions (account_id)
where account_id is not null;

create index if not exists fund_target_contributions_transaction_id_idx
on public.fund_target_contributions (transaction_id)
where transaction_id is not null;
