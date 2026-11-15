# Admin and maintenance backend

Read before editing `src/backend/admin/`, `src/backend/maintenance/`, `src/backend/shared/` or `netlify/functions/`. Moved from AGENTS.md.

## Admin Backend Boundaries
- Domain stays small and business-focused. It should own real business invariants only.
- Domain must not know about HTTP status codes, request/response shapes, Supabase rows, CSV parsing, encryption/decryption, hashing, cookies, or persistence details.
- Application owns use cases, error-to-status mapping, ports, and generic reusable mechanics.
- Repository ports live in `src/backend/admin/application/ports/repositories/`.
- User/session operations live in application use cases under `src/backend/admin/application/usecases/sessions/` and `src/backend/admin/application/usecases/users/`; controllers should only call those use cases and handle HTTP details.
- Identity provider ports use user naming, such as `IUserIdentityProvider`; keep `Admin` naming for admin routes/config only.
- Admin configuration should be exposed through an application-level interface, not by passing the concrete `AdminConfig` into infrastructure. Inject the configuration interface anywhere configuration is genuinely needed.
- Generic crypto helpers live in `src/backend/admin/application/crypto/` as simple functions such as `encode`, `decode`, and `encodeIndex`; do not duplicate cipher logic per repository or domain type.
- Admin HTTP endpoints should use controller-style apps under `src/backend/admin/apps/api/`.
- Netlify functions are deployment adapters only. Keep Netlify `config` objects and schedules in `netlify/functions/*`; API route behavior belongs in the backend API app.
- Scheduled maintenance behavior belongs in `src/backend/maintenance/apps/api/`; Netlify scheduled functions should only keep deployment schedules and call maintenance API runner exports.
- `src/backend/admin/apps/api/api.ts` is the executable admin API entrypoint. It exports grouped router handlers such as `routeAuthRequest`, `routeOutreachRequest`, `routeVisitRequest`, and `routeAssistantConversationRequest`.
- Admin controllers live under `src/backend/admin/apps/api/controllers/` and export their own route factories.
- Admin controller methods should declare method/path and error metadata with `@route(...)` and `@errorResponse(...)`. Controller methods should not dispatch internally on HTTP method, query `scope`, IDs, or payload `action` values.
- Admin controllers orchestrate HTTP only: read request body/query/cookies, call use cases, and return `Response`.
- Protected admin controller methods should call `this.authenticateUser(request)` before parsing body/query or calling business use cases. Keep authorization out of non-auth business use cases.
- Controllers must not talk to repositories, providers, Supabase clients, config, env, or dependency factories.
- Controllers may receive dependencies through constructors, but those dependencies should be real use cases or use-case services, not env/config/repository containers.
- Controller constructors should not default dependencies from `adminContainer` or `ragContainer`; route factories and API composition are the wiring boundary.
- DI is the composition root. It should resolve env/config internally, construct infrastructure adapters, construct use cases with explicit dependencies, and export a runtime container.
- Use cases should receive their dependencies directly through constructors, following a .NET-style dependency injection model. Avoid opaque dependency objects when explicit constructor dependencies make the use case clearer.
- Each controller method should call a use case. Reuse an existing use case when behavior is repeated; add a new use case when controller logic would otherwise reach into repositories/providers.
- Supabase client creation belongs in the DI composition root/container, not in a separate generic factory file, unless reuse outside the container proves necessary.
- Supabase adapter constructors should be consistent: receive the `SupabaseClient` first, then explicit adapter dependencies such as configuration interfaces or salts.
- App-level HTTP helpers, such as cookie and request-header extraction, live in `src/backend/admin/apps/http/` because they are API concerns.
- Admin route dispatch owns CORS, OPTIONS, 404, and 405 behavior. Controller error responses belong to `@errorResponse(...)`.
- Rate limiting belongs at the controller/API boundary for public write endpoints. Use cases should not receive client IPs or rate-limit dependencies.
- Controllers should depend on the shared `IRateLimiter` contract from `src/backend/shared/security/ratelimit.ts`, not free functions, repositories, stores, or Supabase clients.
- Production rate-limit persistence belongs in shared infrastructure repositories, currently `SupabaseRateLimitRepository` under `src/backend/shared/infrastructure/repositories/supabase/`.
- In-memory rate-limit repositories are test fakes only unless there is an explicit local/dev runtime requirement.
- Same-origin/origin checks and rate limits are complementary: origin checks reduce cross-site browser abuse, while rate limits protect public unauthenticated write endpoints from volume/script abuse.
- Infrastructure owns concrete adapters such as Supabase repositories, identity providers, geolocation providers, and CSV parser implementations.
- Supabase repositories should connect table columns to domain objects directly in the repository unless the conversion is reused. Avoid vague helper files that only rename simple row mapping.
- Keep table-specific conversion near the repository because DB columns and encrypted field envelopes are persistence details.
- One-time scripts should not drive architecture. Disable or update them when needed instead of preserving stale helper APIs for them.
- Centralized constants are useful when they define a stable contract, such as outreach CSV columns, but avoid deriving exported shapes implicitly from runtime object keys.

## Admin API Current State
- `src/backend/admin/apps/api/api.ts` is the only admin API router entrypoint. There is no separate `router.ts`.
- `api.ts` defines route groups and exports Netlify/local handlers: `routeAdminRequest`, `routeAuthRequest`, `routeUserRequest`, `routeOutreachRequest`, `routeVisitRequest`, and `routeAssistantConversationRequest`.
- `src/backend/admin/apps/api/controllerroute.handler.ts` dispatches registered controller routes and owns CORS, origin guard, OPTIONS, 404, and 405 behavior.
- Controllers live in `src/backend/admin/apps/api/controllers/` and keep route/error declarations beside methods using `@route(...)` and `@errorResponse(...)`.
- Keep `methoddecorator.ts`, `routeregistry.ts`, `route.ts`, and `error.response.ts`; they intentionally make controllers cleaner.
- Do not reintroduce `@cors`, `@options`, `allowMethods`, `BaseApi`, route files per controller, or `src/backend/admin/apps/api/router.ts` unless there is a concrete reason.
- `ControllerBase` is admin-specific and intentionally small: `authenticateUser(request)`, `json(...)`, `body(...)`, `query(...)`, `errorBody(...)`, and `errorStatus(...)`.
- Protected admin controller methods should authenticate first with `this.authenticateUser(request)`, then parse body/query, then call business use cases.
- Non-auth business use cases should not perform authorization. Auth/session use cases may still use `UserAccessPolicy` because authentication and session validation are their purpose.
- Public write endpoints are rate-limited at controller level: `POST /api/admin/login`, `POST /api/visit-log`, `POST /api/admin/assistant-conversation-log`, and `POST /api/assistant/ask`.
- `POST /api/admin/assistant-conversation-log` is public despite the `/api/admin/...` path; do not require an admin session for assistant conversation saves.
- `netlify/functions/admin.js` handles admin feature endpoints. Keep route-specific deployment adapters only when Netlify config needs to differ, such as `assistant-conversation-log.js`, `visit-log.js`, and scheduled maintenance functions.
- Recent verification passed: `npm run test:backend`, `npm run typecheck:backend`, `npm run lint:backend`, and `npm run test:netlify`.
