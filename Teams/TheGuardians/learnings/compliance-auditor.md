# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-09-21

### Application Profile
- **Stack**: Express.js backend (TypeScript), React frontend (Vite), in-memory store (no DB)
- **Domain**: Internal AI-powered workflow/work-item management system
- **No user-facing auth system exists** — the application has zero authentication or authorization

### Controls This Project Consistently Fails

1. **Authentication (OWASP ASVS V2, SOC2 CC6.1/CC6.2)** — The application has NO authentication layer whatsoever. No JWT, no sessions, no API keys. Every endpoint is publicly accessible. This is the largest compliance gap.

2. **Access Control (OWASP ASVS V4, SOC2 CC6.3)** — No RBAC, no user context, no permission checks anywhere in the codebase.

3. **Required Audit Events (SOC2 CC7.1)** — `login_attempt` and `permission_denied` events can never be emitted because there is no auth system. `data_export` has no export functionality. `state_transition` IS logged via changeHistory and logger.info but not as a dedicated structured audit log.

4. **Security Headers (OWASP ASVS V14.4)** — No `helmet` package, no Content-Security-Policy, HSTS, X-Frame-Options, etc.

5. **CORS Policy (OWASP ASVS V14.5)** — No CORS middleware. Any origin can send requests.

6. **Rate Limiting (OWASP ASVS V4.2)** — No rate-limiting middleware anywhere.

7. **Encryption at Rest (OWASP ASVS V8, SOC2 CC6.1)** — Data is stored in an in-memory JavaScript Map. No persistence layer, no encryption.

8. **TLS Enforcement (OWASP ASVS V9)** — Backend runs plain HTTP. No TLS configuration.

9. **Pagination Limit Cap (OWASP ASVS V4.2)** — `limit` query param accepts any integer, allowing bulk data enumeration.

10. **Metrics Endpoint Exposure (SOC2 CC6.1)** — `/metrics` (Prometheus) is unauthenticated and publicly accessible.

11. **No Hard Delete / GDPR Right to Erasure** — Only soft-delete exists (`deleted: true` flag). No mechanism to permanently purge records.

### Controls This Project Passes

- Structured JSON logging (no console.log) — PASS
- No hardcoded secrets in Source/ — PASS
- Error responses to clients are generic (don't leak stack traces) — PASS
- State machine transitions are validated against an explicit allow-list — PASS
- UUIDs used for entity identifiers — PASS
- Enum validation on inputs (type, priority, source, complexity) — PASS
- Change history tracked for all mutations — PASS (partial credit for CC7.1 / state_transition)

### Framework Mapping Notes

- **OWASP ASVS L2**: The application fails the entire authentication and access control verticals (V2, V3, V4). These are foundational controls — remediating them unblocks many downstream controls.
- **SOC2 CC6.x**: All CC6 controls fail for the same root cause — no identity/access management system.
- **SOC2 CC7.1**: Monitoring/detection exists at the metrics level (Prometheus) but security event detection (auth failures, anomalous access) is absent.
- **SOC2 CC8.1**: Application-level change tracking (changeHistory) is a positive signal but does not satisfy the infrastructure/software change management intent of CC8.1.

### Architectural Notes for Future Runs

- The application's data model (WorkItem) does NOT contain the sensitive_fields listed in security.config.yml (email, password, token, secret, api_key). This is architecturally correct — the app is a workflow tool, not a user management system. However, if auth is added, credential fields would appear and must be hashed/encrypted.
- The Zendesk and automated intake endpoints (`/api/intake/*`) are unauthenticated webhook receivers — high risk for spam/injection without webhook signature verification.
- The `/api/work-items` list endpoint has no upper bound on the `limit` query parameter — trivial data enumeration possible.
- CLAUDE.md documents dev credentials (`admin@example.com / admin123`) — these must never be committed to production config.
