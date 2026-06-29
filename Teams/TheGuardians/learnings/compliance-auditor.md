# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this codebase consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-06-29

### Domain Context
This is a **workflow-management / work-item-tracking** application (dev-crew Source App).
- Backend: Node.js + Express (TypeScript), port 3001
- Frontend: React + Vite, port 5173
- Data store: **In-memory JavaScript Map** — no database, no persistence
- No user-facing PII fields (email, password, etc.) in the domain model
- Sensitive fields listed in `security.config.yml` (email, password, token, secret, api_key) do **not** appear in the `WorkItem` entity — the app is a task-tracker, not a user-management system

### Controls That Consistently Fail (Architectural Gaps)
1. **Authentication is completely absent** — no auth middleware, no JWT, no sessions, no API keys on any route. This is the largest single gap and blocks CC6.1/CC6.2/CC6.3 and all OWASP ASVS Auth/AuthZ controls from passing.
2. **Audit logging for required events** — `login_attempt`, `permission_denied`, and `data_export` events cannot be logged when auth/authz don't exist. `state_transition` is partially covered by `logger.info` in service code but is not emitted as a structured audit record with a dedicated `event_type` field.
3. **Transport security** — Backend listens on plain HTTP; no TLS, no HSTS header, no redirect to HTTPS.
4. **Security headers** — No Helmet or equivalent middleware; CORS, CSP, X-Frame-Options all absent.
5. **Webhook intake has no HMAC verification** — `/api/intake/zendesk` and `/api/intake/automated` accept any POST without signature validation.
6. **No rate limiting** — Express.json() without body size cap; no express-rate-limit or equivalent.

### Controls That Pass (Architectural Strengths)
- Structured JSON logging is correctly implemented (no `console.log`, proper logger abstraction).
- No PII/sensitive fields (email, password, token) appear in log output or API responses.
- Prometheus metrics endpoint provides operational visibility.
- State transitions and change-history are tracked in `changeHistory` (soft audit trail within domain objects).
- Soft-delete pattern prevents accidental data loss; hard delete not implemented (minor gap for GDPR right-to-erasure).
- Input validation on enums and required fields is present; sanitization against injection is not.

### Framework Mapping Notes
- OWASP ASVS L2 "authentication" chapter is entirely inapplicable until auth is implemented — treat all 2.x controls as FAIL.
- SOC2 CC6.x maps cleanly to the auth/authz gap.
- SOC2 CC7.1 partially passes because Prometheus metrics exist (operational monitoring), but security-event monitoring is absent.
- SOC2 CC8.1 partially passes because `changeHistory` in domain objects captures state transitions, but the three other required audit events are missing.
- The `/metrics` endpoint leaks internal counters without auth protection — flag under CC6.1 and OWASP ASVS 4.1.
