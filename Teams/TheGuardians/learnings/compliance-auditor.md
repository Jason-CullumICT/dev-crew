# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-10-12 — OWASP-ASVS L2 / SOC2-Type2 Audit

### Architecture Snapshot
- **Backend**: Express/TypeScript, port 3001. In-memory Map store (no database).
- **Frontend**: Vite/React, port 5173.
- **Auth layer**: **None** — entire API is unauthenticated.
- **Secrets**: Managed via `.env` (not committed). GITHUB_TOKEN referenced in platform/.env.example.

### Consistent Failures (controls this codebase always fails)
1. **Authentication (OWASP-ASVS V2, SOC2 CC6.1/CC6.2)** — No auth middleware, no login flow, no JWT/session. This is the most critical repeated gap. Every run will flag this until an auth layer is added.
2. **TLS/HTTPS enforcement (OWASP-ASVS V9)** — App binds plain HTTP. No TLS termination in source code (may be handled at infra layer externally — but not verifiable from source).
3. **Audit events (SOC2 CC7.1)** — `login_attempt`, `permission_denied`, `data_export` events never emitted. `state_transition` is partially logged but without actor identity.
4. **Pagination limit cap (OWASP-ASVS V5)** — `limit` query param is passed straight to store with no upper-bound cap (e.g., no max of 100). Allows full data dump via `?limit=999999`.
5. **Webhook authentication (OWASP-ASVS V2)** — `/api/intake/zendesk` has no HMAC signature check. Any caller can inject work items.
6. **No hard delete / right to erasure (GDPR Art. 17)** — Only soft-delete (`deleted: true`). Data stays in-memory indefinitely. No purge mechanism.

### Architectural Non-Issues for This Domain
- **Encryption at rest**: The data model contains no PII (email, password, token, secret, api_key as listed in sensitive_fields are **not present** in the WorkItem schema). The current sensitive_fields list in security.config.yml does not match the actual data model — no remediation for at-rest field encryption of those specific fields is needed on the current schema, but the intake webhook accepts arbitrary `body` fields which could carry PII.
- **In-memory store**: No database means no SQL injection surface. This is an architectural simplification but also means data is ephemeral — no persistent retention risk.

### Framework Mapping Notes
- SOC2 CC8.1 (change management) is **partially satisfied** by the `changeHistory` array on WorkItem. This is a genuine control that exists. However it lacks actor identity (real user IDs) — it uses hardcoded strings like `'user'`, `'dispatcher'`, `'manual-override'`.
- SOC2 CC7.1 (monitoring) is **partially satisfied** by Prometheus metrics at `/metrics` and structured JSON logging. Missing: alerting rules, audit event emission.
- OWASP-ASVS V5 input validation is **partially satisfied** (enum validation on type/priority/source/complexity) but fails on unbounded pagination.
