# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-10-19

### Architecture Notes
- **Stack:** Node.js/TypeScript, Express 4, React/Vite frontend. **In-memory store only** — no database, no file persistence. All data lost on restart.
- **Domain:** Workflow engine for work items (feature/bug/issue/improvement). No user account management in the current codebase — auth/identity is entirely absent.
- **PII fields** listed in `security.config.yml` (`email`, `password`, `token`, `secret`, `api_key`) do **not appear** in the `WorkItem` domain model. The only free-text fields are `title` and `description`, which could contain ad-hoc PII. The encryption-at-rest concern is effectively deferred until a durable store is introduced.

### Controls This Project Consistently Fails
1. **Authentication / Authorization (OWASP V2, V4, SOC2 CC6.1)** — Zero auth at the API layer. Every endpoint is unauthenticated. This is the root blocker for MFA, session timeout, and several audit event gaps.
2. **TLS/HTTPS (OWASP V9.1.1, SOC2 CC6.7)** — Server binds plain HTTP; no TLS enforcement anywhere in source.
3. **Required Audit Events (SOC2 CC7.1)** — `login_attempt` and `permission_denied` cannot exist without auth. `data_export` is never logged. `state_transition` is logged as free-text `msg` rather than a typed `event` key.
4. **HTTP Security Headers (OWASP V14.4)** — No `helmet` or equivalent. HSTS, CSP, X-Frame-Options all absent.
5. **CORS Policy (OWASP V14.5)** — No `cors()` middleware; all origins accepted.
6. **Rate Limiting (OWASP V13.1.4)** — No rate limiting on any endpoint.
7. **Webhook Auth (OWASP V13.2.1)** — `/api/intake/zendesk` and `/api/intake/automated` have no authentication.

### Controls That Pass / Are Architectural Non-Issues
- **No hardcoded secrets** — no credentials in source code. Env var pattern (`process.env.PORT`) is used. ✅
- **Error handler does not leak stack traces to clients** — `errorHandler.ts` returns generic `"Internal server error"` to HTTP clients; stack traces go to logs only. ✅
- **Input validation on enum fields** — type, priority, source, complexity are all enum-validated before persistence. ✅
- **Change history tracking (SOC2 CC8.1 / ISO A.12.1.2)** — `trackUpdates` + `buildChangeEntry` + `changeHistory` array gives a complete audit trail of field mutations. ✅
- **Soft-delete semantics** — `deleted` flag prevents retrieval of deleted items from normal queries. However, hard-delete (GDPR Art. 17) is missing. ⚠️
- **Structured logging** — `utils/logger.ts` emits JSON to stdout; no `console.log` in production paths. ✅
- **Prometheus metrics** — `prom-client` with a custom registry; domain-significant operations are metered. However, `/metrics` endpoint is unauthenticated. ⚠️

### Framework Mapping Notes
- **GDPR** — Not listed in `security.config.yml` but requested explicitly. The application does not explicitly handle user PII; however, free-text fields could carry PII, TLS is absent (Art. 32 violation), and soft-delete-only violates Art. 17.
- **ISO 27001** — Not listed in `security.config.yml` but requested explicitly. Key controls A.9 (access control) and A.14 (secure development) are broadly non-compliant due to absent auth and missing security headers.
- **SOC2 CC8.1 (Change Management)** — passes because the `changeHistory` array in each `WorkItem` records every field mutation with agent, old/new values, and reason. This satisfies the audit trail requirement at the data level even without a database.

### Remediation Priority Insight
The single highest-leverage fix is **adding an authentication middleware**. This unblocks: MFA, session timeout, `login_attempt` audit events, `permission_denied` audit events, and access control enforcement — resolving approximately 40% of all findings in one change.
