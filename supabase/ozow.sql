-- Run AFTER schema.sql. Can be rerun without deleting existing orders.
begin;
alter table public.orders add column if not exists payment_method text not null default 'eft'
  check (payment_method in ('eft', 'ozow'));
alter table public.orders add column if not exists payment_environment text
  check (payment_environment in ('staging', 'production'));

-- Browsers may only submit manual EFT orders. Ozow orders are priced and
-- inserted by the Edge Function with the service role.
drop policy if exists "Anyone can place an order" on public.orders;
create policy "Anyone can place an order" on public.orders for insert to anon, authenticated
  with check ((user_id is null or auth.uid() = user_id) and status = 'awaiting_payment'
    and payment_method = 'eft' and payment_environment is null and terms_version = public.current_terms_version());

create table if not exists public.ozow_payments (
  ref text primary key references public.orders(ref) on delete cascade,
  checkout_hash text not null,
  request_hash text not null,
  request_payload jsonb not null,
  environment text not null check (environment in ('staging', 'production')),
  payment_id uuid unique,
  redirect_url text,
  transaction_id uuid unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);
alter table public.ozow_payments enable row level security;
revoke all on public.ozow_payments from public, anon, authenticated;
grant all on public.ozow_payments to service_role;

-- One transaction reserves the order and its capability. A concurrent/retried
-- request gets the ORIGINAL immutable Ozow body and idempotency key.
create or replace function public.reserve_ozow_order(
  p_order jsonb, p_request jsonb, p_checkout_hash text, p_request_hash text, p_environment text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  payment public.ozow_payments;
  order_ref text := p_order ->> 'ref';
begin
  perform pg_advisory_xact_lock(hashtextextended(order_ref, 0));
  select * into payment from public.ozow_payments where ref = order_ref;
  if found then
    if payment.checkout_hash <> p_checkout_hash or payment.request_hash <> p_request_hash or payment.environment <> p_environment then
      raise exception 'Checkout reference conflict';
    end if;
  else
    insert into public.orders (ref, user_id, customer, items, subtotal, courier, total, payment_method, payment_environment, terms_version)
    values (order_ref, (p_order ->> 'user_id')::uuid, p_order -> 'customer', p_order -> 'items',
      (p_order ->> 'subtotal')::numeric, (p_order ->> 'courier')::numeric, (p_order ->> 'total')::numeric, 'ozow', p_environment, p_order ->> 'terms_version');
    insert into public.ozow_payments (ref, checkout_hash, request_hash, request_payload, environment)
    values (order_ref, p_checkout_hash, p_request_hash, p_request, p_environment) returning * into payment;
  end if;
  return to_jsonb(payment) || jsonb_build_object('order', (select to_jsonb(o) from public.orders o where o.ref = order_ref));
end;
$$;
revoke all on function public.reserve_ozow_order(jsonb, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_ozow_order(jsonb, jsonb, text, text, text) to service_role;

-- A verified delivery is applied atomically. Duplicate and out-of-order
-- pending/failure deliveries never undo a confirmed payment or dispatch.
create or replace function public.record_ozow_result(p_ref text, p_transaction_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('pending', 'paid', 'failed') then raise exception 'Invalid payment status'; end if;
  perform 1 from public.ozow_payments where ref = p_ref for update;
  if not found then raise exception 'Unknown payment'; end if;
  update public.ozow_payments set status = p_status, transaction_id = p_transaction_id
    where ref = p_ref and (status <> 'paid' or p_status = 'paid') and (p_status <> 'pending' or status = 'pending');
  if p_status = 'paid' then
    update public.orders set
      status = case when status = 'awaiting_payment' then 'paid' else status end,
      payment_confirmed_at = coalesce(payment_confirmed_at,clock_timestamp()),
      payment_reference = coalesce(payment_reference,p_transaction_id::text)
      where ref = p_ref and payment_method = 'ozow';
  end if;
end;
$$;
revoke all on function public.record_ozow_result(text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_ozow_result(text, uuid, text) to service_role;

create table if not exists public.ozow_request_limits (
  bucket text primary key, attempts integer not null, started_at timestamptz not null default now()
);
alter table public.ozow_request_limits enable row level security;
revoke all on public.ozow_request_limits from public, anon, authenticated;
create or replace function public.ozow_take_rate_limit(p_bucket text, p_max integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare hits integer;
begin
  delete from public.ozow_request_limits where started_at < now() - interval '1 day';
  insert into public.ozow_request_limits (bucket, attempts) values (p_bucket, 1)
    on conflict (bucket) do update set
      attempts = case when ozow_request_limits.started_at < now() - interval '1 minute' then 1 else ozow_request_limits.attempts + 1 end,
      started_at = case when ozow_request_limits.started_at < now() - interval '1 minute' then now() else ozow_request_limits.started_at end
    returning attempts into hits;
  return hits <= p_max;
end;
$$;
revoke all on function public.ozow_take_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.ozow_take_rate_limit(text, integer) to service_role;
commit;
