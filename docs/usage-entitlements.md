# Account and organization usage

Opt-in to the Python candidate with `VIREXA_AUTH_CANDIDATE=1` and
`VIREXA_USAGE_ANALYTICS=1`. Private uploads additionally need the existing
`VIREXA_DOCUMENT_INTAKE=1` and private storage setup. This slice adds no external
subscription, payment or AI provider account. The default Node path is unchanged.

## Read-only surfaces

`/app/usage` defaults to the signed-in user's usage. The organization button appears
only with authoritative `usage:organization:read` capability. Role names and URL
parameters cannot grant access. Losing that capability immediately unmounts tenant
results. No cross-tenant selector is exposed, including for platform administrators.
The effective-access page explains both new capabilities.

Six independent meters are shown: input, output and cached tokens, OCR pages,
document uploads and workflow runs. Only completed document uploads are instrumented
at present. Unknown/uninstrumented metrics and costs display unavailable, never zero.
Failed, released and reserved event counts are independent of completed quantities.
These are ledger statuses, not a complete log of HTTP errors or processing activity.
Document receipt is not evidence of scanning, OCR or an AI execution.

The subscription card presents server-provided internal preview entitlement state,
shared organization allowance, current UTC period/reset, and remaining usage. That
allowance is distinct from the personal totals and the selected reporting window.
There is no fabricated paid plan, guessed price, checkout, upgrade or payment success.
The separate Individual/Organization signup work can adapt workspace naming when
its authoritative contract becomes available; this slice does not infer workspace kind.

## Data and navigation safety

The same-origin proxy permits exactly four GET usage endpoints behind the feature
flag, drops tenant/role hints, and forwards `userId` only for tenant history. Upstream
redirects are rejected and responses are private/no-store. The backend remains the
authority for authenticated account, current tenant, resource scope and current role.
Malformed/mismatched responses fail closed. A network failure never creates totals.

Reporting windows are bounded to 7, 30 or 90 days. Each view uses fixed timezone-aware
start/end values; cursor history preserves those bounds and filters. Pagination
replaces each page rather than merging potentially repeated records. New scope,
filters, range or refresh reset paging. Aborted requests cannot replace newer results.
Organization groups are capped at 100 with a visible truncation note and user/operation/
status drilldown; quantities are not combined across meters. Dates display UTC.

## Verification

- Unit tests cover malformed data, unavailable metrics, read-only proxy scope, feature
  gating, stale responses, capability loss, outage/retry and group filters.
- `playwright.usage.config.ts` runs against FastAPI and PostgreSQL 16 in CI. Real
  document upload/complete requests verify exact-once retry metering and owner/member/
  outsider isolation. It also checks denial after role downgrade and error recovery.
- Only the pagination/error-history test seeds synthetic failed ledger events in the
  isolated CI database; rendered screenshots precede that seed. All screenshot accounts
  and documents are explicitly synthetic fixtures, not production activity.
- Existing auth, intake and session suites remain enabled and pinned to the same backend.
- Run lint, typecheck, unit tests, build and all relevant browser suites before release.

No merge or deployment is part of this change. Meter availability and commercial
subscription configuration remain explicit release boundaries.
