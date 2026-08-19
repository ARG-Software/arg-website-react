# Outreach Admin

The `/admin/` route is a private outreach management app deployed with the public website.

## Security Model

- Supabase Auth authenticates Jose and Rui in the browser.
- The browser sends the Supabase access token to `/api/admin/outreach`.
- Netlify Functions validate the token with `supabase.auth.getUser(token)`.
- The function checks `public.admin_users` server-side before reading data.
- Outreach records are encrypted in the function before writing to Supabase.
- Supabase stores encrypted payload columns, not plaintext outreach details.

## Required Env

- `VITE_ADMIN_DATABASE_URL`
- `VITE_ADMIN_DATABASE_ANON_KEY`
- `ADMIN_DATABASE_URL`
- `ADMIN_DATABASE_SERVICE_ROLE_KEY`
- `OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION`
- `OUTREACH_ENCRYPTION_KEY_V1`
- `OUTREACH_AUDIT_SALT`

Generate a 32-byte base64 key with:

```bash
openssl rand -base64 32
```

## Local Development

Run the admin app with the regular Vite dev server:

```bash
npm run dev
```

The `/api/admin/outreach` endpoint is served locally by `plugins/local-api-dev/`. The adapter loads `src/backend/admin/apps/adminOutreachApi.js` through Vite and calls the same backend API factory used by the Netlify production function, so local development does not require Netlify Dev or redirect rewrites.

Production remains backed by `netlify/functions/admin-outreach.js`.

## Admin Users

Supabase Auth stores the admin login email/password. The `public.admin_users` table controls
which authenticated users can access the admin API.

Apply the admin migrations before bootstrapping users. If applying migrations manually, run the
SQL files in `supabase/admin/migrations/` in filename order.

Optional CLI migration command:

```bash
npm run database:admin:push
```

The CLI command uses only `supabase/admin/migrations` and requires these environment variables:

- `ADMIN_DATABASE_PROJECT_REF`
- `ADMIN_DATABASE_ACCESS_TOKEN`

Create or update admin users with generated temporary passwords:

```bash
npm run admin:bootstrap -- jose@arg.software rui@arg.software
```

Or set `OUTREACH_ADMIN_BOOTSTRAP_EMAILS` and run without arguments:

```bash
OUTREACH_ADMIN_BOOTSTRAP_EMAILS=jose@arg.software,rui@arg.software npm run admin:bootstrap
```

The script prints one-time temporary passwords. Store them securely and change them after the
first login from `/admin/settings/`.

The first email receives `owner`; later emails receive `admin`. To revoke access, set
`public.admin_users.is_active = false` for that email.

## Import Excel Data

Preview the normalized import:

```bash
npm run outreach:import:dry-run
```

Import to Supabase:

```bash
npm run outreach:import
```

## Key Rotation

Use versioned env keys:

- `OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION=2`
- `OUTREACH_ENCRYPTION_KEY_V1=old-key`
- `OUTREACH_ENCRYPTION_KEY_V2=new-key`

New writes use the active version. Old rows keep decrypting while their old key remains configured.
After adding a re-encryption job, rewrite old rows to V2 and remove V1 only after verification.

## Planned Admin Upgrade

Implementation note: the admin app now uses these routes and API scopes. Outreach payload
fields remain encrypted in Supabase; status filtering, charting, and pagination happen inside
the authenticated backend response layer after decryption, so table views do not receive full
record sets in the browser.

### Goal

Expand `/admin/` from the current single outreach management screen into a small authenticated admin app.

### Confirmed Requirements

- Keep a login screen for unauthenticated users.
- After login, route users to an admin dashboard.
- Dashboard includes a chart comparing emails sent vs replies.
- Chart supports filters: all time, last 7 days, last 30 days, and monthly.
- Dashboard includes a table beneath the chart.
- Dashboard table lists the 30 latest sent emails.
- Dashboard table shows 10 records per page.
- Pagination must be backend-driven to reduce response size.
- Add a page listing all sent emails.
- Add a page listing all not-sent emails.
- Add a settings page for changing user name and password.
- Clicking a table row opens an edit overlay; do not navigate to a detail page.
- New reusable UI components must be developed in Storybook first.
- Storybook components should be presentational only, with no business logic.
- Admin business logic should stay under `src/frontend/admin/` or `src/frontend/pages/admin/`.
- Reuse existing UI primitives and ARG design tokens.

### Status Definitions

Sent emails are records where `status === 'sent'`.

Replies are records where `status === 'replied'`.

Not-sent emails are records where `status === 'draft' || status === 'ready'`.

Exclude these statuses from the Not Sent page:

- `sent`
- `replied`
- `follow_up_needed`
- `closed`
- `not_relevant`

### Target Routes

- `/admin/` - Dashboard
- `/admin/sent/` - All sent emails
- `/admin/not-sent/` - Draft and ready emails
- `/admin/settings/` - User profile/password settings

Unauthenticated users should still see the login screen.

### Backend Pagination

Extend `GET /api/admin/outreach` to support backend pagination and filtering.

Suggested query params:

```txt
page=1
pageSize=10
status=sent
statuses=draft,ready
scope=recent_sent
range=7d|30d|monthly|all
```

Suggested paginated response:

```json
{
  "records": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalRecords": 42,
    "totalPages": 5
  }
}
```

Dashboard should not fetch all outreach records. It should fetch summary counts, chart data, and the current latest-sent page.

Suggested dashboard requests through the same API:

```txt
GET /api/admin/outreach?scope=summary
GET /api/admin/outreach?scope=chart&range=30d
GET /api/admin/outreach?scope=recent_sent&page=1&pageSize=10
```

For `recent_sent`, cap results to the latest 30 sent records total.

Implemented non-table responses:

```json
{
  "summary": {
    "total": 120,
    "ready": 18,
    "sent": 42,
    "replied": 7,
    "notSent": 34
  }
}
```

```json
{
  "range": "30d",
  "points": [{ "label": "2026-08-14", "sent": 4, "replied": 1 }]
}
```

### Storybook Components To Add

Add presentational components in `src/packages/ui/src/` before wiring them into admin pages.

Recommended components:

- `AdminMetricChart`
- `AdminDataTable`
- `AdminRecordOverlay`
- Optional: `AdminNav` or `AdminPageTabs`

These components should use existing primitives where possible:

- `UiCard`
- `UiButton`
- `UiField`
- `UiSelect`
- `UiTextarea`
- `UiStat`
- `UiStatusPill`
- `Pagination`

Use existing design tokens:

```css
--arg-color-ink
--arg-color-white
--arg-color-lime
--arg-color-red
--arg-color-magenta
--arg-color-violet
--arg-color-surface
--arg-color-border
--arg-color-muted
--arg-color-muted-on-dark
--arg-gradient-primary
```

### Settings Page

Use Supabase Auth from the browser client.

Name update:

```js
supabase.auth.updateUser({
  data: { name },
});
```

Password update:

```js
supabase.auth.updateUser({
  password,
});
```

Add client-side password confirmation before calling Supabase.

### Edit Overlay

Reuse the existing outreach edit fields from `src/frontend/pages/admin/AdminPage.jsx`.

Keep current behaviors:

- `Send email` opens a `mailto:` URL.
- `Mark sent` sets `status: 'sent'`.
- Backend auto-fills `date_sent` when status becomes `sent` and no date exists.
- Save continues to call `POST /api/admin/outreach`.

### Suggested Implementation Order

1. Add backend pagination/filter/query support.
2. Add backend tests for pagination, sent filter, not-sent filter, recent sent cap, summary, and chart data.
3. Add Storybook presentational admin components.
4. Rework admin frontend into dashboard, sent, not-sent, and settings views.
5. Wire admin tables to backend pagination.
6. Move existing detail editing into the overlay flow.
7. Run verification.

### Verification

Run:

```bash
npm run test:backend
npm run lint:app
npm run lint:backend
npm run build:storybook
```

If backend API behavior changes, also manually verify:

- Login at `/admin/`.
- Dashboard loads without fetching all records.
- Chart filter changes data.
- Dashboard recent sent table paginates 10 at a time.
- Sent page paginates from backend.
- Not Sent page only shows `draft` and `ready`.
- Row click opens overlay.
- Save updates a record.
- Settings page updates name/password.
