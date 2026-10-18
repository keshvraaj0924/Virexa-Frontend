# Real authentication integration candidate

This opt-in preview stacks on frontend PR #42, commit `e687a43fa17a24c5e10fe7270a07780675fdb856`, and uses backend PR #70, immutable commit `720c30a0db042ee61774f8b311d35cb7852d146a`. It does not cut over the default Node application, migrate customer data, merge or deploy either repository.

## Run locally with isolated PostgreSQL 16

Check out the pinned backend commit in a separate directory. Follow its `docs/python-auth-foundation.md` setup, provision a fresh empty PostgreSQL 16 database, install Python dependencies and run `python -m alembic upgrade head`. Start Uvicorn on `127.0.0.1:4000` with `ALLOWED_ORIGINS=http://127.0.0.1:3000`. Never point the Python candidate at a Fastify/customer database.

In the frontend, set these values for both build and server startup:

```
VIREXA_AUTH_CANDIDATE=1
AUTH_API_ORIGIN=http://127.0.0.1:4000
NEXT_PUBLIC_API_URL=/api/v1
```

Then `npm ci`, `npm run build`, `npx playwright install chromium`, and `npx playwright test --config playwright.auth.config.ts`. The test starts Next.js at `http://127.0.0.1:3000`. Use this exact origin, rather than localhost, to match trusted Origin checks. Feature gates use server route-layout redirects with relative destinations, preserving the browser hostname. Middleware redirects are intentionally avoided: Next can normalize loopback hosts to localhost and lose host-only cookies. The backend must already be running with a freshly migrated test database.

The same-host `/api/v1` proxy is an opt-in route allowlist for registration, login, session, logout, `/me`, and tenant-scoped organization reads. It preserves original Origin and host-only Set-Cookie, rejects redirects and large request bodies, drops client-supplied forwarding headers, and disables caching. Browser requests use relative `/api/v1`; server-rendered session checks use the server-only backend origin with incoming cookies. No bearer tokens, browser-stored sessions, mocks or manufactured application data are involved.

## Unsupported features are explicitly gated

Candidate mode shows only the authenticated overview and sign-out. It hides links to documents, workflows, users, audit and security/session-management pages, redirects direct nested workspace navigation to the overview, and rejects unsupported API routes. Existing default Node API selection stays unchanged when `VIREXA_AUTH_CANDIDATE` is unset: continue using the existing absolute `NEXT_PUBLIC_API_URL` for that runtime. Do not mix Python session cookies with Node route handlers against different schemas. SSR hardening also applies to default Node requests: a ten-second deadline, rejected redirects and sanitized fail-closed error handling.

## CI and evidence boundaries

`Real FastAPI browser integration` uses ordinary `pull_request`, read-only contents permission and no secrets. It checks out the exact frontend head and a hard-coded reviewed public backend commit, with Git credential persistence disabled in both checkouts. It creates a disposable PostgreSQL 16 service, runs real Alembic migrations, waits for real database readiness, builds the candidate, then exercises Chromium through the same-host proxy. It does not execute privileged `pull_request_target` code or checkout a user-selected backend ref.

The suite covers interrupted form navigation, navigation away during a held real login request (forwarded unchanged to FastAPI), repeated registration submit prevention, real registration, cookie/SSR refresh continuity, `/me`, both-direction cross-organization denial, unsupported route gating, hostile/missing Origin rejection, logout, revoked-cookie replay, rejected credentials and successful login after logout. It intentionally retains no traces, videos or network dumps that could contain passwords or session cookies.

Local unit checks cover proxy allowlisting, forwarding, missing Origin, body limits and redirect/network failure handling; they do not replace the real browser job. Existing UI-only screenshot tests remain a separate job and still intercept their own failure fixture.

## Release limitations

This preview is HTTP loopback development, not same-host production HTTPS verification. Secure cookies, TLS termination, production Origin allowlists and trusted-proxy/client-IP configuration need deployment-specific testing. The current backend limiter sees the proxy host and is process-local, so the preview is not a multi-user production topology. Full Python route parity, migration reconciliation, durable audit logging, session lifecycle controls and PostgreSQL RLS remain separate blockers documented in PR #70. The UI gate is an honest capability boundary, never an authorization boundary. Backend source is pinned, but Python dependencies still resolve from version ranges; a reviewed lock or constraints file and pinned infrastructure images remain necessary for fully reproducible dependency execution.
