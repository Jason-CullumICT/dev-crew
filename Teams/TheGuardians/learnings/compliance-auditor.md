# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-07-20 — Initial Audit (SOC2 Type 2, OWASP ASVS L2)

### Controls this project consistently fails

- **No authentication/authorization layer** — The backend Express app has zero auth middleware. All endpoints are public. This single gap causes cascading failures across OWASP ASVS V2/V3/V4 and SOC2 CC6.x.
- **No security HTTP headers** — No helmet or equivalent. Missing CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- **No CORS policy** — Express default permits all origins.
- **No rate limiting** — Entire API is unthrottled.
- **Required audit events not emitted** — `login_attempt`, `permission_denied`, `state_transition`, `data_export` are all absent from the logging layer.
- **Unauthenticated webhook intake** — `/api/intake/zendesk` and `/api/intake/automated` have no signature/token verification.
- **No session management** — No JWT, no session expiry, no revocation.
- **Prometheus /metrics endpoint is public** — Exposes operational telemetry to any caller.
- **Pagination has no upper bound** — `?limit=999999` is accepted.

### Controls that pass (or are architecturally N/A)

- **No hardcoded secrets** (OWASP ASVS V6.4 PASS): Only `process.env.PORT` used. No credentials in source.
- **No sensitive data in logs** (OWASP ASVS V7.2 PASS): The `sensitive_fields` in config (email, password, token, secret, api_key) do not appear in the data model at all — the WorkItem entity holds only operational workflow data. This mitigates V6.2 (encryption at rest) concerns because no PII is stored.
- **Change management traceable** (SOC2 CC8.1 PASS): Git-based with `// Verifies: FR-xxx` traceability comments throughout codebase.
- **Error messages sanitized** (OWASP ASVS V7.4 PASS): `errorHandler.ts` returns only `{ error: "Internal server error" }` to clients; full stack goes only to stdout logs.
- **Input validation on enums** (OWASP ASVS V5.1 PARTIAL PASS): Enum fields validated against whitelists in routes. However, free-text fields (title, description) have no max-length enforcement.
- **Soft-delete implemented** — Items are flagged `deleted: true` and excluded from queries. Not a hard GDPR erasure, but workable for an in-memory store.

### Framework mapping notes

- The `sensitive_fields` in `security.config.yml` (email, password, token, secret, api_key) are config-level concerns for a generic project template. **This specific application's data model contains none of those fields.** Document this context-mismatch in findings rather than flagging phantom gaps.
- SOC2 CC8.1 (change management) maps cleanly to the repo's spec-first workflow and traceability comments — treat this as PASS.
- OWASP ASVS V9.1 (TLS) is a deployment-time concern. The code uses `app.listen()` (HTTP). Whether TLS termination happens at an upstream proxy is not visible from static analysis alone — flag as UNVERIFIED but document the assumption.

### Recommended remediation priority (for team backlog)

1. Authentication middleware (JWT/session) — blocks CC6.1, CC6.2, CC6.3, ASVS V2/V3/V4
2. Security headers via `helmet` — quick win, broad coverage
3. CORS allowlist — quick win
4. Audit event emission (state_transition first, then permission_denied once auth exists)
5. Rate limiting (`express-rate-limit`)
6. Webhook signature verification (HMAC-SHA256 for Zendesk)
7. Pagination cap (one-liner fix)
8. Restrict /metrics endpoint
