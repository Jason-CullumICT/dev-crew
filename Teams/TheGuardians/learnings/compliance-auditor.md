# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-11-02 — Initial Audit (OWASP-ASVS L2, SOC2 Type 2)

### Architecture Profile
- **Backend:** Express.js + TypeScript, **in-memory store only** (no database, no persistence)
- **Frontend:** React + Vite, plain fetch API client
- **No authentication layer exists** anywhere in the codebase
- No Helmet.js, no CORS configuration, no rate limiting in dependencies
- Structured JSON logger (custom, wraps prom-client + custom logger) — good foundation
- Prometheus metrics at `/metrics` — unauthenticated

### Controls This Project Consistently Fails

1. **OWASP-ASVS V2 (Authentication)** — Entire V2 control family fails. No auth system.
2. **OWASP-ASVS V3 (Session Management)** — No sessions. Entire V3 family absent.
3. **OWASP-ASVS V4 (Access Control)** — No RBAC, no roles, no identity on requests.
4. **OWASP-ASVS V9 (Communications)** — Plain HTTP. No TLS enforcement.
5. **OWASP-ASVS V14.4 (Security Headers)** — No Helmet.js, no CSP, HSTS, X-Frame-Options.
6. **SOC2 CC6.1** — No logical access controls (auth) or transport encryption (TLS).
7. **SOC2 CC6.2** — No credential issuance/management system.
8. **SOC2 CC6.3** — No role-based access. All actors equivalent (anonymous).
9. **SOC2 CC7.1** — Required audit events `login_attempt`, `permission_denied`, `data_export` entirely absent.

### Controls Partially Passing

- **OWASP-ASVS V5 (Validation)** — Enum input validation present; free-text fields unvalidated/unsanitized
- **OWASP-ASVS V7 (Error Handling)** — Errors handled + structured-logged; stack not leaked to clients ✓. Missing audit event types.
- **SOC2 CC7.1 (Monitoring)** — Prometheus metrics + structured logging exist; `state_transition` logged implicitly but not as typed audit event
- **SOC2 CC8.1 (Change Management)** — Change history tracked per work item; but no persistent storage → all data lost on restart

### Controls Consistently Passing

- Error messages do NOT leak stack traces to clients (errorHandler wraps properly)
- No hardcoded secrets found in Source/
- Soft deletes implemented (though no hard-delete for GDPR Right to be Forgotten)
- Pagination enforced on list endpoints (no unlimited dump risk)
- Input type/enum validation on structured fields

### Framework Mapping Notes

- **`sensitive_fields` in security.config.yml** (email, password, token, secret, api_key) — None of these exist in the current data model (WorkItem has no user/auth fields). Encryption-at-rest control is architecturally non-applicable for current schema, but becomes critical if user authentication is added.
- **`data_export` audit event** — No explicit data export endpoint exists. The closest is `GET /api/work-items` (paginated list) and `GET /api/dashboard/summary`. Treating bulk GET access without logging as a gap.
- **`state_transition` audit event** — State changes ARE logged (e.g., "Work item approved", "Work item dispatched"), but not as a discrete `state_transition` structured event type that can be queried/filtered in audit logs.
- **In-memory store** — Encryption at rest is effectively N/A because there is no persistence layer. The gap to flag is: if/when persistence is added, encryption must be included from the start.
- **OWASP-ASVS V13.1.3 (CORS)** — Express has no `cors()` middleware. All cross-origin requests are accepted by default browser CORS preflight handling (simple requests pass, preflight needed for complex ones — still a gap).
