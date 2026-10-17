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

- Login remains `{email,password}`; registration remains `{displayName,email,password,organizationName}`. Successful responses must set the real HttpOnly session cookie before navigation to `/app`.
- Production SSR requires a deployment topology that sends the session cookie to the frontend host. Prefer one public host with a reverse proxy routing `/api/v1` to the backend. A host-only cookie on an unrelated API hostname is not available to frontend SSR. The frontend still needs an absolute API URL for server requests; configure the same public origin plus `/api/v1`.
- The Python authentication foundation alone does not implement the full document, workflow, organization, audit and session-management API. Existing app views require their corresponding backend endpoints. An authentication-only candidate is not a production-ready app backend.
- Three.js is loaded only for the desktop decorative document sculpture, subject to reduced-motion/data-saving settings. CSS remains the fallback; WebGL failures do not block forms. Rendering pauses in hidden tabs and when offscreen, and GPU resources are disposed on unmount. GSAP continues to enhance the existing marketing hero; Framer Motion provides small button feedback.
- Do not merge or deploy without real backend login/register/logout/session testing, tenant isolation checks, and production cookie/origin configuration verification.

### Original product guide

The code-native orbital document character is Virexa-specific artwork, informed by the supplied visual direction without reusing the reference character. The guide is contextual, dismissible, keyboard accessible and reduced-motion aware. It provides built-in tips only; it does not represent a connected chat model, access documents, or execute agent actions. Decorative character motion stops after its short entrance.
