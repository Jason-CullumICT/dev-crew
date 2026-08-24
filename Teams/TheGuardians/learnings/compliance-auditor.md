# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-08-24 — Initial Audit (OWASP-ASVS L2, SOC2-Type2)

### Application Character
- **dev-crew Source App** is a work-item workflow engine with NO user-facing authentication layer.
- The data model (`WorkItem`) contains NO PII or sensitive fields (no email, password, token, secret, api_key). The sensitive_fields in security.config.yml do not appear anywhere in the codebase — this is an architectural non-issue for encryption at rest *in the current model*, but would become critical if user data is ever added.
- All storage is **in-memory only** (`Map<string, WorkItem>`) — there is no database, no disk persistence, and therefore no encrypted-at-rest surface. However, this means all data is lost on restart (availability risk).

### Controls This Project Consistently Fails
1. **Authentication entirely absent** — every API endpoint is open, no JWT/session/API-key mechanism exists. This causes cascading failures on CC6.1, CC6.2, CC6.3, OWASP V2, V3, V4.
2. **No HTTPS/TLS enforcement** — app runs on plain HTTP port 3001 with no redirect or HSTS.
3. **No security headers** — Helmet.js or equivalent is missing; no CSP, X-Frame-Options, X-Content-Type-Options.
4. **Webhook endpoints have no signature verification** — `/api/intake/zendesk` and `/api/intake/automated` accept arbitrary POST requests with no HMAC or shared-secret check.
5. **Missing required audit events** — `login_attempt`, `permission_denied`, `data_export` never fire because auth doesn't exist. `state_transition` is tracked in changeHistory but not emitted as a structured audit log event with the canonical event name.
6. **Metrics endpoint unauthenticated** — `GET /metrics` exposes Prometheus operational data without auth.
7. **No rate limiting** — no `express-rate-limit` or similar middleware anywhere in the chain.
8. **No hard delete / GDPR Art. 17** — soft-delete only; no mechanism to permanently erase records.

### Controls That Are Architecture Non-Issues For This Domain
- **Password hashing (OWASP V2.4)** — no password field exists in this codebase; N/A until user auth is added.
- **MFA (OWASP V2.8)** — same; no authentication layer exists at all, MFA is downstream of auth.
- **Sensitive field encryption** — no PII fields in the current WorkItem model; the sensitive_fields list in config is aspirational/future-proof.

### Framework Mapping Notes
- SOC2 CC8.1 asks about "change management controls." The WorkItem.changeHistory provides field-level audit trails for item mutations — this is a PARTIAL pass for operational change tracking but does not cover infrastructure/code change management.
- OWASP ASVS V9 (Communication Security) maps directly to the TLS gap — the entire backend is HTTP-only.
- OWASP ASVS V13.2 (RESTful Web Service) partially passes due to input validation on enum fields, but fails on rate limiting and webhook verification.
- GDPR Art. 17 (Right to Erasure) — soft delete only; non-compliant unless hard delete is added.
- ISO27001 A.9 (Access Control) — direct map to the missing authentication layer.
