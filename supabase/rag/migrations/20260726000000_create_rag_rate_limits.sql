create table public.rag_rate_limits (
  bucket text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 1
);

alter table public.rag_rate_limits enable row level security;

revoke all on public.rag_rate_limits from anon, authenticated;
grant all on public.rag_rate_limits to service_role;

create or replace function public.hit_rag_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
  v_retry_after integer;
begin
  insert into rag_rate_limits as r (bucket, window_start, count)
  values (p_bucket, v_now, 1)
  on conflict (bucket) do update set
    count = case
      when r.window_start + make_interval(secs => p_window_seconds) <= v_now then 1
      else r.count + 1
    end,
    window_start = case
      when r.window_start + make_interval(secs => p_window_seconds) <= v_now then v_now
      else r.window_start
    end
  returning count, window_start into v_count, v_window_start;

  if v_count > p_limit then
    v_retry_after := greatest(
      1,
      extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now))::integer
    );
    return jsonb_build_object('allowed', false, 'retry_after_seconds', v_retry_after);
  end if;

  if random() < 0.02 then
    delete from rag_rate_limits
    where window_start < v_now - interval '2 days';
  end if;

  return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke execute on function public.hit_rag_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.hit_rag_rate_limit(text, integer, integer)
  to service_role;
