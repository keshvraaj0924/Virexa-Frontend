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
