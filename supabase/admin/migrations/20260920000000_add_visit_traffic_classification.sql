alter table public.visit_sessions
  add column if not exists traffic_type text not null default 'N/A',
  add column if not exists traffic_reason text not null default 'N/A',
  add column if not exists origin_name text not null default 'N/A',
  add column if not exists origin_type text not null default 'N/A';

alter table public.visit_sessions
  add constraint visit_sessions_traffic_type_valid
    check (traffic_type in ('N/A', 'human', 'suspected_bot')),
  add constraint visit_sessions_origin_type_valid
    check (
      origin_type in (
        'N/A',
        'desktop_browser',
        'mobile_browser',
        'tablet_browser',
        'headless_browser',
        'automation',
        'unknown'
      )
    );

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
  p_traffic_type text,
  p_traffic_reason text,
  p_origin_name text,
  p_origin_type text,
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
    traffic_type,
    traffic_reason,
    origin_name,
    origin_type,
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
    coalesce(nullif(p_traffic_type, ''), 'N/A'),
    coalesce(nullif(p_traffic_reason, ''), 'N/A'),
    coalesce(nullif(p_origin_name, ''), 'Unknown'),
    coalesce(nullif(p_origin_type, ''), 'unknown'),
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
    traffic_type = case
      when public.visit_sessions.traffic_type = 'N/A' then excluded.traffic_type
      when public.visit_sessions.traffic_type = 'suspected_bot' and public.visit_sessions.traffic_reason <> 'low_engagement' then public.visit_sessions.traffic_type
      when excluded.traffic_type = 'suspected_bot' and excluded.traffic_reason <> 'low_engagement' then excluded.traffic_type
      when public.visit_sessions.traffic_type = 'human' or excluded.traffic_type = 'human' then 'human'
      else 'suspected_bot'
    end,
    traffic_reason = case
      when public.visit_sessions.traffic_type = 'N/A' then excluded.traffic_reason
      when public.visit_sessions.traffic_type = 'suspected_bot' and public.visit_sessions.traffic_reason <> 'low_engagement' then public.visit_sessions.traffic_reason
      when excluded.traffic_type = 'suspected_bot' and excluded.traffic_reason <> 'low_engagement' then excluded.traffic_reason
      when public.visit_sessions.traffic_type = 'human' or excluded.traffic_type = 'human' then 'N/A'
      else 'low_engagement'
    end,
    origin_name = case when public.visit_sessions.origin_name = 'N/A' then excluded.origin_name else public.visit_sessions.origin_name end,
    origin_type = case when public.visit_sessions.origin_type = 'N/A' then excluded.origin_type else public.visit_sessions.origin_type end,
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

revoke all on function public.record_visit_session(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.record_visit_session(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz, timestamptz) to service_role;
