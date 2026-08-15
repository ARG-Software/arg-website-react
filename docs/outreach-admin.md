# Outreach Admin

The `/admin/` route is a private outreach management app deployed with the public website.

## Security Model

- Supabase Auth authenticates Jose and Rui in the browser.
- The browser sends the Supabase access token to `/api/admin/outreach`.
- Netlify Functions validate the token with `supabase.auth.getUser(token)`.
- The function checks `OUTREACH_ADMIN_EMAILS` server-side before reading data.
- Outreach records are encrypted in the function before writing to Supabase.
- Supabase stores encrypted payload columns, not plaintext outreach details.

## Required Env

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `DATABASE_SERVICE_ROLE_KEY`
- `OUTREACH_ADMIN_EMAILS`
- `OUTREACH_ENCRYPTION_KEY_ACTIVE_VERSION`
- `OUTREACH_ENCRYPTION_KEY_V1`
- `OUTREACH_AUDIT_SALT`

Generate a 32-byte base64 key with:

```bash
openssl rand -base64 32
```

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
