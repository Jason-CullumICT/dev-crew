# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-05-25

### Application Profile
- **Stack**: Node.js / Express (TypeScript) backend, React frontend
- **Data storage**: In-memory only (no database, no persistence) — at-rest encryption controls are moot for current implementation but must be addressed before any database layer is added
- **Domain**: Work item / workflow engine — no user management, no PII in data model
- **Authentication**: NONE — entire API is publicly accessible without credentials

### Controls This Project Consistently Fails

1. **Authentication (OWASP V2 / SOC2 CC6.2)**: No authentication system exists whatsoever. Every endpoint is publicly accessible. This is the single most critical gap.
2. **Access Control / RBAC (OWASP V4 / SOC2 CC6.1, CC6.3)**: No access control or role-based permissions anywhere.
3. **Audit Event Logging (SOC2 CC7.1)**: Three of four required audit events are missing — `login_attempt`, `permission_denied`, `data_export`. `state_transition` has partial coverage via workflow change history but is not emitted as an audit event.
4. **TLS Enforcement (OWASP V9)**: No HTTPS enforcement, no TLS termination in application layer.
5. **Security Headers (OWASP V14)**: No Helmet or equivalent middleware; no CSP, HSTS, X-Frame-Options, etc.
6. **Rate Limiting (OWASP V2.2.1)**: No rate limiting anywhere — all endpoints are unbounded.
7. **Webhook Signature Verification**: `/api/intake/zendesk` and `/api/intake/automated` accept any POST without HMAC signature validation.
8. **Pagination Limit Enforcement**: `limit` parameter is accepted without a maximum cap, enabling full data enumeration.

### Controls That Pass
- No hardcoded secrets (only `process.env.PORT` used)
- No credentials in logs (no user system, no auth tokens)
- Structured JSON logging (never `console.log`)
- Generic error responses from global error handler (stack not exposed to clients)
- Prometheus metrics exposed at `/metrics` for domain operations
- Workflow state machine with enforced valid transitions
- Change history tracked on all workflow state changes (partial CC8.1)
- Soft delete mechanism implemented

### Framework Mapping Notes
- **Sensitive fields** (`email`, `password`, `token`, `secret`, `api_key`) do NOT appear in the current WorkItem data model — the application has no user management layer. These controls are N/A for the current model but CRITICAL to enforce if a user management system is added.
- **GDPR Art. 17** (Right to Erasure) cannot be satisfied with soft-delete alone — a hard delete endpoint is required.
- **SOC2 CC7.1** gets partial credit only because Prometheus metrics and debug logging exist; the four required audit events are largely absent.
- **SOC2 CC8.1** gets partial credit because workflow change history exists, but there is no code-level change management control (audit of deployments, config changes).
- The `/metrics` Prometheus endpoint is unauthenticated — it leaks operational data (item counts, dispatch rates) that an attacker could use for reconnaissance.

### Ambiguous Mappings Resolved
- OWASP ASVS V7.4.1 (generic error messages): PARTIAL PASS — the global `errorHandler` correctly returns `{ error: 'Internal server error' }`, but individual route `catch` blocks forward raw exception messages to clients via `res.status(500).json({ error: message })`. These messages may leak internal detail.
- OWASP ASVS V8.1.1 (sensitive data not stored unnecessarily): PASS for current model — no PII fields in WorkItem schema.
