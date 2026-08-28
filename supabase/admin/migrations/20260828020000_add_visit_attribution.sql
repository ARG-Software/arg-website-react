alter table public.visit_sessions
  add column if not exists source text,
  add column if not exists medium text,
  add column if not exists campaign text,
  add column if not exists term text,
  add column if not exists content text,
  add column if not exists click_id text;

drop function if exists public.record_visit_session(text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz);

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
end;
$$;

revoke all on function public.record_visit_session(text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.record_visit_session(text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz) to service_role;

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
  with bounds as (
    select case p_range
      when '7d' then p_now - interval '7 days'
      when '2m' then p_now - interval '2 months'
      else p_now - interval '30 days'
    end as from_ts
  ),
  filtered_sessions as (
    select *
    from public.visit_sessions, bounds
    where visit_sessions.last_seen_at >= bounds.from_ts
  ),
  page_views as (
    select
      session_hash,
      country_code,
      referrer,
      source,
      page_view.value->>'path' as path,
      nullif(page_view.value->>'startedAt', '')::timestamptz as started_at,
      nullif(page_view.value->>'endedAt', '')::timestamptz as ended_at,
      coalesce((page_view.value->>'durationMs')::bigint, 0) as duration_ms
    from filtered_sessions
    cross join lateral jsonb_array_elements(filtered_sessions.page_views) as page_view(value), bounds
    where nullif(page_view.value->>'startedAt', '')::timestamptz >= bounds.from_ts
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'total', coalesce((select count(*) from page_views), 0),
      'visits', coalesce((select count(distinct session_hash) from filtered_sessions), 0),
      'uniqueVisitors', coalesce((select count(distinct session_hash) from page_views), 0),
      'today', coalesce((select count(*) from page_views where started_at >= date_trunc('day', p_now)), 0),
      'countries', coalesce((select count(distinct country_code) from filtered_sessions where country_code is not null), 0)
    ),
    'points', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'label', to_char(bucket, 'YYYY-MM-DD'),
          'visits', visits,
          'uniqueVisitors', unique_visitors
        )
        order by bucket
      )
      from (
        select
          date_trunc('day', started_at)::date as bucket,
          count(*)::integer as visits,
          count(distinct session_hash)::integer as unique_visitors
        from page_views
        group by bucket
        order by bucket
      ) points
    ), '[]'::jsonb),
    'countryBreakdown', coalesce((
      select jsonb_agg(
        jsonb_build_object('label', country_code, 'value', visits)
        order by visits desc
      )
      from (
        select coalesce(country_code::text, '??') as country_code, count(*)::integer as visits
        from page_views
        group by coalesce(country_code::text, '??')
        order by visits desc
        limit 10
      ) countries
    ), '[]'::jsonb),
    'topPages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', path,
          'path', path,
          'visits', visits,
          'uniqueVisitors', unique_visitors,
          'averageDurationMs', average_duration_ms,
          'lastSeenAt', last_seen_at
        )
        order by visits desc
      )
      from (
        select
          path,
          count(*)::integer as visits,
          count(distinct session_hash)::integer as unique_visitors,
          round(avg(duration_ms))::bigint as average_duration_ms,
          max(coalesce(ended_at, started_at)) as last_seen_at
        from page_views
        where path is not null and path <> ''
        group by path
        order by visits desc
        limit 20
      ) pages
    ), '[]'::jsonb),
    'topSources', coalesce((
      select jsonb_agg(
        jsonb_build_object('label', source_label, 'value', visits)
        order by visits desc
      )
      from (
        select
          case
            when source is not null and trim(source) <> '' then lower(trim(source))
            when referrer is null or trim(referrer) = '' then '(direct)'
            else lower(coalesce(substring(referrer from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]+)'), referrer))
          end as source_label,
          count(*)::integer as visits
        from page_views
        group by source_label
        order by visits desc
        limit 10
      ) sources
    ), '[]'::jsonb),
    'topReferrers', coalesce((
      select jsonb_agg(
        jsonb_build_object('label', referrer_host, 'value', visits)
        order by visits desc
      )
      from (
        select
          case
            when referrer is null or trim(referrer) = '' then '(direct)'
            else lower(coalesce(substring(referrer from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]+)'), referrer))
          end as referrer_host,
          count(*)::integer as visits
        from page_views
        group by referrer_host
        order by visits desc
        limit 10
      ) referrers
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.aggregate_visit_metrics(text, timestamptz) from public, anon, authenticated;
grant execute on function public.aggregate_visit_metrics(text, timestamptz) to service_role;
