# Static Analyzer — Learnings

<!-- Updated after each Guardian run. Record false-positive patterns, CWE patterns specific to this codebase, files to always prioritise. -->

## Run: 2026-11-02 — Full SAST Scan

### Tools Available
- **gitleaks**: NOT installed — fallback to LLM pattern scan
- **semgrep**: NOT installed — fallback to LLM pattern scan

### Confirmed Real Findings (not false positives)
1. **No auth middleware on any route** — entire API is unauthenticated. CWE-306. High.
2. **overrideRoute not validated** — `POST /api/work-items/:id/route` accepts arbitrary string for `overrideRoute`; no enum check in the route handler. Any truthy string works; "fast-track" bypasses assessment pod. CWE-20. High.
3. **Intake webhook endpoints accept unvalidated enum values** — `/api/intake/zendesk` and `/api/intake/automated` do NOT validate `body.type` or `body.priority` against enum values. Medium.
4. **Internal error messages returned verbatim to clients** — workflow.ts catch blocks return `err.message` directly in 500 responses. CWE-209. Medium.
5. **No rate limiting** — no rate limiting middleware anywhere; intake webhooks especially exposed. CWE-770. Medium.
6. **No JSON body size limit** — `express.json()` called without `limit` option. CWE-770. Medium.
7. **Unvalidated pagination integers** — `page` and `limit` parsed via parseInt but never range-checked. CWE-20. Low.
8. **Unauthenticated /metrics endpoint** — Prometheus metrics exposed without auth. CWE-200. Low.
9. **No webhook signature validation** — `/api/intake/zendesk` accepts any POST with no HMAC check. CWE-345. Medium.

### Files to Always Prioritise
- `Source/Backend/src/routes/workflow.ts` — highest density of security issues
- `Source/Backend/src/routes/intake.ts` — webhook endpoints lack validation and auth
- `Source/Backend/src/app.ts` — no auth or rate-limit middleware configured

### False Positives / Known Safe Patterns
- `Source/Backend/src/utils/id.ts` uses `uuid v4` — cryptographically secure; not a false positive for weak random.
- `errorHandler.ts` logs `err.stack` server-side only — does NOT leak stack to clients. This is safe.
- `platform/` directory: intentionally NOT scanned per hard limits.
