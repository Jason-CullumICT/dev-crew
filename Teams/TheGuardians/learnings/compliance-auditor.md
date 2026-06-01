# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-06-01 — Initial audit (OWASP-ASVS L2 + SOC2-Type2)

### Architecture profile
- **Stack:** Express (Node/TypeScript) REST API + React/Vite frontend
- **Storage:** In-memory Map (`workItemStore.ts`) — no database, no persistence across restarts
- **Auth:** None — this is the dominant compliance gap
- **Domain:** Workflow orchestration (work items, state machine, assessment pod)
- **PII exposure:** Current data model has NO PII fields. `WorkItem` contains only workflow metadata. The five sensitive fields in `security.config.yml` (email, password, token, secret, api_key) do not appear anywhere in the schema.

### Controls this project consistently fails
1. **Authentication (OWASP V2.x, SOC2 CC6.1/CC6.2/CC6.3)** — Zero auth anywhere. Every audit run will fail these until auth is implemented. Fastest remediation: global JWT bearer middleware in `app.ts`.
2. **Audit events (SOC2 CC7.1)** — `login_attempt`, `permission_denied`, and `data_export` cannot be emitted without an auth system. `state_transition` is partially covered via WorkItem `changeHistory[]` but is not emitted as a dedicated structured log event. Recommend an `auditLog()` wrapper function.
3. **TLS (OWASP V9.1)** — Not configured at application layer. Likely intended to be handled by infra (Docker/nginx). Confirm infra-layer TLS before marking pass.
4. **Security headers (OWASP V14.4)** — `helmet` not installed. Quick win.
5. **CORS (OWASP V14.5)** — No explicit CORS policy. Quick win with `cors` package.
6. **Rate limiting (OWASP V13.1)** — No rate limiting; pagination `limit` is uncapped.

### Controls that ARE passing
- **Error handling (OWASP V7.4)** — `errorHandler.ts` does NOT leak stack traces to clients. Logs them server-side only. Passes every time.
- **Change management (SOC2 CC8.1)** — `changeHistory[]` on every WorkItem provides a solid in-domain change audit trail. Acceptable for CC8.1 at the application level.
- **Input validation** — Enum validation on all workflow state transitions and work item creation is well-implemented. Protects against invalid state machine transitions.
- **Soft delete** — Present. Needed for GDPR soft compliance, but no hard delete exists.

### Framework mapping notes
- SOC2 CC8.1 "change management" maps well to the WorkItem `changeHistory[]` mechanism. Do not fail this control — it is a genuine architectural strength.
- OWASP V13.2 (RESTful services) is partial — the service validates enum inputs and enforces the state machine, but lacks signature verification on intake webhooks and has no auth header requirements.
- The application has no user accounts, no sessions, and no identity concept. All V2.x (authentication) and V4.x (access control) controls therefore fail structurally — this is not a configuration gap, it is an architectural absence. Team should understand this is a full implementation effort, not a configuration fix.
- GDPR Art. 17 (Right to Erasure) — soft delete exists, hard delete does not. Since no PII fields exist yet, this is medium severity. Escalate to high if user identity fields are added.

### Recheck triggers
- If authentication middleware is added → re-run V2.x, CC6.x controls
- If Helmet is installed → re-run V14.4
- If `auditLog()` wrapper is added → re-run CC7.1, check all four required events
- If a database is introduced → re-run data-at-rest encryption controls (currently N/A for in-memory store)
- If PII fields are added to WorkItem → elevate COMP-011 to High and add encryption-at-rest finding
