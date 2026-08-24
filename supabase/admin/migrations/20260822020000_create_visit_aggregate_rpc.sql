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
