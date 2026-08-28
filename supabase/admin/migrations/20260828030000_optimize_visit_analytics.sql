create table if not exists public.visit_page_views (
  session_hash text not null references public.visit_sessions(session_hash) on delete cascade,
  sequence integer not null,
  path text not null,
  title text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_ms bigint not null default 0,
  primary key (session_hash, sequence)
);

create table if not exists public.visit_events (
  session_hash text not null references public.visit_sessions(session_hash) on delete cascade,
  sequence integer not null,
  name text not null,
  params jsonb not null default '{}'::jsonb,
  path text,
  occurred_at timestamptz not null,
  primary key (session_hash, sequence)
);

create index if not exists visit_page_views_started_at_idx on public.visit_page_views (started_at desc);
create index if not exists visit_page_views_path_idx on public.visit_page_views (path);
create index if not exists visit_page_views_session_hash_idx on public.visit_page_views (session_hash);
create index if not exists visit_events_occurred_at_idx on public.visit_events (occurred_at desc);
create index if not exists visit_events_name_idx on public.visit_events (name);
create index if not exists visit_events_session_hash_idx on public.visit_events (session_hash);

alter table public.visit_page_views enable row level security;
alter table public.visit_events enable row level security;

revoke all on public.visit_page_views from anon, authenticated;
revoke all on public.visit_events from anon, authenticated;

grant all on public.visit_page_views to service_role;
grant all on public.visit_events to service_role;

with page_view_rows as (
  select
    visit_sessions.session_hash,
    case when page_view.value->>'sequence' ~ '^-?\d+$' then (page_view.value->>'sequence')::integer else 0 end as sequence,
    page_view.value->>'path' as path,
    nullif(page_view.value->>'title', '') as title,
    (page_view.value->>'startedAt')::timestamptz as started_at,
    coalesce(nullif(page_view.value->>'endedAt', '')::timestamptz, (page_view.value->>'startedAt')::timestamptz) as ended_at,
    coalesce(nullif(page_view.value->>'durationMs', '')::bigint, 0) as duration_ms
  from public.visit_sessions
  cross join lateral jsonb_array_elements(visit_sessions.page_views) as page_view(value)
  where nullif(page_view.value->>'path', '') is not null
    and nullif(page_view.value->>'startedAt', '') is not null
), deduped_page_view_rows as (
  select *, row_number() over (partition by session_hash, sequence order by started_at desc) as row_number
  from page_view_rows
)
insert into public.visit_page_views (
  session_hash,
  sequence,
  path,
  title,
  started_at,
  ended_at,
  duration_ms
)
select session_hash, sequence, path, title, started_at, ended_at, duration_ms
from deduped_page_view_rows
where row_number = 1
on conflict (session_hash, sequence) do update set
  path = excluded.path,
  title = excluded.title,
  ended_at = excluded.ended_at,
  duration_ms = excluded.duration_ms;

with event_rows as (
  select
    visit_sessions.session_hash,
    case when event.value->>'sequence' ~ '^-?\d+$' then (event.value->>'sequence')::integer else 0 end as sequence,
    event.value->>'name' as name,
    case when jsonb_typeof(event.value->'params') = 'object' then event.value->'params' else '{}'::jsonb end as params,
    nullif(event.value->>'path', '') as path,
    (event.value->>'timestamp')::timestamptz as occurred_at
  from public.visit_sessions
  cross join lateral jsonb_array_elements(visit_sessions.events) as event(value)
  where nullif(event.value->>'name', '') is not null
    and event.value->>'name' <> 'page_view'
    and nullif(event.value->>'timestamp', '') is not null
), deduped_event_rows as (
  select *, row_number() over (partition by session_hash, sequence order by occurred_at desc) as row_number
  from event_rows
)
insert into public.visit_events (
  session_hash,
  sequence,
  name,
  params,
  path,
  occurred_at
)
select session_hash, sequence, name, params, path, occurred_at
from deduped_event_rows
where row_number = 1
on conflict (session_hash, sequence) do update set
  name = excluded.name,
  params = excluded.params,
  path = excluded.path,
  occurred_at = excluded.occurred_at;

create or replace function public.record_visit_session(
  p_session_hash text,
  p_country_code text,
  p_region text,
  p_city text,
  p_timezone text,
  p_language text,
  p_referrer text,
  p_source text,
  p_medium text,
  p_campaign text,
  p_term text,
  p_content text,
  p_click_id text,
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

  select coalesce(sum(coalesce(nullif(page_view.value->>'durationMs', '')::bigint, 0)), 0)
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
    source,
    medium,
    campaign,
    term,
    content,
    click_id,
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
    nullif(p_source, ''),
    nullif(p_medium, ''),
    nullif(p_campaign, ''),
    nullif(p_term, ''),
    nullif(p_content, ''),
    nullif(p_click_id, ''),
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
    source = coalesce(public.visit_sessions.source, excluded.source),
    medium = coalesce(public.visit_sessions.medium, excluded.medium),
    campaign = coalesce(public.visit_sessions.campaign, excluded.campaign),
    term = coalesce(public.visit_sessions.term, excluded.term),
    content = coalesce(public.visit_sessions.content, excluded.content),
    click_id = coalesce(public.visit_sessions.click_id, excluded.click_id),
    page_views = public.visit_sessions.page_views || excluded.page_views,
    events = public.visit_sessions.events || excluded.events,
    page_count = public.visit_sessions.page_count + excluded.page_count,
    event_count = public.visit_sessions.event_count + excluded.event_count,
    duration_ms = public.visit_sessions.duration_ms + excluded.duration_ms,
    last_seen_at = greatest(public.visit_sessions.last_seen_at, excluded.last_seen_at),
    updated_at = now();

  insert into public.visit_page_views (session_hash, sequence, path, title, started_at, ended_at, duration_ms)
  select session_hash, sequence, path, title, started_at, ended_at, duration_ms
  from (
    select *, row_number() over (partition by session_hash, sequence order by started_at desc) as row_number
    from (
      select
        p_session_hash as session_hash,
        case when page_view.value->>'sequence' ~ '^-?\d+$' then (page_view.value->>'sequence')::integer else 0 end as sequence,
        page_view.value->>'path' as path,
        nullif(page_view.value->>'title', '') as title,
        (page_view.value->>'startedAt')::timestamptz as started_at,
        coalesce(nullif(page_view.value->>'endedAt', '')::timestamptz, (page_view.value->>'startedAt')::timestamptz) as ended_at,
        coalesce(nullif(page_view.value->>'durationMs', '')::bigint, 0) as duration_ms
      from jsonb_array_elements(v_page_views) as page_view(value)
      where nullif(page_view.value->>'path', '') is not null
        and nullif(page_view.value->>'startedAt', '') is not null
    ) page_view_rows
  ) deduped_page_view_rows
  where row_number = 1
  on conflict (session_hash, sequence) do update set
    path = excluded.path,
    title = excluded.title,
    ended_at = excluded.ended_at,
    duration_ms = excluded.duration_ms;

  insert into public.visit_events (session_hash, sequence, name, params, path, occurred_at)
  select session_hash, sequence, name, params, path, occurred_at
  from (
    select *, row_number() over (partition by session_hash, sequence order by occurred_at desc) as row_number
    from (
      select
        p_session_hash as session_hash,
        case when event.value->>'sequence' ~ '^-?\d+$' then (event.value->>'sequence')::integer else 0 end as sequence,
        event.value->>'name' as name,
        case when jsonb_typeof(event.value->'params') = 'object' then event.value->'params' else '{}'::jsonb end as params,
        nullif(event.value->>'path', '') as path,
        (event.value->>'timestamp')::timestamptz as occurred_at
      from jsonb_array_elements(v_events) as event(value)
      where nullif(event.value->>'name', '') is not null
        and event.value->>'name' <> 'page_view'
        and nullif(event.value->>'timestamp', '') is not null
    ) event_rows
  ) deduped_event_rows
  where row_number = 1
  on conflict (session_hash, sequence) do update set
    name = excluded.name,
    params = excluded.params,
    path = excluded.path,
    occurred_at = excluded.occurred_at;
end;
$$;

create or replace function public.get_visit_range_bounds(
  p_range text,
  p_now timestamptz default now()
)
returns table(from_ts timestamptz, to_ts timestamptz, bucket_granularity text)
language sql
stable
set search_path = public
as $$
  select
    case p_range
      when 'today' then date_trunc('day', p_now)
      when 'yesterday' then date_trunc('day', p_now) - interval '1 day'
      when 'this_week' then date_trunc('week', p_now)
      when 'last_week' then date_trunc('week', p_now) - interval '1 week'
      when 'this_month' then date_trunc('month', p_now)
      when 'two_months' then p_now - interval '2 months'
      when 'all_time' then null
      else date_trunc('month', p_now)
    end,
    case p_range
      when 'yesterday' then date_trunc('day', p_now)
      when 'last_week' then date_trunc('week', p_now)
      else p_now
    end,
    case p_range
      when 'all_time' then 'month'
      else 'day'
    end;
$$;

create or replace function public.get_visit_stat(
  p_metric text,
  p_range text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_metric text := case when p_metric in ('page_views', 'visits', 'events', 'countries') then p_metric else 'page_views' end;
  v_range text := case when p_range in ('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'two_months', 'all_time') then p_range else 'this_month' end;
  v_from timestamptz;
  v_to timestamptz;
  v_value integer;
begin
  select from_ts, to_ts into v_from, v_to from public.get_visit_range_bounds(v_range, p_now);

  if v_metric = 'page_views' then
    select count(*)::integer into v_value
    from public.visit_page_views
    where (v_from is null or started_at >= v_from) and started_at < v_to;
  elsif v_metric = 'visits' then
    select count(distinct session_hash)::integer into v_value
    from public.visit_page_views
    where (v_from is null or started_at >= v_from) and started_at < v_to;
  elsif v_metric = 'events' then
    select count(*)::integer into v_value
    from public.visit_events
    where (v_from is null or occurred_at >= v_from) and occurred_at < v_to;
  else
    select count(distinct visit_sessions.country_code)::integer into v_value
    from public.visit_page_views
    join public.visit_sessions using (session_hash)
    where visit_sessions.country_code is not null
      and (v_from is null or visit_page_views.started_at >= v_from)
      and visit_page_views.started_at < v_to;
  end if;

  return jsonb_build_object('metric', v_metric, 'range', v_range, 'value', coalesce(v_value, 0));
end;
$$;

create or replace function public.get_visit_chart(
  p_range text,
  p_series text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_range text := case when p_range in ('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'two_months', 'all_time') then p_range else 'this_month' end;
  v_series text := case when p_series in ('all', 'page_views', 'visits', 'events') then p_series else 'all' end;
  v_from timestamptz;
  v_to timestamptz;
  v_granularity text;
  v_format text;
  v_points jsonb;
begin
  select from_ts, to_ts, bucket_granularity into v_from, v_to, v_granularity from public.get_visit_range_bounds(v_range, p_now);
  v_format := case when v_granularity = 'month' then 'YYYY-MM' else 'YYYY-MM-DD' end;

  if v_series = 'page_views' then
    select coalesce(jsonb_agg(jsonb_build_object('label', label, 'pageViews', page_views) order by bucket), '[]'::jsonb)
    into v_points
    from (
      select date_trunc(v_granularity, started_at) as bucket, to_char(date_trunc(v_granularity, started_at), v_format) as label, count(*)::integer as page_views
      from public.visit_page_views
      where (v_from is null or started_at >= v_from) and started_at < v_to
      group by bucket, label
    ) points;
  elsif v_series = 'visits' then
    select coalesce(jsonb_agg(jsonb_build_object('label', label, 'visits', visits) order by bucket), '[]'::jsonb)
    into v_points
    from (
      select date_trunc(v_granularity, started_at) as bucket, to_char(date_trunc(v_granularity, started_at), v_format) as label, count(distinct session_hash)::integer as visits
      from public.visit_page_views
      where (v_from is null or started_at >= v_from) and started_at < v_to
      group by bucket, label
    ) points;
  elsif v_series = 'events' then
    select coalesce(jsonb_agg(jsonb_build_object('label', label, 'events', events) order by bucket), '[]'::jsonb)
    into v_points
    from (
      select date_trunc(v_granularity, occurred_at) as bucket, to_char(date_trunc(v_granularity, occurred_at), v_format) as label, count(*)::integer as events
      from public.visit_events
      where (v_from is null or occurred_at >= v_from) and occurred_at < v_to
      group by bucket, label
    ) points;
  else
    with page_points as (
      select date_trunc(v_granularity, started_at) as bucket, count(*)::integer as page_views, count(distinct session_hash)::integer as visits
      from public.visit_page_views
      where (v_from is null or started_at >= v_from) and started_at < v_to
      group by bucket
    ), event_points as (
      select date_trunc(v_granularity, occurred_at) as bucket, count(*)::integer as events
      from public.visit_events
      where (v_from is null or occurred_at >= v_from) and occurred_at < v_to
      group by bucket
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'label', to_char(coalesce(page_points.bucket, event_points.bucket), v_format),
      'pageViews', coalesce(page_points.page_views, 0),
      'visits', coalesce(page_points.visits, 0),
      'events', coalesce(event_points.events, 0)
    ) order by coalesce(page_points.bucket, event_points.bucket)), '[]'::jsonb)
    into v_points
    from page_points
    full outer join event_points on event_points.bucket = page_points.bucket;
  end if;

  return jsonb_build_object('range', v_range, 'series', v_series, 'points', coalesce(v_points, '[]'::jsonb));
end;
$$;

create or replace function public.get_visit_breakdown(
  p_metric text,
  p_range text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_metric text := case when p_metric in ('countries', 'pages', 'sources', 'referrers') then p_metric else 'countries' end;
  v_range text := case when p_range in ('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'two_months', 'all_time') then p_range else 'this_month' end;
  v_from timestamptz;
  v_to timestamptz;
  v_records jsonb;
begin
  select from_ts, to_ts into v_from, v_to from public.get_visit_range_bounds(v_range, p_now);

  if v_metric = 'countries' then
    select coalesce(jsonb_agg(jsonb_build_object('label', country_code, 'value', page_views) order by page_views desc), '[]'::jsonb)
    into v_records
    from (
      select coalesce(visit_sessions.country_code::text, '??') as country_code, count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by coalesce(visit_sessions.country_code::text, '??')
      order by page_views desc
      limit 10
    ) countries;
  elsif v_metric = 'pages' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', path,
      'path', path,
      'pageViews', page_views,
      'uniqueVisitors', unique_visitors,
      'averageDurationMs', average_duration_ms,
      'lastSeenAt', last_seen_at
    ) order by page_views desc), '[]'::jsonb)
    into v_records
    from (
      select
        path,
        count(*)::integer as page_views,
        count(distinct session_hash)::integer as unique_visitors,
        round(avg(duration_ms))::bigint as average_duration_ms,
        max(coalesce(ended_at, started_at)) as last_seen_at
      from public.visit_page_views
      where path is not null and path <> ''
        and (v_from is null or started_at >= v_from)
        and started_at < v_to
      group by path
      order by page_views desc
      limit 20
    ) pages;
  elsif v_metric = 'sources' then
    select coalesce(jsonb_agg(jsonb_build_object('label', source_label, 'value', page_views) order by page_views desc), '[]'::jsonb)
    into v_records
    from (
      select
        case
          when visit_sessions.source is not null and trim(visit_sessions.source) <> '' then lower(trim(visit_sessions.source))
          when visit_sessions.referrer is null or trim(visit_sessions.referrer) = '' then '(direct)'
          else lower(coalesce(substring(visit_sessions.referrer from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]+)'), visit_sessions.referrer))
        end as source_label,
        count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by source_label
      order by page_views desc
      limit 10
    ) sources;
  else
    select coalesce(jsonb_agg(jsonb_build_object('label', referrer_host, 'value', page_views) order by page_views desc), '[]'::jsonb)
    into v_records
    from (
      select
        case
          when visit_sessions.referrer is null or trim(visit_sessions.referrer) = '' then '(direct)'
          else lower(coalesce(substring(visit_sessions.referrer from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]+)'), visit_sessions.referrer))
        end as referrer_host,
        count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by referrer_host
      order by page_views desc
      limit 10
    ) referrers;
  end if;

  return jsonb_build_object('metric', v_metric, 'range', v_range, 'records', coalesce(v_records, '[]'::jsonb));
end;
$$;

create or replace function public.aggregate_visit_metrics(
  p_range text,
  p_now timestamptz default now()
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total', (public.get_visit_stat('page_views', p_range, p_now)->>'value')::integer,
      'visits', (public.get_visit_stat('visits', p_range, p_now)->>'value')::integer,
      'uniqueVisitors', (public.get_visit_stat('visits', p_range, p_now)->>'value')::integer,
      'today', (public.get_visit_stat('page_views', 'today', p_now)->>'value')::integer,
      'countries', (public.get_visit_stat('countries', p_range, p_now)->>'value')::integer
    ),
    'points', public.get_visit_chart(p_range, 'all', p_now)->'points',
    'countryBreakdown', public.get_visit_breakdown('countries', p_range, p_now)->'records',
    'topPages', public.get_visit_breakdown('pages', p_range, p_now)->'records',
    'topReferrers', public.get_visit_breakdown('referrers', p_range, p_now)->'records',
    'topSources', public.get_visit_breakdown('sources', p_range, p_now)->'records'
  );
$$;

revoke all on function public.get_visit_range_bounds(text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_visit_stat(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_visit_chart(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_visit_breakdown(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.aggregate_visit_metrics(text, timestamptz) from public, anon, authenticated;

grant execute on function public.get_visit_stat(text, text, timestamptz) to service_role;
grant execute on function public.get_visit_chart(text, text, timestamptz) to service_role;
grant execute on function public.get_visit_breakdown(text, text, timestamptz) to service_role;
grant execute on function public.aggregate_visit_metrics(text, timestamptz) to service_role;
