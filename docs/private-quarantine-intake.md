# Private quarantine browser intake candidate

This draft stacks on visual draft #44 without changing the agreed visual direction. It enables one narrow capability: authenticated PDF/PNG/JPEG metadata and real byte intake into the Python backend's private quarantine. It does not enable scanning, OCR, AI extraction, review, downloads, workflow execution or ERP delivery. No fake counters or generated results are shown.

## Opt in for isolated testing

Frontend configuration:

- VIREXA_AUTH_CANDIDATE=1
- VIREXA_DOCUMENT_INTAKE=1
- NEXT_PUBLIC_API_URL=/api/v1
- AUTH_API_ORIGIN=http://127.0.0.1:4000
- PUBLIC_API_ORIGIN=http://127.0.0.1:3000

The backend must use that same PUBLIC_API_ORIGIN in ALLOWED_ORIGINS, its isolated PostgreSQL database/migrations, and DOCUMENT_STORAGE_ROOT pointing to a dedicated private directory, mode 0700, outside public/static/repository paths. Production rollout is not authorized by this draft. Do not use real sensitive documents in the preview.

The integration workflow pins backend draft #71 at 73f1910c71e692d7946fb43fc4bb55eea1950b10. Its storage remains disabled by default. The original auth-only workflow remains unchanged to verify the default document gate.

## Boundary and transport

The same-host Next proxy forwards only exact document metadata/list/get, upload-initiate, content PUT and completion routes. It retains live cookies and original Origin; the backend independently checks session, role and tenant on every request. Trusted Origin is explicitly configured, never inferred from Host or forwarding headers. Arbitrary headers, paths, tenant selectors, query keys, redirect targets and downstream actions are not accepted.

Upload bytes stream through a 25 MiB cap and 60-second deadline. Small JSON requests have a 16 KiB cap and 10-second deadline. Disconnects cancel forwarding. Responses are capped at 1 MiB. The browser verifies a target has exactly the expected same-origin path and Content-Type-only header contract before transmitting any bytes. The backend verifies size, digest and simple MIME signature, stores immutable private bytes, and only returns pending_scan after completion. Signature checks are not malware scans or semantic validation.

## Interrupted and repeated flows

The UI prevents double-submit synchronously, preserves the document/attempt/idempotency key across retry, cancels in-flight work on navigation, and refreshes authoritative records after interruption. A lost completion response is recovered by GET pending_scan, without re-upload. Unfinished expired targets can be renewed with the original key. Cancel does not delete metadata or already accepted bytes. Metadata create has no backend idempotency contract: if its response is interrupted, automatic retry is blocked and the UI explains that a record may exist before the user chooses a new intake. Lists persist across reload and support opaque cursor pagination.

## Verification

Run npm run lint, npm run typecheck, npm test, npm run build. Ordinary frontend CI continues the existing browser regressions. Real intake CI provisions PostgreSQL 16 and the pinned FastAPI candidate, runs genuine browser requests without mocked responses, and exercises byte receipt, reload, unsupported types, double-submit, cancel/retry, lost completion response, tenant denial, missing/evil Origin, blocked downstream actions and logout. Only synthetic fixtures are used. Screenshots show desktop/mobile intake; traces, credentials and session cookies are never retained as artifacts.
