drop table if exists public.outreach_records cascade;

create table public.outreach_records (
  id uuid primary key default gen_random_uuid(),

  company_name_key_version integer not null,
  company_name_nonce text not null,
  company_name_ciphertext text not null,
  company_name_auth_tag text not null,
  company_name_blind_index text not null,

  contact_email_key_version integer,
  contact_email_nonce text,
  contact_email_ciphertext text,
  contact_email_auth_tag text,
  contact_email_blind_index text,

  website text,
  contact_info text,
  contact_method text not null,
  fit_reason text,
  email_subject_key_version integer,
  email_subject_nonce text,
  email_subject_ciphertext text,
  email_subject_auth_tag text,
  email_body_key_version integer,
  email_body_nonce text,
  email_body_ciphertext text,
  email_body_auth_tag text,
  status text not null default 'not_sent',
  date_sent date,
  follow_up_date date,
  reply_obtained boolean not null default false,
  reply_summary text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint outreach_records_status_check check (status in ('sent', 'not_sent')),
  constraint outreach_records_contact_method_check check (contact_method in ('email', 'contact_form')),
  constraint outreach_records_sent_date_check check (status <> 'sent' or date_sent is not null)
);

create unique index outreach_records_company_name_blind_idx
  on public.outreach_records (company_name_blind_index);

create unique index outreach_records_contact_email_blind_idx
  on public.outreach_records (contact_email_blind_index)
  where contact_email_blind_index is not null;

create index outreach_records_status_idx on public.outreach_records (status);
create index outreach_records_created_at_idx on public.outreach_records (created_at desc);
create index outreach_records_updated_at_idx on public.outreach_records (updated_at desc);
create index outreach_records_date_sent_idx on public.outreach_records (date_sent desc);
create index outreach_records_contact_method_idx on public.outreach_records (contact_method);
create index outreach_records_status_date_sent_idx on public.outreach_records (status, date_sent desc);

create trigger set_outreach_records_updated_at
before update on public.outreach_records
for each row
execute function public.set_updated_at();

alter table public.outreach_records enable row level security;

revoke all on public.outreach_records from anon, authenticated;
grant all on public.outreach_records to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outreach_audit_events_outreach_record_id_fkey'
  ) then
    alter table public.outreach_audit_events
      add constraint outreach_audit_events_outreach_record_id_fkey
      foreign key (outreach_record_id)
      references public.outreach_records(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.admin_rate_limits (
  bucket text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 1
);

alter table public.admin_rate_limits enable row level security;

revoke all on public.admin_rate_limits from anon, authenticated;
grant all on public.admin_rate_limits to service_role;

create or replace function public.hit_admin_rate_limit(
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
  insert into admin_rate_limits as r (bucket, window_start, count)
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
    delete from admin_rate_limits
    where window_start < v_now - interval '2 days';
  end if;

  return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

revoke execute on function public.hit_admin_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.hit_admin_rate_limit(text, integer, integer)
  to service_role;
