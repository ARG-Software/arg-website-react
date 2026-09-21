alter table public.assistant_conversations
  add column country_code char(2),
  add column region text,
  add column city text,
  add column timezone text;
