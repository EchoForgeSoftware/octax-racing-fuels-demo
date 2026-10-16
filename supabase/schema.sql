-- OCTA Performance: customer accounts and orders.
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again: existing rows are preserved.

begin;

-- Customer profile: saved delivery details, one row per account.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  company text,
  address text,
  city text,
  postcode text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Customers read their own profile" on public.profiles;
create policy "Customers read their own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Customers create their own profile" on public.profiles;
create policy "Customers create their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Customers update their own profile" on public.profiles;
create policy "Customers update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Optional South African VAT number for tax invoices (digits only).
alter table public.profiles add column if not exists vat_number text
  check (vat_number is null or vat_number ~ '^4[0-9]{9}$');

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Orders from checkout. Guests are stored with user_id null.
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  ref text not null unique,
  user_id uuid references auth.users on delete set null,
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric(12, 2) not null,
  courier numeric(12, 2) not null,
  total numeric(12, 2) not null,
  -- awaiting_payment -> paid -> dispatched (or cancelled); update it in the Table Editor.
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'paid', 'dispatched', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);
create index if not exists orders_user_history_idx on public.orders (user_id, id desc);

-- Recorded full-order payment confirmations. Existing history is not assigned
-- invented dates or amounts. Browsers cannot update orders; inserts are cleared.
alter table public.orders add column if not exists payment_method text not null default 'eft'
  check (payment_method in ('eft', 'ozow'));
alter table public.orders add column if not exists payment_environment text
  check (payment_environment in ('staging', 'production'));
alter table public.orders add column if not exists payment_confirmed_at timestamptz;
alter table public.orders add column if not exists payment_confirmed_amount numeric(12,2);
alter table public.orders add column if not exists payment_reference text;

create or replace function public.stamp_payment_confirmation() returns trigger
language plpgsql set search_path='' as $$
begin
  if TG_OP = 'INSERT' then
    new.payment_confirmed_at := null;
    new.payment_confirmed_amount := null;
    new.payment_reference := null;
  elsif old.payment_confirmed_at is not null then
    -- Later dispatch/cancellation or duplicate notifications preserve the record.
    new.payment_confirmed_at := old.payment_confirmed_at;
    new.payment_confirmed_amount := old.payment_confirmed_amount;
    new.payment_reference := old.payment_reference;
  elsif new.payment_confirmed_at is not null or (new.status='paid' and old.status<>'paid') then
    -- Only trusted business/service roles have order UPDATE permission.
    if new.total <= 0 or new.total::text = 'NaN' then
      raise exception 'Payment confirmation requires a positive order total';
    end if;
    new.payment_confirmed_at := clock_timestamp();
    new.payment_confirmed_amount := new.total;
    new.payment_reference := coalesce(nullif(new.payment_reference,''),new.ref);
  else
    new.payment_confirmed_amount := null;
    new.payment_reference := null;
  end if;
  return new;
end;$$;
drop trigger if exists stamp_payment_confirmation on public.orders;
create trigger stamp_payment_confirmation before insert or update on public.orders
  for each row execute function public.stamp_payment_confirmation();

-- Existing orders are left without an invented acknowledgement. New order
-- timestamps are always assigned by the database, not the customer browser.
alter table public.orders add column if not exists terms_version text;
alter table public.orders add column if not exists terms_accepted_at timestamptz;
create or replace function public.current_terms_version() returns text
  language sql immutable set search_path = '' as $$ select '2026-10-16'::text $$;
create or replace function public.stamp_order_terms() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if new.terms_version is distinct from public.current_terms_version() then
    raise exception 'Current terms acknowledgement required';
  end if;
  new.terms_accepted_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists stamp_order_terms on public.orders;
create trigger stamp_order_terms before insert on public.orders
  for each row execute function public.stamp_order_terms();

alter table public.orders enable row level security;

-- Customers only ever see their own orders.
drop policy if exists "Customers read their own orders" on public.orders;
create policy "Customers read their own orders"
  on public.orders for select to authenticated using (auth.uid() = user_id);

-- Anyone can place an order: guests with no user id, signed-in customers as themselves.
-- New orders always start as awaiting payment; only the business changes the status.
drop policy if exists "Anyone can place an order" on public.orders;
create policy "Anyone can place an order"
  on public.orders for insert to anon, authenticated
  with check ((user_id is null or auth.uid() = user_id) and status = 'awaiting_payment'
    and terms_version = public.current_terms_version());

-- Explicit privileges avoid relying on a project's default table grants.
-- Only business operators in the dashboard can change order/payment status.
revoke all on public.profiles, public.orders from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.orders to anon, authenticated;
grant usage on sequence public.orders_id_seq to anon, authenticated;

commit;
