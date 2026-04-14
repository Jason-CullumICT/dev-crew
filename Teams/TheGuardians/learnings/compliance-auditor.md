# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-04-14 (run-20260414-213739)

### Architecture Context
- **This is a workflow engine**, not a user-facing auth platform. The `WorkItem` domain model contains no PII fields (email, password, token, secret, api_key). All sensitive_fields in security.config.yml are architectural non-issues **for the current data model**.
- **In-memory store only** — `Source/Backend/src/store/workItemStore.ts` uses a JavaScript `Map`. No ORM, no migrations, no persistence layer. Encryption-at-rest controls (ASVS V6.1) are not applicable until a database is introduced.
- **No authentication system** — The backend has zero auth middleware. All OWASP-ASVS V2/V3 password/session controls are N/A today, but CC6.1/CC6.2/CC6.3 hard-fail because endpoints are open.

### Controls This Project Consistently Fails
1. **CC6.1/CC6.2/CC6.3** — No authentication, no authorisation, no credential lifecycle. Root cause: auth was never built. This is the single most critical gap.
2. **ASVS V4.1.x** — No RBAC or policy enforcement. Dependent on auth being resolved first.
3. **Required audit events** — Only `state_transition` is logged. `login_attempt`, `permission_denied`, `data_export` all require auth/authz infrastructure to emit.
4. **V9.1.1 TLS** — Application starts HTTP only. No HSTS, no redirect. Likely delegated to infrastructure but not documented.
5. **V14.4.x / V14.5.3** — No security headers, no CORS. Requires `helmet` and `cors` packages (1-2 line fixes once flagged).

### Controls That Are Architectural Non-Issues (For Current Domain)
- **V2.1.x Password storage** — No user accounts or passwords stored anywhere.
- **V6.1.x Encryption at rest for PII** — No PII in data model. Mark N/A unless domain evolves.
- **V6.2.1 Sensitive field encryption** — Same as above. All five `sensitive_fields` from config are absent from WorkItem schema.
- **V3.x Session management** — No sessions. N/A until auth is added.
- **V2.5.2 No hardcoded credentials** — PASSES cleanly. Source code has no credentials.

### Framework Mapping Ambiguities Resolved
- **SOC2 CC8.1** (Change management) — Treat WorkItem `changeHistory` as partial credit for domain-level change tracking. Infrastructure change management is out of band for this audit scope.
- **SOC2 CC7.1** (Detection/monitoring) — Prometheus metrics + structured logging is partial credit. Full credit requires security event monitoring (alerting on auth failures, anomaly detection).
- **ASVS V6.3.1 Secure random** — The `uuid` v9 package uses `crypto.getRandomValues()` (CSPRNG). This PASSES.

### Structural Observations
- `pino` is listed as a dependency in `package.json` but the project uses a **custom logger** (`utils/logger.ts`). Pino is unused dead weight.
- The Prometheus `/metrics` endpoint has no authentication. In production this should be restricted (IP allowlist or separate internal port).
- Webhook endpoints (`/api/intake/zendesk`, `/api/intake/automated`) have no origin verification. These are high-value injection points.
- `errorHandler.ts` logs `err.stack` — low severity but worth flagging for production hardening.

### Recommended Order of Remediation
1. Auth middleware (blocks CC6.1, ASVS V13.1.1)
2. RBAC (blocks CC6.3, ASVS V4.1.x)
3. Rate limiting + webhook signature verification (quick wins, high impact)
4. Helmet + CORS (5-minute fixes with npm packages)
5. Audit event emission after auth/authz infrastructure exists
6. Hard delete / retention policy
7. OTel trace injection
