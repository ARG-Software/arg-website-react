# Visit Analytics Handoff

## Current State

The first-party visit analytics implementation is present in the working tree but is **not committed**.

The previous commit `7c2b42d feat(admin): add first-party visit analytics` was intentionally uncommitted with `git reset --mixed HEAD~1` so the changed files can be reviewed.

The baseline commit still in history is:

```text
e415f05 refactor(admin): consolidate admin backoffice routes
```

## Goal

Add a GA4-like first-party analytics dashboard under `/admin/visits/` while keeping GA4 in parallel for comparison.

The feature records public-site visits only. Admin paths are skipped.

## Implemented Scope

- Public visit logging endpoint: `/api/visit-log`
- Authenticated admin metrics endpoint: `/api/admin/visit-metrics`
- Authenticated admin sessions endpoint: `/api/admin/visit-sessions`
- Authenticated admin journey endpoint: `/api/admin/visit-journey`
- 90-day retention function: `/api/admin/visit-events-retention`
- Client-side visitor session tracking inside the analytics service with a 30-minute inactivity timeout
- First-party page views are buffered in session memory with timestamps and flushed on window close/page hide using `navigator.sendBeacon` with `fetch(..., { keepalive: true })` fallback
- Admin dashboard route: `/admin/visits/`
- Visit metrics chart using the existing Recharts-based `AdminMetricChart`
- Country/city breakdown using the `geo_ip_locations` database table when populated
- Top referrers grouped by host, while retaining the full referrer URL per session/event
- Top pages table
- Recent visits table
- Visit journey overlay showing pages visited in sequence with computed dwell time
- Supabase migrations for `visit_sessions`, `record_visit_session`, and `aggregate_visit_metrics`

## Important Privacy Choices

- Raw IP addresses are **not persisted**.
- The IP is used only in-memory for rate limiting and country lookup.
- Client session IDs are hashed server-side via `VISIT_BLIND_INDEX_KEY` before persistence.
- The stored identifier is `session_hash`, truncated to 16 hex characters.
- Referrer fragments (`#...`) are stripped server-side.
- Full referrer URLs are stored to support source inspection, but chart aggregation groups by host.
- Admin paths (`/admin/*`) are excluded from visit logging.
- Visit data is purged after 90 days.

## New Files

```text
netlify/functions/assets/.gitkeep
netlify/functions/assets/README.md
netlify/functions/visit-events-retention.js
netlify/functions/visit-log.js
netlify/functions/admin.js
src/backend/admin/application/visits/listVisitJourney.ts
src/backend/admin/application/visits/listVisitMetrics.ts
src/backend/admin/application/visits/listVisitSessions.ts
src/backend/admin/apps/api/api.ts
src/backend/admin/domain/visitEvent.ts
src/backend/admin/application/crypto/visitSessionHasher.ts
src/backend/admin/infrastructure/supabase/SupabaseVisitRepository.ts
src/frontend/admin/apis/visitMetricsApi.js
src/frontend/services/analytics/
src/packages/ui/src/admin/AdminVisitJourney.jsx
supabase/admin/migrations/20260822010000_create_visit_sessions.sql
supabase/admin/migrations/20260822020000_create_visit_aggregate_rpc.sql
```

## Modified Files

```text
.env.example
netlify.toml
package-lock.json
package.json
public/_redirects
src/backend/admin/apps/di/createAdminContainer.ts
src/frontend/admin/AdminPage.jsx
src/frontend/admin/admin.css
src/frontend/main.jsx
src/frontend/providers/TransitionProvider.jsx
src/packages/ui/src/admin/AdminMetricChart.jsx
vite.config.js
```

## Key Backend Details

### Public Ingest

`src/backend/admin/apps/api/controllers/VisitsController.ts`

- Mirrors the existing public assistant-conversation logging endpoint pattern.
- Uses CORS origin guard.
- Allows `POST` and `OPTIONS`.
- Rate limits with the existing `hit_admin_rate_limit` RPC through `SupabaseRateLimitStore`.
- Rate limiting fails open so tracking never breaks browsing.
- Reads `x-nf-client-connection-ip` for rate limiting and database geolocation lookup only.
- Creates a hashed session id via `visitSessionHasher.hashSessionId(payload.sessionId)`.
- Resolves visit geo via `lookup_geo_location`, then `x-country` / `cf-ipcountry`, then `NULL` fields.
- Validates and normalizes the request in `createVisitSessionRecord`.
- Persists using `SupabaseVisitRepository.recordSession()`.

### Admin Metrics

`src/backend/admin/apps/api/controllers/VisitsController.ts`

Supported endpoints:

```text
GET /api/admin/visit-metrics?range=30d
GET /api/admin/visit-sessions?page=1&pageSize=10
GET /api/admin/visit-journey?sessionHash=<hash>
```

- Authenticates using the existing admin cookie/auth policy pattern.
- `range` supports `7d`, `30d`, and `2m`.
- Returns chart data, country breakdown, top pages, and top referrers from the SQL RPC.

### Retention

`src/backend/admin/apps/api/controllers/VisitsController.ts`

- Scheduled daily at `0 4 * * *`.
- Deletes `visit_sessions.last_seen_at < cutoff`.
- Retention window is 90 days.

## Database Migrations

### `20260822010000_create_visit_sessions.sql`

Creates:

- `public.visit_sessions`
- JSONB `events` and `page_views` session history fields
- City/country geo fields
- Indexes for common read paths
- RLS with service-role-only access
- `public.record_visit_session(...)` RPC

`record_visit_session` appends buffered events and page views into a single session row atomically.

Important schema columns:

```text
visit_sessions.session_hash
visit_sessions.country_code
visit_sessions.region
visit_sessions.city
visit_sessions.timezone
visit_sessions.entry_path
visit_sessions.referrer
visit_sessions.page_count
visit_sessions.event_count
visit_sessions.duration_ms
visit_sessions.page_views
visit_sessions.events
visit_sessions.started_at
visit_sessions.last_seen_at
```

### `20260822020000_create_visit_aggregate_rpc.sql`

Creates:

```text
public.aggregate_visit_metrics(p_range text, p_now timestamptz default now())
```

Returns JSON containing:

```js
{
  summary: { total, uniqueVisitors, today, countries },
  points: [{ label, visits, uniqueVisitors }],
  countryBreakdown: [{ label, value }],
  topPages: [{ id, path, visits, uniqueVisitors, lastSeenAt }],
  topReferrers: [{ label, value }]
}
```

## Key Frontend Details

### Capture

`src/frontend/services/analytics/`

- Replaces the previous utility-style analytics module.
- Keeps the existing analytics API (`trackEvent`, `trackPageView`, `trackCTA`, etc.).
- Selects a single provider from `VITE_ANALYTICS_PROVIDER`: `ga4`, `firstParty`, or `none`.
- The GA4 provider sends events immediately through `window.gtag`.
- The first-party provider buffers all events in memory and stores page-view history with active duration.
- Stores `arg.visitor.session` in `localStorage`.
- Uses `crypto.randomUUID()` when available.
- Rotates after 30 minutes of inactivity.
- Flushes buffered first-party events and page views to `/api/visit-log` on `pagehide` / `beforeunload`.
- Skips `/admin/*` paths.

`src/frontend/providers/TransitionProvider.jsx`

- Calls only `trackPageView()` in the route-change effect.
- First-party visit logging is handled inside `src/frontend/services/analytics/`.

### Admin Dashboard

Admin frontend

- `src/frontend/admin/AdminPage.jsx` is now a thin provider entry.
- `src/frontend/admin/AdminPage.jsx` owns the authenticated layout, section nav, profile menu, fragment rendering, and detail overlays.
- Main app routing mounts only `/admin/*`; admin subviews are rendered as fragments by `AdminPage.jsx`.
- Domain query hooks live under `src/frontend/admin/queries/{outreach,assistant,visits,auth}/`.
- Admin hooks live under `src/frontend/admin/hooks/{auth,shared}/`.
- `src/frontend/admin/pages/VisitsPage.jsx` adds:
  - stat tiles
  - `AdminMetricChart` for page views and visits
  - country pie
  - top referrers table
  - top pages table
  - recent visits table
  - journey overlay

`src/packages/ui/src/admin/AdminMetricChart.jsx`

- Was generalized to accept a `lines` prop.
- Existing outreach chart continues to work via default lines: `sent` and `repliesObtained`.
- Visit dashboard passes `visits` and `uniqueVisitors` lines.

`src/packages/ui/src/admin/AdminVisitJourney.jsx`

- Renders the ordered list of page views for a session.
- Displays sequence, title/path, timestamp, computed dwell time, and referrer.

## Environment Variables

Added to `.env.example`:

```text
VISIT_BLIND_INDEX_KEY=generate-a-random-hmac-secret
VISIT_LOG_RATE_LIMIT_PER_MINUTE=30
VISIT_LOG_RATE_LIMIT_PER_DAY=2000
VISIT_LOG_GLOBAL_RATE_LIMIT_PER_DAY=50000
VISIT_LOG_RATE_LIMIT_SALT=arg-visit-log-rate-limit
VITE_ANALYTICS_PROVIDER=ga4
```

## Geolocation Setup

Visit geolocation no longer reads a licensed `.mmdb` file at runtime.

Import GeoLite2/IP range data into:

```text
public.geo_ip_locations
```

The visit endpoint resolves IP metadata through:

```text
public.lookup_geo_location(p_client_ip text)
```

If no database range matches, the backend falls back to provider headers (`x-country`, `cf-ipcountry`) and then `NULL`.

## Verification Already Run

These passed after implementation:

```text
npm run lint
npm run build
npm run test:backend
```

Backend test result at the time:

```text
66/66 tests passed
```

`npm run build` output is large due to image optimization, but completed successfully.

## Known Follow-ups / Review Items

1. Review the SQL in `aggregate_visit_metrics`. It currently returns only days that have data. If the chart should show zero-value days, add a `generate_series` calendar CTE.
2. Review whether `uniqueVisitors` should be renamed to `visits` in API responses. Current meaning is distinct `session_hash`.
3. Add or document the GeoLite2/IP range import process for `geo_ip_locations`.
4. Push admin DB migrations before deploying:

   ```text
   npm run database:admin:push
   ```

5. Add production env vars in Netlify.
6. After deploy, compare first-party counts against GA4 for 1-2 weeks before removing GA4.
7. Consider adding dedicated backend tests for the new visit APIs. Existing backend test suite passes, but no visit-specific tests were added yet.

## Suggested Next Session Steps

1. Run `git status --short` to inspect the uncommitted files.
2. Review changed files, especially:

   ```text
   src/frontend/providers/TransitionProvider.jsx
   src/backend/admin/application/crypto/visitSessionHasher.ts
   supabase/admin/migrations/20260822010000_create_visit_sessions.sql
   supabase/admin/migrations/20260822020000_create_visit_aggregate_rpc.sql
   src/frontend/admin/AdminPage.jsx
   ```

3. If the implementation is accepted, commit it:

   ```text
   git add -A
   git commit -m "feat(admin): add first-party visit analytics"
   ```

4. Push the admin database migrations.
5. Add the MaxMind database file and production env vars.
6. Deploy and validate `/admin/visits/`.
