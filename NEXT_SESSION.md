# Next Session Handoff

## Current State

- UI components were moved into `packages/ui` and the app now imports shared UI styles through the `@ui` alias.
- Storybook is configured for the shared UI package.
- A private `/admin/` outreach app was added with Supabase Auth, encrypted outreach records, Netlify API endpoints, and an Excel import script.
- Local verification completed: `npm run lint:app`, `npm run lint:rag`, and `npm run build` pass.

## Missing / Continue Here

1. Configure deployment environment variables listed in `docs/outreach-admin.md`, especially Supabase keys, `OUTREACH_ADMIN_EMAILS`, encryption keys, and audit salt.
2. Apply `supabase/migrations/20260811000000_create_outreach_admin.sql` to the target Supabase project.
3. Create or confirm the Supabase Auth users for the allowed admin emails.
4. Run `npm run outreach:import:dry-run`, review normalized records, then run `npm run outreach:import` against the target database.
5. Manually test `/admin/` in a deployed or Netlify-compatible environment: login, list records, edit a draft, mark sent, verify encrypted database values, and verify audit rows are written.
6. Build and inspect Storybook with `npm run build:storybook`, then visually check moved components for regressions.
7. Add the future outreach key-rotation/re-encryption job before retiring old `OUTREACH_ENCRYPTION_KEY_V*` values.
8. Decide whether `/admin/` should also have additional edge protection, such as Netlify password protection or an IP allowlist, beyond Supabase Auth and server-side email checks.

## Notes

- The first combined `npm run lint` attempt timed out during `lint:app` after 120 seconds, but `lint:app` and `lint:rag` passed when run separately with longer timeouts.
- `npm run build` runs `lint:fix` before Vite and completed successfully.
