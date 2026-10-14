# Agent API v1: private response caching contract

Authenticated Agent responses may contain organization-specific business data and instructions. They must not be retained in browser or intermediary caches, including denied responses.

## Frontend transport

All requests through `apiRequest` in `src/lib/api/client.ts` use `credentials: 'include'` and `cache: 'no-store'`. These values intentionally override a caller's `RequestInit` options. The API path prefix remains `/api/v1`; response envelopes and error codes are unchanged.

## Backend release dependency

The Agent Fastify plugin must mark **all** responses `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, and `Expires: 0`. A plugin-level `onRequest` hook ensures successful and denied requests, including errors during JSON body parsing, are covered. The backend hook is tracked independently and **must be merged before the Agent feature is enabled**.

Tenant/organization scoping, creator-bound idempotency, RBAC/ABAC, CSRF origin validation, audit logging, and optimistic versioning are still required; cache flags are defense-in-depth only.

## Verification

Run `npm run typecheck`, `npm test` and `npm run build` on the exact frontend PR head. Validate the backend with PostgreSQL 16 migrations, all unit and integration suites, TypeScript, and production build before marking either feature ready. The frontend's current `next lint` script is incompatible with Next.js 15 and requires a separate ESLint setup; do not report lint as passing until corrected.
