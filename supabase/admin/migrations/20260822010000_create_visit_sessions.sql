create table public.visit_sessions (
  session_hash text primary key,
  country_code char(2),
  region text,
  city text,
  timezone text,
  language text,
  referrer text,
  entry_path text not null,
  page_count integer not null default 0,
  event_count integer not null default 0,
  duration_ms bigint not null default 0,
  page_views jsonb not null default '[]'::jsonb,
  events jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_sessions_entry_path_not_empty check (length(trim(entry_path)) > 0),
  constraint visit_sessions_page_count_nonnegative check (page_count >= 0),
  constraint visit_sessions_event_count_nonnegative check (event_count >= 0),
  constraint visit_sessions_duration_ms_nonnegative check (duration_ms >= 0),
  constraint visit_sessions_page_views_array check (jsonb_typeof(page_views) = 'array'),
  constraint visit_sessions_events_array check (jsonb_typeof(events) = 'array')
);

create index visit_sessions_last_seen_at_idx on public.visit_sessions (last_seen_at desc);
create index visit_sessions_country_code_idx on public.visit_sessions (country_code);
create index visit_sessions_city_idx on public.visit_sessions (city);
create index visit_sessions_events_gin_idx on public.visit_sessions using gin (events);
create index visit_sessions_page_views_gin_idx on public.visit_sessions using gin (page_views);

create trigger set_visit_sessions_updated_at
before update on public.visit_sessions
for each row
execute function public.set_updated_at();

alter table public.visit_sessions enable row level security;

revoke all on public.visit_sessions from anon, authenticated;

grant all on public.visit_sessions to service_role;

create or replace function public.record_visit_session(
  p_session_hash text,
  p_country_code text,
  p_region text,
  p_city text,
  p_timezone text,
  p_language text,
  p_referrer text,
  p_entry_path text,
  p_events jsonb,
  p_page_views jsonb,
  p_started_at timestamptz,
  p_last_seen_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country_code char(2);
  v_events jsonb;
  v_page_views jsonb;
  v_page_count integer;
  v_event_count integer;
  v_duration_ms bigint;
begin
  v_country_code := nullif(left(upper(trim(coalesce(p_country_code, ''))), 2), '')::char(2);
  v_events := case when jsonb_typeof(coalesce(p_events, '[]'::jsonb)) = 'array' then coalesce(p_events, '[]'::jsonb) else '[]'::jsonb end;
  v_page_views := case when jsonb_typeof(coalesce(p_page_views, '[]'::jsonb)) = 'array' then coalesce(p_page_views, '[]'::jsonb) else '[]'::jsonb end;
  v_page_count := jsonb_array_length(v_page_views);
  v_event_count := jsonb_array_length(v_events);

  select coalesce(sum(coalesce((page_view.value->>'durationMs')::bigint, 0)), 0)
  into v_duration_ms
  from jsonb_array_elements(v_page_views) as page_view(value);

  insert into public.visit_sessions (
    session_hash,
    country_code,
    region,
    city,
    timezone,
    language,
    referrer,
    entry_path,
    page_count,
    event_count,
    duration_ms,
    page_views,
    events,
    started_at,
    last_seen_at
  ) values (
    p_session_hash,
    v_country_code,
    nullif(p_region, ''),
    nullif(p_city, ''),
    nullif(p_timezone, ''),
    nullif(p_language, ''),
    nullif(p_referrer, ''),
    p_entry_path,
    v_page_count,
    v_event_count,
    v_duration_ms,
    v_page_views,
    v_events,
    coalesce(p_started_at, now()),
    coalesce(p_last_seen_at, now())
  )
  on conflict (session_hash) do update set
    country_code = coalesce(public.visit_sessions.country_code, excluded.country_code),
    region = coalesce(public.visit_sessions.region, excluded.region),
    city = coalesce(public.visit_sessions.city, excluded.city),
    timezone = coalesce(public.visit_sessions.timezone, excluded.timezone),
    language = coalesce(public.visit_sessions.language, excluded.language),
    referrer = coalesce(public.visit_sessions.referrer, excluded.referrer),
    page_views = public.visit_sessions.page_views || excluded.page_views,
    events = public.visit_sessions.events || excluded.events,
    page_count = public.visit_sessions.page_count + excluded.page_count,
    event_count = public.visit_sessions.event_count + excluded.event_count,
    duration_ms = public.visit_sessions.duration_ms + excluded.duration_ms,
    last_seen_at = greatest(public.visit_sessions.last_seen_at, excluded.last_seen_at),
    updated_at = now();
end;
$$;

revoke all on function public.record_visit_session(text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.record_visit_session(text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz) to service_role;
