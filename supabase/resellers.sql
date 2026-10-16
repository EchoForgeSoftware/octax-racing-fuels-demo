-- Run after schema.sql. Private submissions and manual business decisions.
begin;
create table if not exists public.reseller_applications (
  ref text primary key,
  capability_hash text not null,
  request_hash text not null,
  details jsonb not null,
  privacy_version text not null,
  privacy_acknowledged_at timestamptz not null default clock_timestamp(),
  status text not null default 'new' check(status in ('new','in_review','approved','declined')),
  review_notes text,
  notification_status text not null default 'pending' check(notification_status in ('pending','sent')),
  notification_id text,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.reseller_applications enable row level security;
revoke all on public.reseller_applications from public,anon,authenticated;
grant all on public.reseller_applications to service_role;
create or replace function public.reserve_reseller_application(p_ref text,p_capability_hash text,p_request_hash text,p_details jsonb,p_privacy_version text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare application public.reseller_applications;
begin
  if p_privacy_version is distinct from public.current_terms_version() then raise exception 'Current privacy acknowledgement required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_ref,0));
  select * into application from public.reseller_applications where ref=p_ref;
  if found then
    if application.capability_hash<>p_capability_hash or application.request_hash<>p_request_hash then raise exception 'Application conflict'; end if;
  else
    insert into public.reseller_applications(ref,capability_hash,request_hash,details,privacy_version)
    values(p_ref,p_capability_hash,p_request_hash,p_details,p_privacy_version) returning * into application;
  end if;
  return to_jsonb(application);
end;$$;
revoke all on function public.reserve_reseller_application(text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.reserve_reseller_application(text,text,text,jsonb,text) to service_role;
create table if not exists public.reseller_request_limits(bucket text primary key,attempts integer not null,started_at timestamptz not null default now());
alter table public.reseller_request_limits enable row level security;
revoke all on public.reseller_request_limits from public,anon,authenticated;
create or replace function public.reseller_take_rate_limit(p_bucket text,p_max integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare hits integer;
begin
  if p_seconds not in (60,86400) or p_max<1 then raise exception 'Invalid rate window'; end if;
  delete from public.reseller_request_limits where started_at<now()-interval '2 days';
  insert into public.reseller_request_limits(bucket,attempts) values(p_bucket,1)
  on conflict(bucket) do update set
    attempts=case when reseller_request_limits.started_at<now()-make_interval(secs=>p_seconds) then 1 else reseller_request_limits.attempts+1 end,
    started_at=case when reseller_request_limits.started_at<now()-make_interval(secs=>p_seconds) then now() else reseller_request_limits.started_at end
  returning attempts into hits;
  return hits<=p_max;
end;$$;
revoke all on function public.reseller_take_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.reseller_take_rate_limit(text,integer,integer) to service_role;
commit;
