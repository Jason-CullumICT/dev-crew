# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-08-10 — Initial Audit (OWASP-ASVS L2, SOC2-Type2)

### Application Scope
- **dev-crew Source App** — workflow engine backend (Express/TypeScript) + React frontend
- Data model: WorkItems only — no user PII, no passwords, no tokens in the current data model
- The `compliance.sensitive_fields` (email, password, token, secret, api_key) do NOT appear in the current schema; they are aspirational for future user-management features

### Controls This Project Consistently Fails

1. **Authentication (ASVS 2.x, SOC2 CC6.1, CC6.2, CC6.3)** — The application has **zero authentication**. Every API endpoint is open. This is the single biggest compliance gap and cascades to access-control, RBAC, and audit identity failures.

2. **Security HTTP Headers (ASVS 14.4.x)** — No Helmet.js or equivalent. CSP, HSTS, X-Frame-Options, X-Content-Type-Options all missing.

3. **TLS/HTTPS Enforcement (ASVS 9.1.x)** — Express listens on plain HTTP. No TLS configuration, no redirect.

4. **Required Audit Events (SOC2 CC7.1)** — `login_attempt`, `permission_denied`, `data_export` events never emitted (no auth system to trigger them). `state_transition` is partially covered by changeHistory but not through the audit logger.

5. **Rate Limiting (ASVS 4.2.2)** — No rate limiting on any endpoint.

6. **Pagination Caps** — `?limit=` query param has no upper-bound enforcement, enabling bulk enumeration.

### Controls That Are Architectural Non-Issues (Context-Specific)

- **Encryption of sensitive fields at rest** — Currently N/A because the data model contains no PII. If user management is added, this will become critical.
- **Hardcoded secrets** — Clean: only `process.env.PORT` is used, no credentials in Source/.
- **Data model encryption** — In-memory store only; no database layer yet, so at-rest encryption is deferred.

### Framework Mapping Notes

- OWASP-ASVS L2 authentication controls (2.1–2.4) map cleanly to the missing auth layer.
- SOC2 CC6.1 (logical access controls) is the primary SOC2 control that fails across the board — all sub-controls inherit this gap.
- SOC2 CC8.1 (change management) partially passes because `changeHistory` tracks field mutations in-app, but this is not an external audit trail.
- GDPR Art. 17 (right to erasure) — soft-delete is implemented but hard-delete is absent; no PII to erase currently.

### Ambiguous Mappings Resolved

- ASVS 7.4.1 (error handling): Partially passes — errorHandler returns generic messages to clients, but some service-layer errors are forwarded raw via `res.status(500).json({ error: message })` in workflow routes.
- ASVS 7.1 (log content): Structured JSON logging is implemented correctly, but logs lack user identity and request correlation IDs, making them insufficient for SOC2 CC7.1.
