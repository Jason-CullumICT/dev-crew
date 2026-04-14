# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-04-14

### Codebase Architecture (Context for Future Runs)

- **Backend:** Express.js + TypeScript, **in-memory store only** (no database). All data lost on restart.
- **Frontend:** React + Vite (TypeScript). No SSR.
- **No authentication layer exists** — this is the primary compliance blocker across all frameworks.
- **No persistence layer** — at-rest encryption controls (ASVS V6.x) are architecturally N/A until a database is introduced.
- **Sensitive fields audit** (`email`, `password`, `token`, `secret`, `api_key`): None of these appear in the current WorkItem domain model. The project is a workflow engine (not user management). These fields become relevant only after authentication is introduced.

### Controls This Project Consistently Fails

1. **Authentication** (ASVS V2.x, SOC2 CC6.1) — No auth layer of any kind. This blocks verification of MFA, session management, and all access-control controls too.
2. **HTTP Security Headers** (ASVS V14.4.x) — No Helmet middleware. Easy fix.
3. **CORS** (ASVS V14.5.3) — No CORS middleware. Easy fix.
4. **Rate Limiting** (ASVS V11.1.2) — No `express-rate-limit`. Easy fix.
5. **TLS Enforcement** (ASVS V9.1.x) — HTTP only; TLS is a deployment/infra concern but HSTS header is code-level.
6. **Audit Events** (SOC2 CC7.1) — `login_attempt` and `permission_denied` will always be FAIL until auth/RBAC land.

### Controls That Are Architectural Non-Issues (for this domain)

- **Encryption at rest for sensitive fields** — In-memory store; no at-rest data. When DB is introduced this must be revisited.
- **PII fields in WorkItem model** — WorkItem has no email/password/token fields currently. Sensitive field audit is deferred.

### Controls Partially Passing

- **SOC2 CC8.1 (Change Management)** — Work-item `changeHistory` tracks field-level mutations. Actor is hardcoded as `'user'`/`'system'` not an authenticated identity. Upgrade to authenticated actor once auth lands.
- **SOC2 CC7.1 (Monitoring)** — Prometheus metrics + structured JSON logs present. Missing required audit events (`login_attempt`, `permission_denied`, `data_export`). State transitions logged informally (not as structured `event: "state_transition"` entries).

### Framework Mapping Notes

- **OWASP-ASVS L2 V2.10.x** (no hardcoded secrets): PASS — only `process.env.PORT` used.
- **OWASP-ASVS L2 V7.4.1** (no stack traces to client): PASS — `errorHandler` sends generic message; stack stays in logs.
- **OWASP-ASVS L2 V5.1.3** (input validation): PASS — enum validation on create/update. No injection risk identified (in-memory store, no SQL/NoSQL queries).
- SOC2 CC6.2/CC6.3 (access provisioning/removal) will remain FAIL as long as there is no user management system — do not re-audit these as new findings; they are structural.

### Webhook Findings

- `/api/intake/zendesk` — No HMAC-SHA256 signature verification. Zendesk sends signature in `X-Zendesk-Webhook-Signature`. This is a concrete, actionable gap.
- `/api/intake/automated` — No auth. Requires pre-shared API key or similar.

### Metrics Endpoint

- `GET /metrics` is unauthenticated. Leaks internal counters, Node.js memory stats. Should be restricted to scraper IP or moved to internal port.

### Pass Rate

- 2026-04-14: 26% pass rate (3 pass, 3 partial, 13 fail) → Grade D
