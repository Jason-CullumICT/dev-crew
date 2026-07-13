# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-07-13 — OWASP-ASVS L2 + SOC2-Type2 Audit

### Architecture Notes for This Codebase

- **Tech stack:** Node.js + Express backend (TypeScript), React + Vite frontend, in-memory data store (no database). No persistence layer — data is a `Map<string, WorkItem>` in process memory.
- **No authentication layer exists at all.** This is the dominant compliance gap. No JWT, no session middleware, no API keys. All 11 route handlers are publicly accessible.
- **No authorization / RBAC layer.** The `agent` field in `buildChangeEntry` is always a hard-coded string, not a real actor identity.
- **Sensitive fields from config (`email`, `password`, `token`, `secret`, `api_key`) do not appear in the WorkItem schema** — these are not processed by the application currently. The risk is in free-text `title`/`description` fields which could carry sensitive content.
- **Structured logger is present and correctly implemented** (`utils/logger.ts` using `process.stdout` with JSON). No `console.log` usage in production paths. ✅
- **Prometheus metrics are implemented correctly** (`metrics.ts`, exposed at `/metrics`). Missing: authentication on the metrics endpoint.
- **changeHistory array** is embedded in WorkItem and captures field-level changes — but it is a domain object, not an audit event stream. The `state_transition` required audit event is only partially covered by this.
- **Error handler** (`middleware/errorHandler.ts`) correctly returns generic message to client. But per-route `catch` blocks in `workflow.ts` return `err.message` verbatim to clients on 500s.
- **Only soft-delete exists.** No hard delete, no anonymisation, no data retention policy.
- **Webhook intake endpoints** (`/api/intake/zendesk`, `/api/intake/automated`) have no HMAC/signature validation.

### Controls That Consistently Fail
- V2.1 (Authentication) — no auth framework installed
- V4.1 (Access Control) — no RBAC
- V14.4/V14.5 (HTTP security headers / CORS) — no helmet, no cors package
- CC6.1, CC6.2, CC6.3 (SOC2) — all fail due to missing auth/authz

### Controls That Pass
- V6.3.1 — No hardcoded secrets (env vars used in platform/.env.example)
- V7.1.1 — Structured JSON logging implemented
- V8.1.1 — No sensitive data in log outputs currently

### Framework Mapping Notes
- **GDPR** is not listed in `security.config.yml compliance.frameworks` but was requested by the team leader. Key gaps: no Right to Erasure (only soft delete), no encryption at rest. Flag these as GDPR Art. 17 and Art. 32 findings even if not in config.
- **ISO 27001** was also requested by the team leader but absent from config. ISO 27001 controls broadly overlap with SOC2 CC6.x for access control and CC7.1 for monitoring. Map findings to SOC2 controls and note ISO 27001 equivalence.
- **CC8.1 (Change Management)** is partially satisfied by the changeHistory mechanism on WorkItem, but the changeHistory is per-entity, not an immutable audit log. Mark as PARTIAL.

### Remediation Priority Order (For Next Engineering Cycle)
1. Add helmet + cors (one sprint, low effort, immediate ASVS/SOC2 improvement)
2. Add JWT authentication middleware (unblocks multiple controls)
3. Add RBAC (depends on auth being in place)
4. Emit structured audit events with `event` field (login_attempt, state_transition, permission_denied)
5. Rate limit all endpoints; cap pagination at 100
6. Add webhook HMAC validation on intake routes
7. Plan DB migration (replaces in-memory store, enables encryption at rest)
