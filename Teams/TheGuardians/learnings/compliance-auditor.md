# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this codebase consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-04-20 (Initial Audit)

### Architecture Context

This is a **workflow-engine web application** (Express/TypeScript backend, React frontend). It manages "work items" through a state machine (backlog → routing → proposed → reviewing → approved → in-progress → completed/failed). There is **no user management, no login system, and no authentication layer whatsoever** in the current codebase.

The data model contains no PII fields from `sensitive_fields` (email, password, token, secret, api_key). WorkItems hold title, description, type, status, priority — none are sensitive. However, the intake webhook endpoints accept arbitrary JSON payloads from external systems (Zendesk, automated systems) which could potentially carry PII in future.

### Controls This Codebase Consistently Fails

1. **Authentication & Session Management (entire V2.x, V3.x ASVS cluster, SOC2 CC6.1/CC6.3)** — Zero auth layer. No JWT, no sessions, no API keys. All endpoints are open. This will always fail until a proper auth system is implemented.

2. **Security Headers (OWASP ASVS V14.4.x)** — No Helmet middleware. Consistently absent.

3. **CORS (OWASP ASVS V14.5.3)** — No CORS policy configured. Express default allows all origins.

4. **Rate Limiting (OWASP ASVS V13.2.5)** — Not installed. No express-rate-limit or equivalent.

5. **Audit Logging of Required Events (OWASP ASVS V7.2.1, SOC2 CC7.1)** — The codebase has excellent structured logging and Prometheus metrics, but none of the 4 required audit events (login_attempt, permission_denied, state_transition as structured audit, data_export) are emitted. State transitions are tracked in the WorkItem `changeHistory` array (persisted with the item), but this is not a separate audit log stream.

6. **Webhook Signature Verification (OWASP ASVS V13.2.3)** — Intake endpoints accept Zendesk/automated payloads without HMAC or token validation.

7. **Pagination Limit Maximum (OWASP ASVS V5.1.3)** — `GET /api/work-items?limit=N` accepts arbitrary N with no ceiling.

8. **GDPR Right to Erasure (Art. 17)** — Only soft-delete (flags `deleted=true`). No hard delete, anonymization, or purge endpoint.

### Controls That Pass

1. **Structured JSON Logging (OWASP ASVS V7.1.1)** — Custom logger in `utils/logger.ts`, always JSON. No `console.log`.

2. **No Sensitive Data in Logs (OWASP ASVS V7.2.2)** — Current logging does not include passwords, tokens, or PII. Change history deliberately logs old/new values but the data model has no sensitive fields currently.

3. **No Hardcoded Secrets** — Clean. All env access via `process.env.*`. No literals in source.

4. **Error Response Sanitization** — Error handler returns generic `{ error: "Internal server error" }` to clients. Stack traces only go to stdout (not response body).

5. **Input Enum Validation** — Enum fields (type, priority, source, complexity) are validated against allowed values. Invalid values are rejected with 400.

### Framework Mapping Notes

- **SOC2 CC6.2** ("prior to issuing credentials"): N/A for this app — there is no credential issuance or user registration.
- **OWASP ASVS V2.x sub-controls**: Most are N/A until an auth system exists. Mark them blocked by COMP-001 rather than independent failures.
- **ISO 27001**: Not listed in security.config.yml but was mentioned in the task prompt. Map to the same gaps — A.9 (access control), A.10 (cryptography), A.12.4 (logging), A.18.1 (compliance). All mirror the ASVS and SOC2 gaps found.
- **State transitions** ARE tracked in `changeHistory[]` embedded in each WorkItem — this is a domain audit trail, not a separate security audit log. For compliance purposes these are separate concerns. The domain audit trail passes; the security audit log (separate stream) is absent.

### Remediation Priority Order

1. Implement authentication (JWT or session-based) — unblocks ~8 other controls
2. Add Helmet middleware — one line, high impact
3. Add CORS policy — one line with config
4. Add rate limiting — express-rate-limit, low effort
5. Add webhook HMAC signature verification
6. Add max pagination limit (e.g., cap at 100)
7. Implement structured security audit event emission
8. Add hard-delete / anonymization endpoint for GDPR
