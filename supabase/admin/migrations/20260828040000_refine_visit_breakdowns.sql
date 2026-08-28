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
      else date_trunc('day', p_now)
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
  v_range text := case when p_range in ('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'two_months', 'all_time') then p_range else 'today' end;
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
  v_range text := case when p_range in ('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'two_months', 'all_time') then p_range else 'today' end;
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
  v_range text := case when p_range in ('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'two_months', 'all_time') then p_range else 'today' end;
  v_from timestamptz;
  v_to timestamptz;
  v_records jsonb;
begin
  select from_ts, to_ts into v_from, v_to from public.get_visit_range_bounds(v_range, p_now);

  if v_metric = 'countries' then
    select coalesce(jsonb_agg(jsonb_build_object('label', country_code, 'value', page_views) order by page_views desc), '[]'::jsonb)
    into v_records
    from (
      select coalesce(nullif(visit_sessions.country_code::text, ''), '??') as country_code, count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by coalesce(nullif(visit_sessions.country_code::text, ''), '??')
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
        public.get_visit_attribution_label(visit_sessions.referrer, visit_sessions.source, visit_sessions.campaign, visit_sessions.click_id) as source_label,
        count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by source_label
      order by page_views desc
      limit 10
    ) sources;
  else
    select coalesce(jsonb_agg(jsonb_build_object('label', referrer_label, 'value', page_views) order by page_views desc), '[]'::jsonb)
    into v_records
    from (
      select
        public.get_visit_referrer_label(visit_sessions.referrer, visit_sessions.source, visit_sessions.campaign, visit_sessions.click_id) as referrer_label,
        count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by referrer_label
      order by page_views desc
      limit 10
    ) referrers;
  end if;

  return jsonb_build_object('metric', v_metric, 'range', v_range, 'records', coalesce(v_records, '[]'::jsonb));
end;
$$;

create or replace function public.get_visit_attribution_label(
  p_referrer text,
  p_source text,
  p_campaign text,
  p_click_id text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when nullif(trim(coalesce(p_source, '')), '') is not null then lower(trim(p_source))
    when nullif(trim(coalesce(p_click_id, '')), '') is not null then case lower(trim(p_click_id))
      when 'li_fat_id' then 'linkedin'
      when 'twclid' then 'twitter'
      when 'fbclid' then 'facebook'
      when 'gbraid' then 'google'
      when 'gclid' then 'google'
      when 'wbraid' then 'google'
      when 'msclkid' then 'bing'
      when 'ttclid' then 'tiktok'
      when 'rdt_cid' then 'reddit'
      when 'epik' then 'pinterest'
      when 'scid' then 'snapchat'
      when 'mc_cid' then 'newsletter'
      else lower(trim(p_click_id))
    end
    when nullif(trim(coalesce(p_campaign, '')), '') is not null then lower(trim(p_campaign))
    when nullif(trim(coalesce(p_referrer, '')), '') is not null then lower(coalesce(substring(p_referrer from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]+)'), p_referrer))
    else '(direct)'
  end;
$$;

create or replace function public.get_visit_referrer_label(
  p_referrer text,
  p_source text,
  p_campaign text,
  p_click_id text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when nullif(trim(coalesce(p_referrer, '')), '') is not null then lower(coalesce(substring(p_referrer from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#]+)'), p_referrer))
    else public.get_visit_attribution_label(p_referrer, p_source, p_campaign, p_click_id)
  end;
$$;

revoke all on function public.get_visit_range_bounds(text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_visit_stat(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_visit_chart(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_visit_breakdown(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_visit_attribution_label(text, text, text, text) from public, anon, authenticated;
revoke all on function public.get_visit_referrer_label(text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_visit_stat(text, text, timestamptz) to service_role;
grant execute on function public.get_visit_chart(text, text, timestamptz) to service_role;
grant execute on function public.get_visit_breakdown(text, text, timestamptz) to service_role;
