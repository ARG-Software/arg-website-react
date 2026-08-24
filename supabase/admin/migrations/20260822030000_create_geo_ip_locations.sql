create extension if not exists btree_gist;

create table public.geo_ip_locations (
  network cidr primary key,
  country_code char(2),
  region text,
  city text,
  timezone text,
  source text not null default 'maxmind_geolite2_city',
  updated_at timestamptz not null default now(),
  constraint geo_ip_locations_country_code_format check (
    country_code is null or country_code ~ '^[A-Z]{2}$'
  )
);

create index geo_ip_locations_network_gist_idx on public.geo_ip_locations using gist (network inet_ops);
create index geo_ip_locations_country_code_idx on public.geo_ip_locations (country_code);

create trigger set_geo_ip_locations_updated_at
before update on public.geo_ip_locations
for each row
execute function public.set_updated_at();

alter table public.geo_ip_locations enable row level security;

revoke all on public.geo_ip_locations from anon, authenticated;
grant all on public.geo_ip_locations to service_role;

create or replace function public.lookup_geo_location(p_client_ip text)
returns table (
  country_code char(2),
  region text,
  city text,
  timezone text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_client_ip inet;
begin
  begin
    v_client_ip := nullif(trim(p_client_ip), '')::inet;
  exception when others then
    return;
  end;

  return query
  select
    location.country_code,
    location.region,
    location.city,
    location.timezone
  from public.geo_ip_locations location
  where v_client_ip <<= location.network
  order by masklen(location.network) desc
  limit 1;
end;
$$;

revoke all on function public.lookup_geo_location(text) from public, anon, authenticated;
grant execute on function public.lookup_geo_location(text) to service_role;
