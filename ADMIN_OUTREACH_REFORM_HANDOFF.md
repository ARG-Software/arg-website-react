# Admin Outreach Reform Handoff

## Latest Continuation Notes — 2026-08-21

The user updated local `.env` with fresh outreach secrets:

- `OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION=1`
- `OUTREACH_ENCRYPTION_KEY_V1=<new fresh V1 key>`
- `OUTREACH_BLIND_INDEX_KEY=<new dedicated blind-index key>`

Important decisions:

- Do not rotate to V2. The user wants a fresh key but wants to stay on active version `1`.
- Do not use `OUTREACH_AUDIT_SALT` as the blind-index fallback for the reset/reingestion path.
- The user wants a full outreach-data reset: delete all current outreach rows and reingest from the workbook using the fresh V1 encryption key and dedicated `OUTREACH_BLIND_INDEX_KEY`.
- Because the V1 key changed, old encrypted rows should be treated as disposable. Do not rely on decrypting old outreach rows after the env change.

Required sequencing for the next session:

1. Implement code/schema changes first.
2. Confirm `.env` contains `OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION=1`, `OUTREACH_ENCRYPTION_KEY_V1`, `OUTREACH_BLIND_INDEX_KEY`, `ADMIN_DATABASE_URL`, and `ADMIN_DATABASE_SERVICE_ROLE_KEY` before destructive DB work.
3. Apply the admin DB migration/reset.
4. Ask for explicit confirmation immediately before deleting outreach data.
5. Delete all `public.outreach_records` rows or recreate the table through migration/reset.
6. Run `npm run outreach:import:dry-run`.
7. Run `npm run outreach:import`.
8. Verify admin UI can decrypt/read the reingested records.

Pending requested implementation before reset/reingestion:

- Encrypt `email_subject` and `email_body` at rest. Suggested columns: `email_subject_key_version`, `email_subject_nonce`, `email_subject_ciphertext`, `email_subject_auth_tag`, `email_body_key_version`, `email_body_nonce`, `email_body_ciphertext`, `email_body_auth_tag`. No blind index is needed for subject/body.
- Update `src/backend/admin/application/crypto/outreachPayloadCipher.ts`, `src/backend/admin/infrastructure/supabase/outreachRows.ts`, `src/backend/admin/application/outreach/outreachCsv.ts`, `scripts/import-outreach.ts`, admin migrations, and backend tests for encrypted/decrypted subject/body.
- Preserve formatted email drafts during import. Do not use the generic `clean()` that collapses all whitespace for `Email Draft`. Keep paragraph breaks, convert literal `\n` and `/n` into real newlines, normalize CRLF to LF, trim line ends, and keep paragraph spacing readable. Keep email subjects single-line.
- Mailto formatting was already improved in the working tree: `src/frontend/admin/outreach.js` uses `encodeURIComponent()` instead of `URLSearchParams` so mail clients receive `%20` and `%0A`, not visible `+` characters.
- Sent-record locking was partially implemented in the working tree: contact email is disabled for `contact_form`, status is disabled for persisted sent records, and the backend rejects status changes away from `sent`.
- Still add frontend locks for `contact_method` and `date_sent` when the persisted record is sent.
- Still add backend rejection for changing `contact_method` and `date_sent` when the persisted record is sent, while allowing unchanged values through because full-form saves may include unchanged fields.
- Replace `window.confirm()` with a reusable UI package confirm dialog, likely `src/packages/ui/src/overlays/ConfirmDialog.jsx` plus Storybook story and index export. Use buttons `Don't mark as sent` and `Mark as sent`.

Recent working-tree admin UI/API changes already completed and committed in the follow-up commit:

- Added admin table filters: company search, `Date sent from`, and `Date sent to`.
- Removed visible labels from filters while keeping `aria-label`.
- Debounced company search.
- Backend filters by decrypted company name and date range.
- Sort indicators now show on sortable table columns.
- Added `UiDatePicker` primitive.
- Expanded Help card width.
- Moved status pill beside the record detail title through `AdminRecordOverlay` `titleAccessory`.
- Added send-email confirmation flow, currently using `window.confirm()` until the reusable UI dialog is added.
- Fixed mailto encoding/newline normalization.
- Added sent status lock backend tests.

Verification run for the recent working tree before handoff update:

- `npm run lint:app` passed.
- `npm run test:backend` passed.

## Current Session Status — 2026-08-21

The main reform work has been implemented in the working tree but not committed.

Completed:

- Added shared ALTCHA/rate-limit modules under `src/backend/shared/security/` with JS and TS entry points.
- Updated Gaspar/RAG security imports to use shared security modules instead of owning the implementation.
- Added admin login backend endpoint at `/api/admin/login` through `src/backend/admin/apps/api/api.ts` and `netlify/functions/admin-auth.js`.
- Added admin login ALTCHA verification and login-attempt rate limiting using an admin-specific Supabase RPC/table.
- Added admin 1-hour inactivity logout in `src/frontend/admin/AdminPage.jsx`.
- Added migration `supabase/admin/migrations/20260821000000_reform_outreach_records.sql`.
- Replaced full encrypted JSON payload with field-level encrypted `company_name` and `contact_email` plus blind indexes.
- Kept `contact_email_blind_index` and its unique index. The user clarified this should stay for uniqueness/exact lookup; only contact/email sorting should be removed.
- Removed persisted Excel source metadata and contact name from the app model/UI/import path.
- Reduced status model to `sent` and `not_sent`; old `replied` maps to `sent` plus `reply_obtained = true`.
- Restricted contact method to `email` and `contact_form`.
- Added dedicated CSV export/import backend actions; import enforces max 30 rows server-side.
- Updated `scripts/import-outreach.ts` to ingest the workbook into the new schema and skip duplicate normalized company/email rows.
- Added dashboard pie chart data/UI for `Replies obtained` vs `Sent without reply`.
- Updated backend tests for login, import/export, summaries, chart data, encrypted field sorting, and blind indexes.
- Added `OUTREACH_BLIND_INDEX_KEY` to `.env.example` and docs. Runtime currently falls back to `OUTREACH_AUDIT_SALT` if the dedicated key is not set, but a dedicated server-only key is preferred.

Database/ingestion already run in this session:

- `npm run database:admin:push` succeeded and applied `20260821000000_reform_outreach_records.sql`.
- First `npm run outreach:import` failed because `OUTREACH_BLIND_INDEX_KEY` was missing; fallback to `OUTREACH_AUDIT_SALT` was then added.
- Second `npm run outreach:import` succeeded: imported `489` outreach records and skipped `2` duplicate company/email rows.

Verification already run and passed:

- `npm run test:backend`
- `npm run rag:test`
- `npm run lint:all`
- `npm run build`

Important blind-index key note:

- The imported remote rows currently use whichever key the importer used at runtime. In this session that was the fallback `OUTREACH_AUDIT_SALT`, because `OUTREACH_BLIND_INDEX_KEY` was absent in `.env`.
- If `OUTREACH_BLIND_INDEX_KEY` is later set to a new dedicated value in Netlify/local env, the outreach table must be cleared/recreated and reingested with that same final key. Otherwise newly computed blind indexes will not match existing rows and logical duplicates can be created.
- `OUTREACH_BLIND_INDEX_KEY` is a server/function/importer env var only. Do not expose it as `VITE_*`.

Remaining user-requested follow-up work:

1. Move CSV import/export controls to a global location near the admin `Refresh` button, not inside only Sent/Not Sent tabs.
2. Add an `All emails` admin tab/route, likely `/admin/all/`, showing all outreach rows with no status filter.
3. Fix the broken empty/error layout shown in the screenshot: the error card currently stretches/deforms when data is missing. Improve `ErrorCard` spacing/padding and `AdminDataTable` empty-state stability.
4. Make the dashboard `Latest sent` table sortable too.
5. Allow table sorting by `company_name`, `date_sent`, and `follow_up_date`.
6. Remove contact/email ordering from the UI and backend allowed sort fields. Keep the contact email blind index and uniqueness constraint.
7. Add backend sorting support for `follow_up_date` in `src/backend/admin/application/outreach/listOutreachRecords.ts`.
8. Add an admin database keep-alive scheduled function, similar to Gaspar's current RAG keep-alive.
9. Move generic keep-alive logic from `src/backend/rag/application/maintenance/keepDatabaseAlive.ts` into a backend shared module, then make Gaspar and admin use that shared module.

Suggested follow-up implementation plan:

1. Update `AdminWorkspace` to own CSV import/export handlers and render them in `AdminNav` trailing area beside `Refresh` for all non-settings views.
2. Add `ADMIN_ROUTES.all`, `getAdminView()` handling for `/admin/all`, and a nav item labelled `All emails`.
3. Render `RecordsView` for `view === 'all'` with `query={{}}`, title `All emails`, and empty text `No outreach records found.`
4. Lift common table sort state logic into both `DashboardView` and `RecordsView`; for dashboard include `sortBy/sortDirection` in the recent-sent query key and fetch query.
5. Update `getRecordColumns()` so only `company_name`, `date_sent`, and `follow_up_date` are sortable. Remove `contact_email` sortable.
6. Update backend `SORTABLE_FIELDS` to remove `contact_email` and add `follow_up_date`; add date parsing in `getSortValue()`.
7. Improve `ErrorCard` and empty table CSS/classes in `src/frontend/admin/admin.css` and/or `src/packages/ui/src/styles.css`.
8. Create shared keep-alive module, for example `src/backend/shared/maintenance/keepDatabaseAlive.ts` and possibly `.js` if consumed by JS Netlify wrappers/tests.
9. Update `src/backend/rag/apps/gaspar/keepDatabaseAliveApi.js` to use the shared keep-alive with `tableName: 'rag_sources'`.
10. Add admin keep-alive dependencies in the admin DI container, an admin keep-alive app/function, and wiring tests/docs.
11. Re-run `npm run test:backend`, `npm run rag:test`, `npm run lint:all`, and `npm run build`.

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

- `src/backend/admin/apps/api/api.ts`
- `src/backend/admin/apps/di/createAdminContainer.ts`
- `src/backend/admin/application/admin/authenticateAdmin.ts`
- `src/backend/admin/application/admin/adminAccessPolicy.ts`
- `src/backend/admin/application/outreach/listOutreachRecords.ts`
- `src/backend/admin/application/outreach/updateOutreachRecord.ts`
- `src/backend/admin/domain/outreachRecord.ts`
- `src/backend/admin/infrastructure/config/adminConfig.ts`
- `src/backend/admin/application/crypto/outreachPayloadCipher.ts`
- `src/backend/admin/infrastructure/supabase/SupabaseOutreachRepository.ts`
- `src/backend/admin/infrastructure/supabase/outreachRows.ts`

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

- `scripts/import-outreach.ts`

Tests:

- `src/backend/admin/tests/api/adminOutreachApi.test.ts`
- `src/backend/admin/tests/application/adminAccessPolicy.test.ts`
- `src/backend/admin/tests/infrastructure/outreachPayloadCipher.test.ts`
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

- `GET /api/admin/outreach-export`

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

- `POST /api/admin/outreach-import`

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
