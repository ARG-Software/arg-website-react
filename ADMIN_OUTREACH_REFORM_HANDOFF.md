# Admin Outreach Reform Handoff

## Context

The admin outreach backoffice currently stores outreach records in `public.outreach_records` as a fully encrypted JSON payload plus Excel source metadata:

- `source_round`
- `source_row_number`
- `payload_key_version`
- `payload_nonce`
- `payload_ciphertext`
- `payload_auth_tag`

The importer reads `external/arg-outreach (1).xlsx` via `scripts/import-outreach.js`, includes the Excel sheet/tab name as `source_round`, and maps statuses to several values: `draft`, `ready`, `sent`, `replied`, `follow_up_needed`, `closed`, `not_relevant`.

Dry-run result from the existing workbook:

- Total parsed rows: `491`
- `sent`: `187`
- `replied`: `1`
- `ready`: `303`

Under the new model, that naturally becomes:

- `sent`: `188` records, counting old `sent` and old `replied`
- `not_sent`: `303` records
- replies represented separately by a boolean/metric field, not by `status`

## Agreed Decisions

### Status Model

Only two statuses should exist:

- `sent`
- `not_sent`

Old statuses should be migrated/imported as follows:

- `sent` -> `sent`
- `replied` -> `sent` plus `reply_obtained = true`
- `draft`, `ready`, `follow_up_needed`, `closed`, `not_relevant`, and unknown non-sent statuses -> `not_sent`

### Removed Data

Do not keep useless Excel origin metadata:

- Remove `source_round`
- Remove `source_row_number`
- Do not persist Excel sheet/tab name

Do not store contact name:

- Remove `contact_name`

### Contact Method

Only two contact methods should be allowed:

- `email`
- `contact_form`

Normalize importer/UI values to those lowercase values.

### Protected Fields

The valuable/protected data is:

- company name
- contact email

These should remain encrypted at rest.

Do not store plaintext company name or contact email solely to support search/sort unless the privacy requirement changes.

### Blind Indexes

Use blind indexes for uniqueness and exact lookup/search.

Store encrypted values plus HMAC-based blind indexes:

- `company_name_ciphertext`
- `company_name_nonce`
- `company_name_auth_tag`
- `company_name_key_version`
- `company_name_blind_index`
- `contact_email_ciphertext`
- `contact_email_nonce`
- `contact_email_auth_tag`
- `contact_email_key_version`
- `contact_email_blind_index`

Create unique indexes on:

- `company_name_blind_index`
- `contact_email_blind_index`

Blind indexes must be computed from canonical normalized values.

Suggested normalization:

```js
function normalizeCompanyName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}
```

Suggested flow:

```txt
normalized value -> HMAC(secret) -> blind index
trimmed display value -> encrypt -> ciphertext
```

This means values like `ARG Software`, `arg software`, and `  Arg   Software  ` produce the same blind index and trigger uniqueness conflicts.

### Sorting Name/Email

Because company name and email remain encrypted, the database cannot safely sort alphabetically by those fields.

Chosen approach:

```txt
DB rows -> backend decrypts matching rows -> backend sorts all matching rows -> backend paginates -> UI receives requested page
```

This keeps company name/email protected in the database. It is acceptable for the current dataset size of about 491 rows.

Do not paginate before sorting by encrypted fields. For name/email sorting, pagination must happen after backend decryption and sorting.

For non-protected fields, DB-level sorting/indexes are fine:

- `created_at`
- `updated_at`
- `date_sent`
- `status`
- `contact_method`

### Sent Dates

All sent records should have `date_sent`.

If an imported sent record has no sent date, assign a made-up fallback date around one month ago. Prefer a deterministic fallback during import/reingestion so repeat imports are stable.

### Dashboard Pie Chart

Add a Recharts pie chart side by side with the existing line chart.

Chosen pie chart meaning:

- `Replies obtained`
- `Sent without reply`

This should be based on sent records and the new reply flag/metric.

### Login Security

The current admin login calls Supabase Auth directly from the browser in `src/frontend/admin/AdminPage.jsx`.

Need to change this so login attempts can be rate-limited and CAPTCHA-protected:

- Add a backend admin login endpoint, likely `/api/admin/login`
- Frontend sends email, password, and ALTCHA proof to this endpoint
- Backend verifies ALTCHA and rate limits before calling Supabase Auth
- Backend returns the session to the frontend on success

The admin should also log out after 1 hour of inactivity:

- Track user interaction in `AdminPage.jsx`
- Reset a 1-hour timer on interaction
- On timeout, call Supabase `signOut()`, clear admin state/query cache, and require login again

Also consider setting the Supabase Auth JWT expiry to `3600` seconds in project settings. The client timer removes the local session, but Supabase Auth settings control token lifetime.

## Existing ALTCHA Implementation

ALTCHA is currently implemented under the Gaspar/RAG backend and frontend shared-ish form components.

Relevant files:

- `src/backend/rag/infrastructure/security/altcha.ts`
- `src/backend/rag/apps/gaspar/securityChallengeApi.js`
- `src/backend/rag/apps/gaspar/securityVerifyApi.js`
- `src/backend/rag/apps/gaspar/assistantChallengeApi.js`
- `src/frontend/components/forms/AltchaVerification.jsx`
- `src/frontend/services/apiService.js`
- `src/frontend/services/altchaService.js`
- `src/frontend/workers/altchaPbkdf2Worker.js`

Clickable CAPTCHA widget already exists:

```jsx
<altcha-widget
  auto="off"
  challenge={SECURITY_CHALLENGE_ENDPOINT}
  name="altcha"
  type="checkbox"
  workers="2"
></altcha-widget>
```

This is suitable for admin login with a configurable challenge endpoint.

## Shared Security Refactor

Avoid making admin call/import Gaspar internals.

Recommended refactor:

- Move/re-export ALTCHA helpers into `src/backend/shared/security/altcha.ts`
- Move generic rate-limit logic into `src/backend/shared/security/rateLimit.ts`
- Move Supabase/in-memory rate-limit stores into `src/backend/shared/security/rateLimitStores.ts`
- Update Gaspar imports to use shared modules
- Add admin-specific config/dependency wiring for rate limiting against the admin Supabase DB

There is already a backend shared folder:

- `src/backend/shared/api/http.js`

Existing rate limit files to reuse/refactor:

- `src/backend/rag/infrastructure/security/rateLimit.ts`
- `src/backend/rag/infrastructure/security/rateLimitStores.ts`
- `supabase/rag/migrations/20260726000000_create_rag_rate_limits.sql`

Admin should get its own rate-limit table/function in admin migrations, rather than relying on the RAG DB.

## Existing Admin Files

Backend:

- `src/backend/admin/apps/adminOutreachApi.js`
- `src/backend/admin/apps/di/createAdminDependencies.js`
- `src/backend/admin/application/admin/authenticateAdmin.js`
- `src/backend/admin/application/admin/adminAccessPolicy.js`
- `src/backend/admin/application/outreach/listOutreachRecords.js`
- `src/backend/admin/application/outreach/updateOutreachRecord.js`
- `src/backend/admin/domain/outreachRecord.js`
- `src/backend/admin/infrastructure/config/adminConfig.js`
- `src/backend/admin/infrastructure/crypto/outreachPayloadCipher.js`
- `src/backend/admin/infrastructure/supabase/SupabaseOutreachRepository.js`
- `src/backend/admin/infrastructure/supabase/outreachRows.js`

Frontend:

- `src/frontend/admin/AdminPage.jsx`
- `src/frontend/admin/admin.css`
- `src/frontend/admin/outreachApi.js`
- `src/frontend/admin/outreach.js`
- `src/frontend/admin/supabaseClient.js`
- `src/frontend/admin/queryClient.js`

UI package:

- `src/packages/ui/src/admin/AdminMetricChart.jsx`
- `src/packages/ui/src/admin/AdminDataTable.jsx`
- `src/packages/ui/src/admin/AdminRecordOverlay.jsx`
- `src/packages/ui/src/styles.css`

Migrations:

- `supabase/admin/migrations/20260811000000_create_outreach_admin.sql`
- `supabase/admin/migrations/20260819000000_create_admin_users.sql`

Netlify function:

- `netlify/functions/admin-outreach.js`

Scripts:

- `scripts/import-outreach.js`

Tests:

- `src/backend/admin/tests/api/adminOutreachApi.test.js`
- `src/backend/admin/tests/application/adminAccessPolicy.test.js`
- `src/backend/admin/tests/infrastructure/outreachPayloadCipher.test.js`
- `src/backend/rag/tests/infrastructure/altcha.test.ts`
- `src/backend/rag/tests/infrastructure/rateLimit.test.ts`

## Suggested Database Shape

Exact column naming can be adjusted, but this is the intended shape.

```sql
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
  email_subject text,
  email_body text,
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
create index outreach_records_date_sent_idx on public.outreach_records (date_sent desc);
create index outreach_records_status_date_sent_idx on public.outreach_records (status, date_sent desc);
```

## Import/Export Requirements

### CSV Export

Add an admin UI option and backend action to export all records as CSV.

The backend should decrypt protected fields before generating CSV.

Suggested endpoint shape:

- `GET /api/admin/outreach?scope=export&format=csv`

Or separate endpoint/action if cleaner.

### CSV Import

Add admin UI option and backend action to import CSV records.

Rules:

- Max `30` rows per import request, enforced server-side
- Validate status/contact method
- Normalize and blind-index company/email
- Reject duplicates via blind-index unique constraints
- Return row-level errors where practical

Suggested endpoint shape:

- `POST /api/admin/outreach/import`

Or a POST action on the existing endpoint if cleaner.

## API/UI Sorting

For UI table sorting:

- `created_at`, `updated_at`, `date_sent`, `status`: sort in DB
- `company_name`, `contact_email`: backend decrypts all matching records, sorts in memory, then paginates

Suggested query params:

- `page`
- `pageSize`
- `sortBy`
- `sortDirection`
- `status`
- `search`

Exact search with encrypted fields can use blind indexes only when the user enters a full normalized company/email. Partial search by protected fields requires decrypt-and-filter in backend memory, unless a less-private searchable token strategy is introduced later.

## Implementation Steps

1. Add shared backend security modules for ALTCHA and rate limiting.
2. Update Gaspar to import security utilities from shared modules.
3. Add admin DB migration for new outreach schema and admin rate-limit table/function.
4. Replace full-payload cipher with field-level encryption plus blind-index helpers for company/email.
5. Update `SupabaseOutreachRepository` and row mapping to read/write the new schema.
6. Update `listOutreachRecords` for new statuses, summary, chart, encrypted-field sorting, and pagination rules.
7. Update `updateOutreachRecord` validation and recompute encrypted fields/blind indexes on edits.
8. Add CSV export and max-30-row CSV import backend actions.
9. Update `scripts/import-outreach.js` to reingest Excel into the new format without sheet/source metadata.
10. Add admin login endpoint with ALTCHA verification and login-attempt rate limiting.
11. Update `AdminPage.jsx` login form to use clickable ALTCHA and backend login endpoint.
12. Add 1-hour inactivity logout in `AdminPage.jsx`.
13. Update admin UI fields, status labels, contact method select, sortable table headers, CSV controls, and pie chart.
14. Update tests for schema mapping, blind indexes, status validation, import/export, chart summary, rate limits, and login CAPTCHA behavior.

## Verification Commands

Use these after implementation:

```bash
npm run test:backend
npm run lint:all
npm run build
```

The project has no broad frontend test suite configured, so manual admin UI verification is also needed.
