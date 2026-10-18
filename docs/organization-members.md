# Existing organization members and roles

This is an explicitly enabled Python candidate, not a replacement for the default Node organization hierarchy contract. Set `VIREXA_AUTH_CANDIDATE=1`, `VIREXA_TEAM_ADMINISTRATION=1`, `AUTH_API_ORIGIN` to the paired backend origin, and `NEXT_PUBLIC_API_URL=/api/v1` at build and runtime. The team integration workflow pins the exact reviewed backend commit and runs its migrations against isolated PostgreSQL 16. Use the repository's existing setup guide for infrastructure and verified signup.

## Implemented scope

`/app/users` presents a paginated roster for the signed-in organization. Server capabilities `organization:members:read` and `organization:members:manage` control access, independently of role labels. Administrators can review and change another existing member's permitted role; auditors can read only. Individual accounts show an explicit personal-workspace state and never request the roster. The client cannot select an organization ID.

Roles are `tenant_admin`, `organization_admin`, `manager`, `operator`, `viewer`, and `auditor`. Platform-role assignment and platform-admin targets are unavailable. Self-role changes are blocked. Last-administrator protection, organization scope and resource authorization are enforced by the backend. No invite, user creation, password reset, impersonation, removal, billing or hierarchy editing is implemented. The Python organization hierarchy endpoint exposes its actual organization root with empty branch/department/persona collections because those node tables do not exist there. Existing Node hierarchy behavior remains unchanged.

## Mutation safety

Opening a role review fetches current member detail. The user must select a different role and confirm its displayed access impact before submitting. Every write sends `expectedVersion`; repeated clicks are suppressed. Conflict, authorization failure, last-administrator denial and uncertain network results require closing and reopening current detail rather than automatic mutation retry. A submitted change may complete even if its response is lost or navigation occurs. Refresh the roster to establish its current state. Permissions refresh through the shared access provider; stale or late responses cannot reopen a dismissed review. Account identity scopes the component lifecycle.

The proxy allowlists only list/detail, role PATCH, and read-only hierarchy routes when enabled. It preserves Origin and bounded request bodies, strips tenant query hints, and never forwards invitation or account-creation paths. The audit reader recognizes `organization.member.role_updated` using the existing strict metadata allowlist.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- `npx playwright test --config playwright.team.config.ts` against the paired backend and isolated PostgreSQL 16, with the candidate flags enabled
- The checked-in workflow provisions the isolated database and exact backend, then runs real Chromium tests and uploads synthetic-only screenshots. No trace, cookie, password, customer email or customer document is retained as an artifact.
- Browser tests cover confirmed/cancelled/repeated changes, version conflicts, cross-organization denials, read-only auditor access, self/platform protection, current-session downgrade, pagination, outage recovery, individual workspace and desktop/mobile layout. PostgreSQL backend tests cover simultaneous changes and last-administrator protection.

All fixtures use `example.com` identities and test-only registration. They do not establish a customer invitation or email-delivery service. Publication is a draft review increment; no merge or deployment is authorized by these checks.
