-- Back-office foundation. Run AFTER schema.sql. No demo records or staff are seeded.
-- Browser writes are deliberately denied. A future trusted Edge API must check
-- the verified staff role and perform document/payment operations transactionally.
-- Adding Supabase keys does NOT activate the browser demo as a live back office.
begin;
create table if not exists public.bo_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check(length(display_name) between 1 and 200),
  role text not null check(role in ('main','viewer','accounts','rep')),
  active boolean not null default true
);
create table if not exists public.bo_clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id),
  rep_user_id uuid references public.bo_staff(user_id),
  name text not null,
  kind text not null check(kind in ('agent','bulk','private','website')),
  cash boolean not null default false,
  tier text not null default 'retail' check(tier in ('retail','agent','bulk')),
  contact jsonb not null default '{}' check(jsonb_typeof(contact)='object'),
  created_at timestamptz not null default now()
);
-- Authorised buyers (Customer Information Form section 5): each signs in with their own Auth account.
create table if not exists public.bo_client_users (
  client_id uuid not null references public.bo_clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '', mobile text not null default '',
  primary key(client_id,user_id)
);
create table if not exists public.bo_client_profiles (
  client_id uuid primary key references public.bo_clients(id) on delete cascade,
  profile jsonb not null check(jsonb_typeof(profile)='object'),
  updated_at timestamptz not null default now()
);
create index if not exists bo_clients_rep_idx on public.bo_clients(rep_user_id);
create table if not exists public.bo_catalogue (
  sku text primary key,
  details jsonb not null check(jsonb_typeof(details)='object' and not(details ?| array['cost','agent','bulk'])),
  retail numeric(14,2) check(retail >= 0 and retail <> 'NaN'::numeric),
  active boolean not null default true
);
create table if not exists public.bo_client_prices (
  client_id uuid references public.bo_clients(id) on delete cascade,
  sku text references public.bo_catalogue(sku),
  amount numeric(14,2) not null check(amount>0 and amount<>'NaN'::numeric),
  primary key(client_id,sku)
);
create table if not exists public.bo_tier_prices (
  tier text not null check(tier in ('agent','bulk')),
  sku text references public.bo_catalogue(sku),
  amount numeric(14,2) not null check(amount>0 and amount<>'NaN'::numeric),
  primary key(tier,sku)
);
create table if not exists public.bo_private_costs (
  sku text primary key references public.bo_catalogue(sku),
  unit_cost numeric(14,2) not null check(unit_cost>=0 and unit_cost<>'NaN'::numeric)
);
create table if not exists public.bo_client_notes (
  client_id uuid primary key references public.bo_clients(id) on delete cascade,
  notes text not null default ''
);
create sequence if not exists public.bo_invoice_number;
create sequence if not exists public.bo_quote_number;
create table if not exists public.bo_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique, -- retry key assigned by the trusted API
  client_id uuid not null references public.bo_clients(id),
  kind text not null check(kind in ('quote','invoice')),
  number text not null unique,
  document_date date not null,
  due_date date not null,
  channel text not null check(channel in ('website','private','agent')),
  lines jsonb not null check(jsonb_typeof(lines)='array' and jsonb_array_length(lines)>0 and not jsonb_path_exists(lines,'$.**.unitCost')),
  total numeric(14,2) not null check(total>0 and total<>'NaN'::numeric),
  cancelled boolean not null default false,
  linked_id uuid references public.bo_documents(id),
  notes text not null default '',
  reference text not null default '',
  cash_name text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check(due_date>=document_date)
);
create unique index if not exists bo_one_invoice_per_quote on public.bo_documents(linked_id) where kind='invoice' and linked_id is not null;
create table if not exists public.bo_document_costs (
  document_id uuid primary key references public.bo_documents(id),
  costs jsonb not null check(jsonb_typeof(costs)='array')
);
create table if not exists public.bo_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  document_id uuid not null references public.bo_documents(id),
  payment_date date not null,
  amount numeric(14,2) not null check(amount>0 and amount<>'NaN'::numeric),
  method text not null check(method in ('eft','cash','card','ozow','other')),
  note text not null default '',
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.bo_suppliers (
  id uuid primary key default gen_random_uuid(), name text not null, details jsonb not null default '{}'
);
create table if not exists public.bo_supplier_invoices (
  id uuid primary key default gen_random_uuid(), supplier_id uuid references public.bo_suppliers(id),
  number text not null, amount numeric(14,2) not null check(amount>0 and amount<>'NaN'::numeric),
  details jsonb not null default '{}', unique(supplier_id,number)
);
create table if not exists public.bo_bank_lines (
  id uuid primary key default gen_random_uuid(), fingerprint text not null unique,
  transaction_date date not null, amount numeric(14,2) not null check(amount<>'NaN'::numeric),
  description text not null, details jsonb not null default '{}'
);
create table if not exists public.bo_settings (
  id boolean primary key default true check(id), details jsonb not null default '{}'
);
create table if not exists public.bo_audit (
  id bigint generated always as identity primary key, actor uuid references auth.users(id),
  operation text not null, record_id uuid, details jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.bo_role() returns text language sql stable security definer set search_path='' as $$
  select role from public.bo_staff where user_id=auth.uid() and active
$$;
create or replace function public.bo_reads_client(client uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.bo_clients c where c.id=client and
    (c.auth_user_id=auth.uid() or exists(select 1 from public.bo_client_users m where m.client_id=c.id and m.user_id=auth.uid()) or
     public.bo_role() in ('main','viewer','accounts') or
     (public.bo_role()='rep' and c.rep_user_id=auth.uid())))
$$;
create or replace function public.bo_reads_document(doc uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.bo_documents d where d.id=doc and public.bo_reads_client(d.client_id) and
    (d.kind='invoice' or public.bo_role() in ('main','rep') or exists(select 1 from public.bo_clients c where c.id=d.client_id and
      (c.auth_user_id=auth.uid() or exists(select 1 from public.bo_client_users m where m.client_id=c.id and m.user_id=auth.uid())))))
$$;
-- Returns only the verified customer's own price. Email strings are never ownership proof.
create or replace function public.bo_my_price(product text) returns numeric language sql stable security definer set search_path='' as $$
  select coalesce(p.amount,t.amount,c.retail) from public.bo_catalogue c
  left join public.bo_clients u on u.id=(select coalesce(
    (select x.id from public.bo_clients x where x.auth_user_id=auth.uid() limit 1),
    (select m.client_id from public.bo_client_users m where m.user_id=auth.uid() order by m.client_id limit 1)))
  left join public.bo_client_prices p on p.client_id=u.id and p.sku=c.sku
  left join public.bo_tier_prices t on t.tier=u.tier and t.sku=c.sku
  where c.sku=product and c.active
$$;
revoke all on function public.bo_role(),public.bo_reads_client(uuid),public.bo_reads_document(uuid),public.bo_my_price(text) from public;
grant execute on function public.bo_role(),public.bo_reads_client(uuid),public.bo_reads_document(uuid),public.bo_my_price(text) to authenticated;
-- Deliveries: method and goods-received sign-off per invoice (signature stored as a PNG data URL or storage path).
create table if not exists public.bo_deliveries (
  document_id uuid primary key references public.bo_documents(id),
  method text not null check(method in ('own','courier','collect')),
  status text not null default 'pending' check(status in ('pending','delivered')),
  received_name text, received_surname text, received_date date,
  signature text check(signature is null or length(signature)<=400000),
  delivered_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check(status='pending' or (received_name<>'' and received_surname<>'' and received_date is not null and signature is not null))
);
-- Stock: batches without costs are visible to order takers (sell-first warnings); costs and counts are private.
create table if not exists public.bo_stock_batches (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.bo_catalogue(sku),
  booked_in date not null, qty integer not null check(qty>0),
  batch_number text not null default '', expiry_date date check(expiry_date is null or expiry_date>booked_in),
  supplier_invoice_id uuid references public.bo_supplier_invoices(id),
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.bo_stock_costs (
  batch_id uuid primary key references public.bo_stock_batches(id),
  unit_cost_ex numeric(14,2) not null check(unit_cost_ex>=0), unit_cost_incl numeric(14,2) not null check(unit_cost_incl>=unit_cost_ex),
  sell_price numeric(14,2) check(sell_price is null or sell_price>=0)
);
-- Rep details for the referral documents, and once-off referral commissions.
create table if not exists public.bo_rep_details (
  user_id uuid primary key references public.bo_staff(user_id) on delete cascade,
  id_number text not null default '', address text not null default '',
  bank jsonb not null default '{}' check(jsonb_typeof(bank)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.bo_referrals (
  id uuid primary key default gen_random_uuid(),
  rep_user_id uuid not null references public.bo_staff(user_id),
  client_id uuid not null references public.bo_clients(id),
  percent numeric(5,2) not null check(percent>0 and percent<=50),
  details jsonb not null default '{}',
  agreement_date date not null,
  signatory_name text not null, signatory_capacity text not null check(signatory_capacity in ('Director','Manager','Accountant')),
  paid_on date, paid_amount numeric(14,2) check(paid_amount is null or paid_amount>=0), net_value numeric(14,2),
  created_at timestamptz not null default now(),
  check((paid_on is null)=(paid_amount is null))
);
create table if not exists public.bo_stock_counts (
  id uuid primary key default gen_random_uuid(), sku text not null references public.bo_catalogue(sku),
  count_date date not null, expected integer not null, counted integer not null check(counted>=0),
  note text not null default '', counted_by uuid references auth.users(id), created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['bo_staff','bo_clients','bo_catalogue','bo_client_prices','bo_tier_prices','bo_private_costs','bo_client_notes','bo_documents','bo_document_costs','bo_payments','bo_suppliers','bo_supplier_invoices','bo_bank_lines','bo_settings','bo_audit','bo_deliveries','bo_stock_batches','bo_stock_costs','bo_stock_counts','bo_client_users','bo_client_profiles','bo_rep_details','bo_referrals'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('drop policy if exists bo_read on public.%I',t);
  end loop;
end $$;
create policy bo_read on public.bo_staff for select to authenticated using(user_id=auth.uid() or public.bo_role()='main');
create policy bo_read on public.bo_clients for select to authenticated using(public.bo_reads_client(id));
create policy bo_read on public.bo_catalogue for select to authenticated using(active or public.bo_role()='main');
create policy bo_read on public.bo_client_prices for select to authenticated using(public.bo_reads_client(client_id) and (public.bo_role()='main' or exists(select 1 from public.bo_clients c where c.id=client_id and c.auth_user_id=auth.uid())));
create policy bo_read on public.bo_documents for select to authenticated using(public.bo_reads_document(id));
create policy bo_read on public.bo_payments for select to authenticated using(public.bo_reads_document(document_id));
create policy bo_read on public.bo_tier_prices for select to authenticated using(public.bo_role()='main');
create policy bo_read on public.bo_private_costs for select to authenticated using(public.bo_role()='main');
create policy bo_read on public.bo_client_notes for select to authenticated using(public.bo_role()='main');
create policy bo_read on public.bo_document_costs for select to authenticated using(public.bo_role()='main');
create policy bo_read on public.bo_suppliers for select to authenticated using(public.bo_role() in ('main','accounts'));
create policy bo_read on public.bo_supplier_invoices for select to authenticated using(public.bo_role() in ('main','accounts'));
create policy bo_read on public.bo_bank_lines for select to authenticated using(public.bo_role() in ('main','accounts'));
create policy bo_read on public.bo_settings for select to authenticated using(public.bo_role() is not null);
create policy bo_read on public.bo_audit for select to authenticated using(public.bo_role()='main');
create policy bo_read on public.bo_deliveries for select to authenticated using(public.bo_reads_document(document_id));
create policy bo_read on public.bo_stock_batches for select to authenticated using(public.bo_role() is not null);
create policy bo_read on public.bo_stock_costs for select to authenticated using(public.bo_role() in ('main','accounts'));
create policy bo_read on public.bo_stock_counts for select to authenticated using(public.bo_role() in ('main','accounts'));
create policy bo_read on public.bo_client_users for select to authenticated using(public.bo_reads_client(client_id));
create policy bo_read on public.bo_client_profiles for select to authenticated using(public.bo_reads_client(client_id));
create policy bo_read on public.bo_rep_details for select to authenticated using(user_id=auth.uid() or public.bo_role() in ('main','accounts'));
create policy bo_read on public.bo_referrals for select to authenticated using(rep_user_id=auth.uid() or public.bo_role() in ('main','accounts'));
grant usage, select on sequence public.bo_invoice_number,public.bo_quote_number,public.bo_audit_id_seq to service_role;
revoke all on sequence public.bo_invoice_number,public.bo_quote_number,public.bo_audit_id_seq from anon,authenticated;
commit;
