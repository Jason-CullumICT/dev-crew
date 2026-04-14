# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-04-14 — Initial Audit (OWASP-ASVS L2 + SOC2-Type2)

### Architecture Snapshot
- **Backend**: Node.js / Express, TypeScript, **in-memory store only** (no persistent DB).
- **Frontend**: React / Vite SPA — proxies `/api` to `localhost:3001` in dev.
- **Auth**: None whatsoever — all API endpoints are fully open.
- **Domain model**: WorkItem workflow engine — titles, descriptions, statuses, priorities. No PII fields (email, password, token, api_key, secret) present in the domain model.

### Consistently Failing Controls
1. **Authentication & Session Management** (OWASP-ASVS V2/V3, SOC2 CC6.1/CC6.2) — The entire auth layer is absent. Every endpoint is publicly accessible with zero authentication. This is the most severe gap.
2. **Access Control / RBAC** (OWASP-ASVS V4, SOC2 CC6.3) — No roles, no permissions, no deny-by-default. All operations are permitted to all callers.
3. **TLS/HTTPS Enforcement** (OWASP-ASVS V9.1) — App runs HTTP-only; no TLS config, no HSTS.
4. **Security Headers** (OWASP-ASVS V14.4) — No `helmet` or equivalent. Missing CSP, X-Frame-Options, HSTS, Referrer-Policy, X-Content-Type-Options.
5. **Rate Limiting / Anti-Automation** (OWASP-ASVS V2.2, SOC2 CC6.1) — No rate limiting on any endpoints. `/api/intake/*` webhook endpoints are fully open to abuse.
6. **Pagination Limit Cap** (OWASP-ASVS V4.2) — `limit` query param has no maximum; full dataset extraction in one call is possible.
7. **Required Audit Events** (SOC2 CC7.1) — `login_attempt` and `permission_denied` events are structurally impossible (no auth layer). `data_export` events are absent (no export endpoint exists).
8. **No CORS Policy** (OWASP-ASVS V14.5) — Express default, no explicit CORS configuration.
9. **Request Body Size Limits** (OWASP-ASVS V5.1) — `express.json()` used without a `limit` option.

### Controls That Are Architectural Non-Issues For This Domain
- **Sensitive field encryption** (email, password, token, secret, api_key) — These fields DO NOT exist in the WorkItem domain model. The audit `sensitive_fields` list from `security.config.yml` is N/A to the data model.
- **Stack traces in client responses** — The global `errorHandler` correctly returns `{ error: 'Internal server error' }` without exposing stack frames to clients. Route-level catches do expose `err.message`, which is a medium risk but not a critical data leakage.
- **Hardcoded secrets in source** — None found. All configuration is via env vars / process.env.

### Framework Mapping Notes
- SOC2 CC8.1 (Change Management) maps well to the change history service (`changeHistory.ts`) — this is a genuine partial pass.
- OWASP-ASVS L2 V7 (Logging) is partially met: structured JSON logging, no PII in logs, state transitions logged — but missing login_attempt and permission_denied events due to absent auth layer.
- GDPR Art. 17 (Right to Erasure): Only soft-delete is implemented. No hard-purge capability. However, since no PII is stored, practical GDPR risk is low. Flagged as medium.
- The in-memory store means ALL data protection at-rest controls (encryption, backups) are simply absent. Recommend flagging this as a systemic architectural risk separate from individual control failures.
