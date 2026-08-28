drop trigger if exists set_geo_ip_locations_updated_at on public.geo_ip_locations;

drop function if exists public.lookup_geo_location(text);

drop table if exists public.geo_ip_locations;
