Visit geolocation no longer reads a runtime `.mmdb` file from this directory.

Import GeoLite2/IP range data into `public.geo_ip_locations`; the admin backend resolves locations through the `lookup_geo_location` Supabase RPC and falls back to provider country headers.
