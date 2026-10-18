-- Live back office. Run AFTER setup-all.sql (or schema.sql + backoffice.sql). Rerunnable.
--
-- Records are stored one row per record (collection + id) and are read and
-- written ONLY by the "backoffice" Edge Function with the service role. The
-- function verifies the signed-in staff member and runs the same role rules
-- as the admin screens (src/lib/backoffice/actions.ts and scope.ts) before
-- anything is saved. Browsers have no access to these tables at all.
--
-- Staff: the four invites below become staff the first time that person signs
-- in on octa-boost.com with that (confirmed) email address. Reps are added by a
-- main admin in Settings and sign in with the email entered there.
begin;

create table if not exists public.bo_store (
  collection text not null check (collection in ('settings','catalogue','clients','documents','suppliers','supplierInvoices','bank','reps','stock','stockCounts','referrals','file')),
  id text not null check (length(id) between 1 and 80),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

-- One counter for every save, so two people saving at once can't overwrite each other.
create table if not exists public.bo_store_version (
  id boolean primary key default true check (id),
  version bigint not null default 0
);
insert into public.bo_store_version(id, version) values (true, 0) on conflict (id) do nothing;

create table if not exists public.bo_staff_invites (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  display_name text not null check (length(display_name) between 1 and 200),
  role text not null check (role in ('main','viewer','accounts')),
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['bo_store','bo_store_version','bo_staff_invites'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- Everything except stored files, grouped by collection.
create or replace function public.bo_store_load(p_collections text[] default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'version', (select v.version from public.bo_store_version v where v.id),
    'rows', coalesce((
      select jsonb_object_agg(g.collection, g.items) from (
        select s.collection, jsonb_agg(s.data order by s.id) as items
        from public.bo_store s
        where s.collection <> 'file' and (p_collections is null or s.collection = any(p_collections))
        group by s.collection
      ) g), '{}'::jsonb))
$$;

-- Saves a set of changes only if nobody else saved since p_version. Returns the new version, or null on a clash.
create or replace function public.bo_store_commit(p_version bigint, p_upserts jsonb, p_deletes jsonb, p_actor uuid, p_operation text, p_details jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v bigint;
begin
  update public.bo_store_version set version = version + 1 where id and version = p_version returning version into v;
  if v is null then return null; end if;
  delete from public.bo_store s
    using jsonb_to_recordset(coalesce(p_deletes, '[]'::jsonb)) as x(collection text, id text)
    where s.collection = x.collection and s.id = x.id;
  insert into public.bo_store(collection, id, data, updated_at)
    select x.collection, x.id, x.data, now() from jsonb_to_recordset(coalesce(p_upserts, '[]'::jsonb)) as x(collection text, id text, data jsonb)
    on conflict (collection, id) do update set data = excluded.data, updated_at = now();
  insert into public.bo_audit(actor, operation, details) values (p_actor, left(p_operation, 80), coalesce(p_details, '{}'::jsonb));
  return v;
end $$;

-- First back-office sign-in of an invited email. The email must be the user's own, confirmed address.
create or replace function public.bo_claim_staff_invite(p_user uuid, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i public.bo_staff_invites;
begin
  if not exists (select 1 from auth.users u where u.id = p_user and lower(u.email) = lower(p_email) and u.email_confirmed_at is not null) then
    return null;
  end if;
  select * into i from public.bo_staff_invites where email = lower(p_email) and claimed_by is null for update;
  if not found then return null; end if;
  insert into public.bo_staff(user_id, display_name, role, active) values (p_user, i.display_name, i.role, true)
    on conflict (user_id) do nothing;
  update public.bo_staff_invites set claimed_by = p_user where email = i.email;
  return (select jsonb_build_object('display_name', s.display_name, 'role', s.role, 'active', s.active) from public.bo_staff s where s.user_id = p_user);
end $$;

revoke all on function public.bo_store_load(text[]), public.bo_store_commit(bigint, jsonb, jsonb, uuid, text, jsonb), public.bo_claim_staff_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.bo_store_load(text[]), public.bo_store_commit(bigint, jsonb, jsonb, uuid, text, jsonb), public.bo_claim_staff_invite(uuid, text) to service_role;
grant insert on public.bo_audit to service_role;

insert into public.bo_staff_invites(email, display_name, role) values
  ('zuan@octa-boost.com', 'Zuan', 'main'),
  ('zandro@octa-boost.com', 'Zandro', 'main'),
  ('danium@octa-boost.com', 'Danium', 'viewer'),
  ('accounts@octa-boost.com', 'Accounts', 'accounts')
on conflict (email) do nothing;

commit;
