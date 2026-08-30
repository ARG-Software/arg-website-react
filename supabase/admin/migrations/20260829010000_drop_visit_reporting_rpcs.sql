drop function if exists public.aggregate_visit_metrics(text, timestamptz);
drop function if exists public.get_visit_breakdown(text, text, timestamptz);
drop function if exists public.get_visit_breakdown(text, text, integer, integer, timestamptz);
drop function if exists public.get_visit_breakdown(text, text, integer, integer, text, text, timestamptz);
drop function if exists public.get_visit_chart(text, text, timestamptz);
drop function if exists public.get_visit_stat(text, text, timestamptz);
drop function if exists public.get_visit_range_bounds(text, timestamptz);
drop function if exists public.get_visit_referrer_label(text, text, text, text);
drop function if exists public.get_visit_attribution_label(text, text, text, text);
