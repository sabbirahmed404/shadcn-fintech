alter table public.fund_target_contributions add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

create or replace function public.fn_add_fund_target_contribution(
  p_target_id uuid,
  p_amount numeric,
  p_contributed_at date default current_date,
  p_notes text default null,
  p_transaction_id uuid default null
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
    notes,
    transaction_id
  )
  values (
    p_target_id,
    v_user_id,
    p_amount,
    coalesce(p_contributed_at, current_date),
    nullif(trim(p_notes), ''),
    p_transaction_id
  )
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
    
  if v_existing.transaction_id is not null then
    delete from public.transactions
    where id = v_existing.transaction_id
      and user_id = v_user_id;
  end if;
end;
$$;
