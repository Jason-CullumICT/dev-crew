# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-08-17 — Initial Full Audit (SOC2-Type2, OWASP-ASVS L2)

### Project Architecture Notes
- **Backend**: Express.js + TypeScript, in-memory store (no persistent database), Prometheus metrics via prom-client
- **Frontend**: React + Vite SPA, proxies `/api` to backend in dev
- **No authentication layer exists anywhere** — this is the single biggest compliance gap
- The data model (`WorkItem`) does NOT contain PII fields listed in `sensitive_fields` (email, password, token, secret, api_key). Those fields simply don't exist in the application's domain model. Sensitive field encryption checks are therefore architecture non-issues for the current data model, but remain important controls to gate any future data model changes.
- Change history tracking IS implemented (CC8.1 partial credit) but `agent` field carries literal strings ('user', 'system', 'dispatcher') — no real actor identity since there is no auth.
- Prometheus `/metrics` endpoint is present and functional but completely unprotected.

### Controls This Project Consistently Fails
1. **Authentication (OWASP V2.x / V3.x / CC6.1 / CC6.2)** — No auth middleware anywhere. Every endpoint is open.
2. **Access Control (OWASP V4.x / CC6.3)** — No RBAC, no role checks, no principle of least privilege.
3. **TLS Enforcement (OWASP V9.1)** — Application runs HTTP only; no HTTPS config, no HSTS header.
4. **Security HTTP Headers (OWASP V14.4)** — Helmet.js or equivalent absent; no CSP, HSTS, X-Frame-Options, etc.
5. **Rate Limiting (OWASP V4.2.2)** — No rate limiting on any endpoint.
6. **Required Audit Events (CC7.1)** — `login_attempt`, `permission_denied`, `data_export` not logged (impossible without auth).
7. **CORS Policy (OWASP V14.5)** — No backend CORS configuration.
8. **Session Management (OWASP V3.x)** — No sessions, no timeout, no binding.
9. **Intake Webhook Auth (CC6.2)** — No HMAC/signature validation on Zendesk and automated intake endpoints.
10. **Pagination Limit Enforcement (OWASP V5.1.4)** — No upper bound on `limit` query param; allows full data dump.

### Controls That ARE Met (or Partially Met)
- Structured JSON logging implemented correctly (pino/custom, not console.log)
- Change history tracking covers state transitions (CC8.1 partial)
- Prometheus metrics for domain operations (CC7.1 partial)
- Enum input validation on create/update routes
- No hardcoded secrets found in source
- Generic error message returned to clients from global error handler
- Soft delete mechanism exists

### Framework Mapping Notes
- OWASP-ASVS L2 focus areas (authentication, access-control, data-protection) map entirely to failing controls for this app
- SOC2 CC8.1 (change management) is the only SOC2 control with any partial evidence
- The `sensitive_fields` list in security.config.yml (email, password, token, secret, api_key) does not map to any fields in the WorkItem data model — no encryption gaps found, but auditor should re-check if data model expands to include user accounts or API credentials
- `state_transition` audit event is the only required audit event with partial coverage (via change history)
