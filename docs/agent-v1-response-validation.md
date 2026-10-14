# Agent API v1: typed transport and fail-closed response parsing

The dedicated client at src/lib/api/agents.ts sends only published create,
update and list fields. It does not accept organization or actor selectors;
the backend derives these exclusively from an authenticated session.

src/lib/api/agent-response.ts validates public Agent projection fields, ID
formats, status, version, string bounds, timestamps, page size, cursor, and
envelope metadata at runtime. It discards unexpected response properties.
Incompatible responses fail closed with API_CONTRACT_MISMATCH and a safe
correlation ID. Frontend validation is not a replacement for backend RBAC,
ABAC, tenant-scoped persistence or trusted-origin enforcement.

The POST /api/v1/agents Idempotency-Key is generated once for the intended
creation and reused only for identical retries. Actor-scoped replay is
implemented in backend PR #68, with migration 014. No API v1 payload shape
changes are needed.

## Release gates

This adapter adds no enabled Agent UI, fake data, or alternative persistence.
Do not enable an Agent workspace until backend PR #66, CI repair PR #67
and idempotency isolation PR #68 pass PostgreSQL-backed validation on the
integrated commit. Verify frontend npm run typecheck, npm test and npm run
build independently; run lint with a configured linter (the existing script
uses a legacy Next lint command and needs updating).
