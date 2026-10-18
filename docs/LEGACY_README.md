# Virexa Frontend

Enterprise operations platform frontend for Virexa.

## Architecture

- Next.js + TypeScript
- Route-based application shell
- Role-aware navigation and protected application routes
- Contract-first API client
- Centralized design tokens using the Virexa brand palette
- Production-oriented validation, error boundaries, and security defaults

## Brand

- Primary: `#418FDE`
- Surface: `#FFFFFF`
- Muted: `#6B7280`
- Ink: `#101C2C`
- Accent: `#3A3152`

## Development

The initial foundation is intentionally dependency-light. Subsequent slices will introduce the validated UI component system, authentication flow, API integration, and role-specific workspaces.


## Premium authentication and workspace increment

This increment continues draft PR #41 at `bf5aae9dccdf6a146f1bc74dddf863f60773e937`.
The login and registration pages now use its shared visual foundation with the existing `authApi` requests. The application shell shares role-aware navigation across implemented pages; future Analytics and Integrations links are intentionally absent until those routes exist.

### Run and verify

- `npm ci`
- `npm run dev` (port 3000)
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npx playwright install chromium` then `npm run test:e2e` (requires browser execution support; API failures are intercepted in UI-only tests)

Copy `.env.example` to `.env.local` and point `NEXT_PUBLIC_API_URL` at the real `/api/v1` API. No demo login, invented data, bearer tokens, or client-side session persistence are introduced.

### Integration and release boundaries

- Legacy Node login retains `{email,password}`. The verified Python candidate adds `accountType` to login and replaces registration with `/auth/signup/start`, `/verify`, and `/complete`. Unsupported legacy registration is explicitly unavailable. Successful account completion must set the real HttpOnly session cookie before navigation to `/app`.
- Production SSR requires a deployment topology that sends the session cookie to the frontend host. Prefer one public host with a reverse proxy routing `/api/v1` to the backend. A host-only cookie on an unrelated API hostname is not available to frontend SSR. The frontend still needs an absolute API URL for server requests; configure the same public origin plus `/api/v1`.
- The Python authentication foundation alone does not implement the full document, workflow, organization, audit and session-management API. Existing app views require their corresponding backend endpoints. An authentication-only candidate is not a production-ready app backend.
- Three.js is loaded only for the desktop decorative document sculpture, subject to reduced-motion/data-saving settings. CSS remains the fallback; WebGL failures do not block forms. Rendering pauses in hidden tabs and when offscreen, and GPU resources are disposed on unmount. GSAP continues to enhance the existing marketing hero; Framer Motion provides small button feedback.
- Do not merge or deploy without real backend login/register/logout/session testing, tenant isolation checks, and production cookie/origin configuration verification.

### Original product guide

The code-native orbital document character is Virexa-specific artwork, informed by the supplied visual direction without reusing the reference character. The guide is contextual, dismissible, keyboard accessible and reduced-motion aware. It provides built-in tips only; it does not represent a connected chat model, access documents, or execute agent actions. Decorative character motion stops after its short entrance.

### Real FastAPI authentication preview

An explicit opt-in [integration preview](docs/real-auth-integration.md) now connects the browser and server-rendered session checks to the pinned Python candidate through a same-host route allowlist. It gates unported workspace features while preserving the existing default Node backend configuration. See that guide for isolated PostgreSQL setup, exact commit pins, browser verification and release limitations.

### Effective access and workspace surfaces

The Python candidate now uses `GET /api/v1/me/permissions` for typed, implemented capabilities. Candidate navigation and intake/session controls do not derive permissions from a role label. Missing or malformed capability responses fail closed, and permissions refresh on navigation, focus, visibility and authorization denials. A denial never automatically retries the failed mutation. The read-only `/app/access` page distinguishes capability availability from organization, ownership and resource-state checks, which remain enforced by the backend. The legacy Node path remains separate.

The workspace has a navy navigation rail, pale document surfaces, visible read-only/forbidden states, and responsive session cards. Landing and authentication styles are preserved. No sample metrics, live AI, scanning or workflow controls have been added. CI screenshot datasets use synthetic accounts and documents only; they are not production activity.

`e2e-sessions/access.spec.ts` verifies a role downgrade after page load against the real Python/PostgreSQL backend, rejects the stale write, verifies viewer/auditor/operator capabilities, and checks permission-outage recovery. Existing real authentication, quarantine intake and session controls suites remain intact.

### Usage and organization entitlements

The optional `/app/usage` view now separates personal usage from capability-gated
current-organization analytics. It shows independently instrumented meters, bounded
operation history and read-only preview entitlement state. AI tokens/OCR/workflow
metrics remain unavailable until genuinely instrumented; payment setup is not enabled.
See [usage integration and verification](docs/usage-entitlements.md).

### Verified individual and organization signup candidate

Enable `VIREXA_AUTH_CANDIDATE=1`, `AUTH_API_ORIGIN=http://127.0.0.1:4000`, and `NEXT_PUBLIC_API_URL=/api/v1` at build and runtime for the reviewed Python backend. UI-only browser checks also build with this candidate flag; real integration checks require the pinned backend and test-only SMTP configuration described below.

Registration and login now give Individual and Organization accounts equal prominence and use a generic Email field. Registration verifies an emailed code before asking for a password or creating a session. Account-kind labels in the app come from the server. Each email currently belongs to one isolated workspace. See [verified signup](docs/verified-signup.md) for contracts, delivery limitations, and the real PostgreSQL/loopback SMTP browser checks. No real email provider, merge, or deployment is configured by this change.

### Tenant audit events (Python candidate, explicit opt-in)

Set `VIREXA_AUTH_CANDIDATE=1` and `VIREXA_AUDIT_EVENTS=1` against the paired audit backend to enable `/app/audit`. The default Node audit contract remains separate. Navigation and page access use the server's `audit:read` capability; roles and tenant IDs are never inferred or entered by the user. Admins and auditors can read their current tenant only, including an authorized individual workspace owner.

The read-only proxy permits only `GET /audit/events` and forwards `limit`, `cursor`, `action`, and `outcome`. The UI requests 50 events per page, validates the versioned forward-only coverage envelope and public record fields, and never renders arbitrary metadata or document payloads. No export/download, write endpoint, cross-tenant selector, retention guarantee, immutability claim, or compliance certification is offered. Earlier history, anonymous failed authentication, extraction/model jobs and email delivery are outside recorded coverage; database-outage error events are best effort.

Audit integration runs use isolated PostgreSQL 16 and synthetic accounts/files. Real login, file intake and session-revocation events establish the actual path; an explicitly synthetic database fixture exercises long pagination. Tests cover tenant separation, cursor isolation, admin/auditor access, revoked access, unavailable/empty results, desktop/mobile views, filters and recovery. The separate verified-signup suite continues to use loopback SMTP capture only; it does not prove real customer email delivery. Nothing here merges or deploys the candidate.

### Workflow definition and status records

Set `VIREXA_WORKFLOW_RECORDS=1` alongside the Python candidate flag only against the paired workflow backend. `/app/workflows` uses authoritative `workflow:read`, `workflow:create` and `workflow:manage` capabilities. Both individual and organization workspaces use their server session scope; the UI has no tenant selector. The default Node workflow view and wire contract remain separate.

The view lists, creates, reads and version-updates names, descriptions and lifecycle status. It does not configure steps, execute actions, connect integrations, call AI, or report fabricated costs. Active means a saved status only. Archive retains the record; there is no delete endpoint. Operators can edit their own records, while authorized managers can edit tenant records. All writes remain subject to server policy.

Uncertain create retries retain the exact payload and idempotency key in the mounted page. Do not reload or navigate away to retry an uncertain creation: first check the list for the saved result. Navigation or unmount does not cancel a write already accepted by the server. The UI suppresses late responses after navigation, filter changes and permission changes. Version conflicts require reopening the latest record before saving again; writes are never retried automatically.

The workflow integration workflow uses an immutable backend pin and isolated PostgreSQL 16 plus Chromium. Synthetic-only tests exercise real persistence, duplicate prevention after a lost response, conflicts, status transitions, archive retention, cross-tenant reads/writes, role downgrade, pagination, outage recovery and desktop/mobile screenshots. Existing auth, signup, intake, session, usage and audit browser suites pin the same backend. No customer document fixture, live email provider or external integration is used. Publication remains a draft for review, without merge or deployment.

### Organization members and role administration

The optional `VIREXA_TEAM_ADMINISTRATION=1` Python candidate adds a real, capability-gated existing-member roster and version-checked role changes with explicit access-impact confirmation. Auditors have read-only access; individual accounts receive a personal-workspace state. Self-role changes, platform-role grants and cross-organization selection are unavailable. Invitations and account creation are not included. See [organization members](docs/organization-members.md) for the bounded API, safety behavior and PostgreSQL/Chromium verification. Default Node hierarchy behavior is preserved.

### Read-only scan results

Document intake displays the paired backend’s pending, scan-passed and rejected results. Scanning is one security layer; extraction and downloads remain unavailable. No scanner controls or bypasses are exposed. See [scan status](docs/document-scan-status.md) for the public-state contract and the real-worker browser test’s explicitly synthetic scanner fixture.
