# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-09-07 — OWASP-ASVS L2 / SOC2-Type2

### Architecture facts (critical for future runs)
- **No authentication or authorization layer exists** — every endpoint is fully public. This is the #1 blocker for OWASP-ASVS V2/V3/V4 and SOC2 CC6.x.
- **In-memory store only** — no database, no encryption at rest possible. Data lost on restart.
- **Backend dependencies are minimal**: express, prom-client, uuid, pino. No security libraries (helmet, cors, express-rate-limit, passport, jsonwebtoken, etc.).
- **Sensitive fields** (email, password, token, secret, api_key) do NOT appear in the WorkItem data model — they are defined in security.config.yml as fields-to-watch but currently absent. Mark as N/A unless a user/auth model is added.
- **Required audit events** (login_attempt, permission_denied, state_transition, data_export) are **not emitted** anywhere. The changeHistory system tracks state changes per work item but does not emit structured audit log events with these labels.
- `/metrics` endpoint (Prometheus) is publicly accessible — no auth guard.
- Intake webhook endpoints (`/api/intake/zendesk`, `/api/intake/automated`) have no HMAC/signature verification.
- `errorHandler.ts` logs `err.stack` to the server-side logger (safe — not returned to client).
- Pagination `limit` parameter has no maximum cap — potential DoS vector.
- Vite dev proxy uses plain HTTP to backend; no TLS enforced in any config.

### Controls this project consistently fails
- All OWASP-ASVS V2 (authentication), V3 (session), V4 (access control), V9 (TLS), V14.4/14.5 (security headers, CORS)
- SOC2 CC6.1, CC6.2, CC6.3 (logical access, provisioning, privileged access)
- SOC2 CC7.1 (audit logging — missing required events)

### Controls that pass or are N/A
- OWASP V7.4: Error handler does NOT leak stack traces to clients (PASS)
- OWASP V5.1: Basic required-field validation exists (PARTIAL PASS)
- OWASP V13.2: RESTful status codes and response patterns correct (PASS)
- SOC2 CC8.1: Workflow change management is the core domain feature (PASS)
- Sensitive field encryption: fields don't exist in data model yet (N/A)

### Framework mapping notes
- OWASP-ASVS Level 2 requires authentication at V2.1–V2.5 — none of these pass without an auth layer.
- SOC2 CC6.1 is the broadest blocker: it covers all logical access restrictions.
- GDPR is not in the configured frameworks but data retention/deletion is a future gap if user data is added.
