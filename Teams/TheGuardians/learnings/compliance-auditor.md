# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-07-06 — Initial Full Audit (SOC2, OWASP-ASVS L2)

### Consistent Failures (expect these every run until remediated)
- **No authentication**: The Source App backend has zero auth middleware. ALL access-control and authentication controls (OWASP-ASVS V2, V3, V4; SOC2 CC6.1/CC6.2/CC6.3) fail until an auth layer is added.
- **No security headers**: No `helmet` package. All OWASP-ASVS V14.4.x controls fail.
- **No CORS policy**: No `cors` package configured. OWASP-ASVS V14.5.3 fails.
- **No rate limiting**: No `express-rate-limit`. Intake webhook endpoints are fully open.
- **Required audit events absent**: `login_attempt`, `permission_denied`, `state_transition` (formal audit format), `data_export` — none emitted. SOC2 CC7.1 fails.

### Controls That Pass (current state)
- V7.4.1 (Generic error messages to users): Passes — errorHandler returns `{ error: 'Internal server error' }` to clients.
- V14.4.2 (Content-Type on JSON responses): Express json() middleware sets this automatically.
- CC8.1 (Change tracking): Partial — `changeHistory` on WorkItems tracks field mutations, which counts as partial credit for data-layer change management.

### Architectural Notes
- The app uses in-memory storage (no DB), so "encryption at rest" controls are architecture-level N/A today but must be planned for before any persistence layer is added.
- `compliance.sensitive_fields` (email, password, token, secret, api_key) are **not present** in the current WorkItem data model — these are future-auth fields. No PII is stored in the current domain model.
- `login@example.com / admin123` in CLAUDE.md refers to the **orchestrator dashboard** (port 9800), NOT the Source App — the Source App has no login at all.
- The `/metrics` Prometheus endpoint is unauthenticated and accessible to any network-reachable client — information disclosure risk.
- Intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) have no HMAC signature verification — trivial to forge.

### Framework Mapping Ambiguities
- SOC2 CC8.1 (Change Management) maps cleanly to `changeHistory` for data changes, but not to code deployment controls. Marked as PARTIAL in this codebase context.
- OWASP-ASVS V2.x / V3.x authentication controls: when no authentication exists, treat as FAIL (not N/A), because the absence of auth IS the gap.
