# Agent API v1 — idempotency and retries

The authenticated POST /api/v1/agents endpoint requires an Idempotency-Key header of 16–255 characters. Clients must generate a cryptographically random key once per intended creation and reuse it only to retry the same normalized request after a network failure.

The planned backend hardening scopes the key to the authenticated organization and creator. A first successful create returns 201, an identical retry by the same creator returns 200 with the same Agent, and an attempt to reuse the key with a different payload returns 409 IDEMPOTENCY_KEY_REUSED. Another authorized creator may independently use the same key without replaying another user's Agent.

No organization ID, tenant ID or creator ID belongs in the client payload. Rotate the key when editing the request after an uncertain outcome; never store keys in shared browser storage or log them. RBAC and ownership enforcement are always server-side.

This change is documentation-only. Do not expose the Agents workspace until the backend Agent API and creator isolation migration pass full database-backed CI, the frontend versioned response validator and client pass production checks, and the feature is explicitly enabled.
