-- Releases published before the workflow set a title fell back to their tag; give each a short title.
update public.architect_releases
set name = 'Clearer compare and security findings', updated_at = now()
where tag_name = 'v1.1.1';

update public.architect_releases
set name = 'Settings sub-tabs', updated_at = now()
where tag_name = 'v1.1.2';

update public.architect_releases
set name = 'Notification badges and idle reset', updated_at = now()
where tag_name = 'v1.1.3';

update public.architect_releases
set name = 'Firefox add-on submission', updated_at = now()
where tag_name = 'v1.1.4';

update public.architect_releases
set name = 'AI Readiness details and Edge package', updated_at = now()
where tag_name = 'v1.1.5';

update public.architect_releases
set name = 'Automatic store submissions', updated_at = now()
where tag_name = 'v1.1.6';
