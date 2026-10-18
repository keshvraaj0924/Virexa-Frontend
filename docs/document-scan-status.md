# Read-only document scan status

The document list renders the backend’s public `scanStatus` verbatim as a bounded set of labels:

- `awaiting_upload`: Awaiting upload confirmation
- `pending_scan`: Pending scan · private quarantine
- `clean`: Scan passed · private quarantine
- `rejected`: Scan rejected · private quarantine
- Missing or unknown state: Scan status unavailable · private quarantine

Worker leases, retries and exhausted errors are deliberately private. Their documents remain pending; the interface does not infer a queue position, progress percentage, retry action or completion promise. Refresh records retrieves the latest authorized list. No scan mutation endpoint is added.

Scanning is one security layer. Scan passed is not a safety guarantee, extracted data, approval, completed processing or an OCR/AI usage charge. Files stay in private quarantine; extraction, review, downloads and ERP delivery remain unavailable. Existing server-derived tenant scope, capability checks, cookie boundary and denied-route behavior are unchanged. No raw scanner findings are rendered.

An interrupted intake that already reached pending, clean or rejected returns the authoritative record without retransmitting bytes or creating another upload attempt.

## Verification scope

`playwright.scanning.config.ts` runs a real browser, Next proxy, FastAPI, PostgreSQL 16, private byte storage and the actual leased internal worker. Its Unix socket service is an explicitly synthetic ClamAV protocol fixture, not antivirus effectiveness proof. It covers pending → scan passed, pending → rejected, and scanner error → pending, refresh/reload, cross-tenant denials, absent download/extraction controls and mobile overflow. No SQL verdict seeding and no public mark-clean endpoint are used. Backend genuine-engine tests are separate evidence.

Screenshots contain only synthetic fixture names and synthetic account data. Ordinary integration suites retain their existing scope and run against the same immutable backend pin.
