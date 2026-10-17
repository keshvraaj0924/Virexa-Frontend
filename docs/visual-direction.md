# Visual direction review

This draft is a focused design checkpoint for landing, authentication and a representative dashboard. It is stacked on the real FastAPI authentication candidate; it does not merge or deploy it.

- A locally served Geist variable font (SIL OFL in public/fonts) replaces the unbundled Inter declaration.
- Original deterministic vector silk is shared across the landing, auth frame and app canvas. No image download or GPU is needed for the wave. Existing optional Three.js document illustration respects reduced motion and mobile capability checks.
- Landing navigation exposes Sign in and Register at desktop and mobile widths.
- Compact, contained authentication forms retain the established field labels, validation, busy states, API payloads, error focus and navigation.
- Application overview displays actual signed-in account/organization/role. Candidate mode retains explicit capability restrictions and honest unavailable states. It does not invent operations totals, accuracy, time saved or customer claims.
- Review scope stops here pending visual approval; remaining routes retain their functional contracts.

## Evidence

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Frontend CI exercises public navigation and form regressions and produces landing/login/register screenshots. Real authentication CI runs the actual Next proxy, FastAPI and PostgreSQL 16 and produces workspace screenshots only; traces, passwords, cookies and tokens are not retained as artifacts.
