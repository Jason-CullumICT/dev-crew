# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-07-27

### Architecture Context
- **Stack:** Express.js (TypeScript) backend + React/Vite frontend. Fully stateless with in-memory Map store — **no database, no persistence layer**.
- **Domain:** Work-item workflow engine. Data model contains `WorkItem` with fields: title, description, type, status, priority, source, complexity, assignedTeam, changeHistory, assessments. No user model, no credential storage.
- **PII exposure:** Free-text fields (`title`, `description`) could contain PII, but the configured `sensitive_fields` (email, password, token, secret, api_key) do not appear in the data model. Mark as Low risk for sensitive-field encryption in this domain.

### Controls This Project Consistently Fails
1. **Authentication** — There is no authentication layer at all. Every endpoint is public. This is the #1 perennial gap.
2. **Audit Logging** — Required events (login_attempt, permission_denied, state_transition, data_export) are absent. `changeHistory` in WorkItems is domain change tracking, NOT a security audit log.
3. **HTTPS enforcement** — Express app binds to plain HTTP. No TLS termination code in `Source/`.
4. **Security headers** — No helmet/CORS middleware in the Express app.
5. **Rate limiting** — No rate limiting on any endpoint. Pagination `limit` is uncapped.
6. **Webhook authentication** — /api/intake/zendesk and /api/intake/automated accept any POST without HMAC/API-key verification.
7. **Metrics endpoint** — /metrics is unauthenticated and publicly accessible.

### Framework Mapping Notes
- **SOC2 CC8.1** (Change management) gets a PARTIAL pass because `changeHistory` inside WorkItems provides field-level change tracking — but this is operational audit, not the security change-management control SOC2 intends.
- **OWASP ASVS 7.1.1** (No sensitive data in logs) is a PASS — the current structured logger emits only operational identifiers (workItemId, docId, etc.).
- **GDPR** and **ISO27001** are not in `compliance.frameworks` in security.config.yml but were requested by the user. Always include them if the user explicitly requests them regardless of config.
- `pino` is declared as a runtime dependency but is NOT used — the actual logger is a custom `utils/logger.ts`. The in-package `fast-redact` transitive dep is therefore also unused.

### Controls That Are Architecture Non-Issues
- **Sensitive field encryption at rest (OWASP ASVS 6.1.1):** The configured sensitive fields (email, password, token, secret, api_key) do not exist in the WorkItem domain model. However, the in-memory store itself has no encryption. Flag as High because the store itself is unprotected even though current schema has no PII.
- **Session timeouts:** Not applicable — no session management exists.
- **MFA:** Not applicable until basic authentication is introduced.
- **Password complexity (ASVS 2.1.x):** Not applicable — no user credential model.

### Grading History
| Date | Grade | Critical | High | Pass Rate |
|------|-------|----------|------|-----------|
| 2026-07-27 | D | 2 | 6 | ~6% |
