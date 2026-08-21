delete from public.outreach_records;

alter table public.outreach_records
  drop column if exists email_subject,
  drop column if exists email_body,
  add column if not exists email_subject_key_version integer,
  add column if not exists email_subject_nonce text,
  add column if not exists email_subject_ciphertext text,
  add column if not exists email_subject_auth_tag text,
  add column if not exists email_body_key_version integer,
  add column if not exists email_body_nonce text,
  add column if not exists email_body_ciphertext text,
  add column if not exists email_body_auth_tag text;
