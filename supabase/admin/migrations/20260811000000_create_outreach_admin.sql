create table public.outreach_records (
  id uuid primary key default gen_random_uuid(),
  source_round text not null,
  source_row_number integer not null,
  payload_key_version integer not null,
  payload_nonce text not null,
  payload_ciphertext text not null,
  payload_auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_round, source_row_number)
);

create table public.outreach_audit_events (
  id uuid primary key default gen_random_uuid(),
  outreach_record_id uuid references public.outreach_records(id) on delete set null,
  actor_email_hash text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index outreach_records_source_round_idx on public.outreach_records (source_round);
create index outreach_audit_events_record_idx on public.outreach_audit_events (outreach_record_id);
create index outreach_audit_events_created_at_idx on public.outreach_audit_events (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_outreach_records_updated_at
before update on public.outreach_records
for each row
execute function public.set_updated_at();

alter table public.outreach_records enable row level security;
alter table public.outreach_audit_events enable row level security;

revoke all on public.outreach_records from anon, authenticated;
revoke all on public.outreach_audit_events from anon, authenticated;

grant all on public.outreach_records to service_role;
grant all on public.outreach_audit_events to service_role;
