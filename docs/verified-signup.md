# Individual and organization account creation

This candidate adds an explicit, equal-priority account-type choice to registration and login. Both accept a generic email address. Only organization registration asks for an organization name. Each email currently belongs to **one workspace**. There is no personal/team switcher, invitation flow, or user-supplied tenant identifier.

## Verified journey

1. Submit account type, name, email, and (for organizations) organization name to `POST /auth/signup/start`.
2. Paste the short-lived verification code from email into `POST /auth/signup/verify`.
3. Submit the returned setup proof and a unique 12–128 character password to `POST /auth/signup/complete`.
4. The server creates the isolated workspace/account and returns the normal HttpOnly cookie session. Password storage uses the backend's one-way Argon2 hash, not reversible encryption.

Codes and setup proofs stay only in the mounted flow. They are never stored in local/session storage, query strings, logs, or screenshots. Navigating away, browser page hiding, or reload discards the flow. Request locks prevent repeated submissions; stale responses do not navigate after unmount. Resends honor the server's cooldown and invalidate the prior code/proof. The UI exposes verification expiry and editable details for a clean restart.

A lost completion response is reconciled against the real cookie session. If it cannot be confirmed, the proof/password are cleared and the UI offers sign-in or a verification restart instead of replaying a consumed proof.

The start response uses enumeration-resistant wording. A delivery failure stays on the details form with an error; the client does not claim the message was sent. Verification does not create a session, and account completion requires the server proof.

## Identity and boundaries

The server's `user.accountType` controls Individual/Organization workspace labels and entitlement copy. Choosing Organization at login cannot grant organization access; mismatches are rejected by the backend. Permission checks and ownership/tenant scoping remain server-authoritative. Individual usage has its own workspace allowance and no organization-scope control. Organization allowances remain shared by the current organization.

Legacy `/auth/register` is disabled by default in the backend. Only isolated existing regression fixtures set both `ENVIRONMENT=test` and `ALLOW_LEGACY_REGISTRATION=true`; the verified browser suite explicitly checks that this route returns 410 with the override absent.

## Configuration

The verified account choices and registration require `VIREXA_AUTH_CANDIDATE=1`. The legacy Node path retains its existing email/password login payload. Its unsupported registration page explicitly reports that verified account creation is unavailable; there is no fallback to unverified registration.

## Delivery and production status

This is a tested candidate, not a production email rollout. Real email sending remains unavailable until an authorized delivery provider is configured and verified. Missing production delivery configuration produces an explicit service-unavailable state. Google/Microsoft sign-in, password reset, paid checkout, invitation/membership management, merge, and deployment are not introduced here.

## Verification

The `signup-integration.yml` workflow uses the exact frontend head and an immutable backend commit, PostgreSQL 16, and a loopback-only synthetic SMTP sink. It covers both account kinds, code-before-password/session, invalid code, real 60-second resend rotation, weak/expired flow recovery, duplicate requests, reload/back, unavailable delivery, disabled legacy bypass, account-type mismatch login, tenant isolation, and server-backed personal/team usage labels. No verification responses are mocked.

The existing authentication, document-intake, session/access, and usage integrations run against the same pinned backend. Existing legacy registration is enabled only where needed to seed older isolated regression cases. Unit/component tests separately cover failure, retry, pending navigation and clearing secrets. Browser visual checks include desktop organization signup and mobile individual usage.

For local testing, set `SIGNUP_CAPTURE_DIRECTORY` to a private temporary directory, `SIGNUP_EMAIL_DELIVERY=local_smtp`, `SIGNUP_SMTP_PORT` to the loopback sink port, and `ENVIRONMENT=test`. Start the pinned backend's `tools/synthetic_signup_smtp.py` with the port and private directory. Never use real email addresses; the sink accepts only reserved example domains. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only when a supported local browser is already installed. Captures are not test artifacts and must be deleted after tests.
