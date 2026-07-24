drop function if exists public.match_rag_chunks(
  extensions.vector,
  integer,
  double precision,
  text[],
  text[]
);

alter table public.rag_sources
  add column if not exists origin text not null default 'first_party' check (
    origin in ('first_party', 'trusted_external')
  ),
  add column if not exists is_public boolean not null default true;

alter table public.rag_sources drop constraint if exists rag_sources_source_type_check;

update public.rag_sources
set source_type = 'local_document'
where source_type = 'portfolio_pdf';

alter table public.rag_sources add constraint rag_sources_source_type_check check (
  source_type in (
    'homepage',
    'about',
    'project',
    'partner',
    'careers',
    'working_with_us',
    'faq',
    'blog_post',
    'local_document',
    'external_page'
  )
);

update public.rag_sources
set origin = case when source_type = 'external_page' then 'trusted_external' else 'first_party' end;

update public.rag_sources
set source_key = case url
  when 'https://www.designrush.com/agency/profile/arg-software' then 'designrush'
  when 'https://www.goodfirms.co/company/arg-software' then 'goodfirms'
  when 'https://techbehemoths.com/company/arg-software' then 'techbehemoths'
  when 'https://www.linkedin.com/company/arg-software/' then 'linkedin'
  when 'https://github.com/marmelo/tech-companies-in-portugal/blob/master/README.md' then 'tech-companies-portugal'
  else source_key
end
where source_type = 'external_page';

delete from public.rag_sources where source_type = 'homepage' and source_key = 'homepage';

create function public.match_rag_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 6,
  similarity_threshold double precision default 0.72,
  source_types text[] default null,
  source_keys text[] default null,
  source_origins text[] default array['first_party']
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_type text,
  source_key text,
  title text,
  url text,
  path text,
  chunk_index integer,
  content text,
  similarity double precision,
  source_metadata jsonb,
  chunk_metadata jsonb
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    s.id as source_id,
    s.source_type,
    s.source_key,
    s.title,
    s.url,
    s.path,
    c.chunk_index,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity,
    s.metadata as source_metadata,
    c.metadata as chunk_metadata
  from public.rag_chunks c
  join public.rag_sources s on s.id = c.source_id
  where s.is_public
    and (source_types is null or s.source_type = any(source_types))
    and (source_keys is null or s.source_key = any(source_keys))
    and (source_origins is null or s.origin = any(source_origins))
    and 1 - (c.embedding operator(extensions.<=>) query_embedding) >= similarity_threshold
  order by c.embedding operator(extensions.<=>) query_embedding
  limit greatest(match_count, 0);
$$;

revoke execute on function public.match_rag_chunks(
  extensions.vector,
  integer,
  double precision,
  text[],
  text[],
  text[]
) from public, anon, authenticated;

grant execute on function public.match_rag_chunks(
  extensions.vector,
  integer,
  double precision,
  text[],
  text[],
  text[]
) to service_role;
