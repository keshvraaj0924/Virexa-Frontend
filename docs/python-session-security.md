# Python session security candidate

Stacked on frontend private intake PR #45. This uses the existing Security page;
it does not add MFA, password changes, account locking, or new visual design.

Enable only against backend session-controls PR #72 at immutable commit
`f68d4776cabf3cb76309f7a9c34febe437de1e50`:

- `VIREXA_AUTH_CANDIDATE=1`
- `VIREXA_SESSION_CONTROLS=1`
- `NEXT_PUBLIC_API_URL=/api/v1`
- `AUTH_API_ORIGIN` is the reviewed Python service origin
- The backend must allow the exact public browser Origin.

The capability defaults off. It exposes Security navigation and permits only
GET `/auth/sessions`, POST `/auth/sessions/revoke-others`, and DELETE
`/auth/sessions/{UUID}` in the existing same-host auth proxy. No other settings
or auth endpoint is newly allowed. Only limit/cursor inventory query keys are
forwarded; cookie and original Origin remain server-authoritative. Responses
are private/no-store, redirects are not followed, and cookie clearing is preserved.
Document, auth and unavailable-feature behavior remains unchanged.

The UI requests 20 sessions per page, appends accessible Load more results,
deduplicates IDs, and labels the displayed count and incomplete pagination.
Refresh restarts live inventory. Revoke others affects every active owner session
except the caller, including unloaded pages; the returned count is displayed.
Current revocation clears the server cookie and replaces the page with login.
Expired/revoked sessions also redirect on inventory or mutation authorization
failure. Same-tick repeated actions are guarded; transient errors allow retries.
Session metadata is limited to ID, creation/expiry and current marker. Tokens,
digests and device claims are neither displayed nor persisted by this feature.

## Tests

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- `npm run test:e2e` preserves the existing browser regression suite.
- `.github/workflows/real-sessions.yml` checks out exact frontend head and the
  immutable backend commit above, migrates isolated PostgreSQL 16, and runs
  `npx playwright test --config playwright.sessions.config.ts` in Chromium.
- Real auth and intake workflows also pin this exact backend head, proving
  combined backward compatibility while retaining their session-capability-off
  configurations and original assertions.

The real session suite uses two browser contexts for one synthetic account,
checks cross-user target denial, hostile/missing Origin, paging beyond 20 rows,
repeat clicks, all-pages revoke-others, targeted revoke, revoked-context redirect,
current revoke/cookie clearing, expired-session redirect, and desktop/mobile
screenshots. `e2e-sessions/seed.py` creates only synthetic unusable session digests
for pagination and expires synthetic test accounts. It runs solely against the
isolated CI database; no customer data or real credentials are used. Browser
traces, videos and cookie files are disabled. Only screenshots are uploaded.

No merge or deployment is implied. Existing production limitations (shared
rate limiting, deployment configuration, scanning/extraction and further
security review) remain open.
