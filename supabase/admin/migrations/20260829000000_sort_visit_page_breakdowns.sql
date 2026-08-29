drop function if exists public.get_visit_breakdown(text, text, integer, integer, timestamptz);
drop function if exists public.get_visit_breakdown(text, text, integer, integer, text, text, timestamptz);

create or replace function public.get_visit_breakdown(
  p_metric text,
  p_range text,
  p_page integer default 1,
  p_page_size integer default 10,
  p_sort_by text default 'pageViews',
  p_sort_direction text default 'desc',
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
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 10), 1), 50);
  v_sort_by text := case when p_sort_by in ('path', 'pageViews', 'uniqueVisitors', 'averageDurationMs') then p_sort_by else 'pageViews' end;
  v_sort_direction text := case when lower(coalesce(p_sort_direction, 'desc')) = 'asc' then 'asc' else 'desc' end;
  v_offset integer;
  v_total_records integer := 0;
  v_records jsonb;
  v_from timestamptz;
  v_to timestamptz;
begin
  v_offset := (v_page - 1) * v_page_size;
  select from_ts, to_ts into v_from, v_to from public.get_visit_range_bounds(v_range, p_now);

  if v_metric = 'countries' then
    with rows as (
      select coalesce(nullif(visit_sessions.country_code::text, ''), '??') as country_code, count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by coalesce(nullif(visit_sessions.country_code::text, ''), '??')
    ), total as (
      select count(*)::integer as total_records from rows
    ), paged as (
      select * from rows order by page_views desc, country_code limit v_page_size offset v_offset
    )
    select
      total.total_records,
      coalesce(
        jsonb_agg(jsonb_build_object('label', paged.country_code, 'value', paged.page_views) order by paged.page_views desc, paged.country_code)
          filter (where paged.country_code is not null),
        '[]'::jsonb
      )
    into v_total_records, v_records
    from total
    left join paged on true
    group by total.total_records;
  elsif v_metric = 'pages' then
    with rows as (
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
    ), total as (
      select count(*)::integer as total_records from rows
    ), paged as (
      select * from rows
      order by
        case when v_sort_by = 'path' and v_sort_direction = 'asc' then path end asc nulls last,
        case when v_sort_by = 'path' and v_sort_direction = 'desc' then path end desc nulls last,
        case when v_sort_by = 'pageViews' and v_sort_direction = 'asc' then page_views end asc nulls last,
        case when v_sort_by = 'pageViews' and v_sort_direction = 'desc' then page_views end desc nulls last,
        case when v_sort_by = 'uniqueVisitors' and v_sort_direction = 'asc' then unique_visitors end asc nulls last,
        case when v_sort_by = 'uniqueVisitors' and v_sort_direction = 'desc' then unique_visitors end desc nulls last,
        case when v_sort_by = 'averageDurationMs' and v_sort_direction = 'asc' then average_duration_ms end asc nulls last,
        case when v_sort_by = 'averageDurationMs' and v_sort_direction = 'desc' then average_duration_ms end desc nulls last,
        path
      limit v_page_size offset v_offset
    )
    select
      total.total_records,
      coalesce(
        jsonb_agg(jsonb_build_object(
          'id', paged.path,
          'path', paged.path,
          'pageViews', paged.page_views,
          'uniqueVisitors', paged.unique_visitors,
          'averageDurationMs', paged.average_duration_ms,
          'lastSeenAt', paged.last_seen_at
        ) order by
          case when v_sort_by = 'path' and v_sort_direction = 'asc' then paged.path end asc nulls last,
          case when v_sort_by = 'path' and v_sort_direction = 'desc' then paged.path end desc nulls last,
          case when v_sort_by = 'pageViews' and v_sort_direction = 'asc' then paged.page_views end asc nulls last,
          case when v_sort_by = 'pageViews' and v_sort_direction = 'desc' then paged.page_views end desc nulls last,
          case when v_sort_by = 'uniqueVisitors' and v_sort_direction = 'asc' then paged.unique_visitors end asc nulls last,
          case when v_sort_by = 'uniqueVisitors' and v_sort_direction = 'desc' then paged.unique_visitors end desc nulls last,
          case when v_sort_by = 'averageDurationMs' and v_sort_direction = 'asc' then paged.average_duration_ms end asc nulls last,
          case when v_sort_by = 'averageDurationMs' and v_sort_direction = 'desc' then paged.average_duration_ms end desc nulls last,
          paged.path
        ) filter (where paged.path is not null),
        '[]'::jsonb
      )
    into v_total_records, v_records
    from total
    left join paged on true
    group by total.total_records;
  elsif v_metric = 'sources' then
    with rows as (
      select
        public.get_visit_attribution_label(visit_sessions.referrer, visit_sessions.source, visit_sessions.campaign, visit_sessions.click_id) as source_label,
        count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by source_label
    ), total as (
      select count(*)::integer as total_records from rows
    ), paged as (
      select * from rows order by page_views desc, source_label limit v_page_size offset v_offset
    )
    select
      total.total_records,
      coalesce(
        jsonb_agg(jsonb_build_object('label', paged.source_label, 'value', paged.page_views) order by paged.page_views desc, paged.source_label)
          filter (where paged.source_label is not null),
        '[]'::jsonb
      )
    into v_total_records, v_records
    from total
    left join paged on true
    group by total.total_records;
  else
    with rows as (
      select
        public.get_visit_referrer_label(visit_sessions.referrer, visit_sessions.source, visit_sessions.campaign, visit_sessions.click_id) as referrer_label,
        count(*)::integer as page_views
      from public.visit_page_views
      join public.visit_sessions using (session_hash)
      where (v_from is null or visit_page_views.started_at >= v_from) and visit_page_views.started_at < v_to
      group by referrer_label
    ), total as (
      select count(*)::integer as total_records from rows
    ), paged as (
      select * from rows order by page_views desc, referrer_label limit v_page_size offset v_offset
    )
    select
      total.total_records,
      coalesce(
        jsonb_agg(jsonb_build_object('label', paged.referrer_label, 'value', paged.page_views) order by paged.page_views desc, paged.referrer_label)
          filter (where paged.referrer_label is not null),
        '[]'::jsonb
      )
    into v_total_records, v_records
    from total
    left join paged on true
    group by total.total_records;
  end if;

  return jsonb_build_object(
    'metric', v_metric,
    'range', v_range,
    'records', coalesce(v_records, '[]'::jsonb),
    'pagination', jsonb_build_object(
      'page', v_page,
      'pageSize', v_page_size,
      'totalRecords', v_total_records,
      'totalPages', greatest(1, (v_total_records + v_page_size - 1) / v_page_size)
    )
  );
end;
$$;

revoke all on function public.get_visit_breakdown(text, text, integer, integer, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.get_visit_breakdown(text, text, integer, integer, text, text, timestamptz) to service_role;
