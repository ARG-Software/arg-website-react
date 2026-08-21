create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  public_conversation_id text not null unique,
  payload_key_version integer not null,
  payload_nonce text not null,
  payload_ciphertext text not null,
  payload_auth_tag text not null,
  message_count integer not null default 0,
  page_path text,
  language text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assistant_conversations_updated_at_idx on public.assistant_conversations (updated_at desc);
create index assistant_conversations_last_message_at_idx on public.assistant_conversations (last_message_at desc);
create index assistant_conversations_page_path_idx on public.assistant_conversations (page_path);

create trigger set_assistant_conversations_updated_at
before update on public.assistant_conversations
for each row
execute function public.set_updated_at();

alter table public.assistant_conversations enable row level security;

revoke all on public.assistant_conversations from anon, authenticated;

grant all on public.assistant_conversations to service_role;
