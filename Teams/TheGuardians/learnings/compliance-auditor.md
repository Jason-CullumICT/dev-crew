# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-08-31 — Initial Baseline Audit (OWASP-ASVS L2, SOC2-Type2 CC6.1–CC8.1)

### Domain Summary
`dev-crew Source App` is a workflow engine backend (Express/TypeScript) with a React frontend. It manages work items through a state machine (backlog → proposed → reviewing → approved → in-progress, etc.). **It has no user-facing authentication layer at all** — this is the single most important architectural fact for compliance.

### Controls This Project Consistently Fails

1. **Authentication (ALL frameworks)** — No authentication middleware exists on any route. Every API endpoint is fully open. This is not a misconfiguration; authentication was simply never implemented.

2. **Session Management (OWASP-ASVS V3, SOC2 CC6.2)** — No sessions, cookies, or tokens exist. Moot given no auth, but must be recorded as a gap.

3. **Role-Based Access Control (SOC2 CC6.3, OWASP-ASVS V4)** — Approve/reject/dispatch are privilege-sensitive state transitions but are unprotected.

4. **TLS/HTTPS Enforcement (OWASP-ASVS V9.1)** — Express listens on HTTP only. Vite dev proxy uses HTTP. No TLS anywhere.

5. **Security Headers (OWASP-ASVS V14.4)** — No `helmet` middleware; CSP, X-Frame-Options, HSTS all absent.

6. **Webhook Signature Verification (OWASP-ASVS V1.6 / SOC2 CC6.1)** — `/api/intake/zendesk` and `/api/intake/automated` accept payloads from any source without HMAC verification.

7. **Rate Limiting (OWASP-ASVS V4.2.2)** — No rate limiting on any endpoint.

8. **Encryption at Rest** — In-memory store only (JavaScript Map). No database, no encryption.

9. **Audit Log Actor Identity (SOC2 CC7.1)** — Structured logging exists but never captures a requester identity (user ID, IP). Actor is hardcoded as "user" or "system".

10. **Required Audit Events** — `login_attempt` and `permission_denied` are impossible to emit (no auth layer). `data_export` endpoint does not exist.

11. **Right to Erasure / Hard Delete (GDPR Art. 17)** — Only soft-delete (`deleted: true` flag). No permanent data deletion capability.

### Controls That Pass (or Are Non-Issues for This Domain)

- **Sensitive field exposure in logs** — The 5 sensitive fields (`email`, `password`, `token`, `secret`, `api_key`) do not appear in the work-item data model. No PII is logged.
- **Error messages to client** — Generic "Internal server error" is returned; stack traces are NOT sent to clients (only logged server-side). ✅
- **Structured logging** — JSON structured logging is implemented correctly. ✅
- **Change history (CC8.1)** — Work item change history is tracked in the data model. ✅
- **Prometheus metrics** — Operational metrics exposed at `/metrics`. ✅
- **Input validation** — Enum fields are validated on write; unknown enum values are rejected with 400. ✅
- **Soft delete vs. hard access** — `findById` filters `deleted` items. ✅

### Framework Mapping Notes

- **SOC2 CC8.1** (change management) passes at the domain level — change history is tracked. However it fails at the infrastructure level because the persistent audit trail doesn't exist (in-memory only).
- **OWASP-ASVS L2 V7** (error handling) is partially met — client responses are safe, but `err.stack` is emitted to server logs which is acceptable if log access is controlled. Mark as PARTIAL.
- **Sensitive fields from config** (`email`, `password`, `token`, `secret`, `api_key`) are not present in the current data model. These were likely added speculatively. Flag as "N/A for current domain model" unless the app scope expands.
- `pino` is listed as a production dependency in `package.json` but is not imported anywhere — the logger is a custom `process.stdout.write` implementation. The unused dependency should be removed.

### Recommended Priority Order for Remediation

1. Add authentication middleware (JWT / API key at minimum) — gates all other access controls
2. Add authorization middleware (role check on approve/reject/dispatch)
3. Add webhook HMAC verification on intake routes
4. Add `helmet` for security headers
5. Add rate limiting (`express-rate-limit`)
6. Enforce HTTPS at the infrastructure level (reverse proxy or Node HTTPS server)
7. Add structured actor identity to all log entries (inject from auth context)
8. Implement `login_attempt` and `permission_denied` audit log events
9. Implement hard delete endpoint for GDPR Art. 17 compliance
10. Protect `/metrics` endpoint (should require internal network or bearer token)
