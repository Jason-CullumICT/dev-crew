# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-10-26 — dev-crew Source App (OWASP-ASVS L2 + SOC2-Type2)

### Consistently Failing Controls

1. **Authentication completely absent** — No auth middleware, no JWT, no sessions. Every API endpoint is open to anonymous callers. This is the single biggest compliance blocker for OWASP-ASVS 2.x / 3.x / 4.x and SOC2 CC6.1/CC6.2/CC6.3.

2. **CORS, Helmet, and security headers not configured** — Express app has no `cors()`, no `helmet()`, no HSTS, no CSP. This fails OWASP-ASVS 14.4.x.

3. **No rate limiting** — All endpoints unlimited. Fails OWASP-ASVS 11.1.4 and SOC2 CC6.1.

4. **Required audit events missing** — `login_attempt` and `permission_denied` cannot be emitted because the auth layer does not exist. `data_export` event is never logged. `state_transition` IS partially covered by change-history entries.

5. **Pagination limit unbounded** — `?limit=<n>` accepts arbitrarily large values, enabling full enumeration in a single request. Fails OWASP-ASVS 4.2.2.

6. **HTTPS/TLS not enforced** — No TLS configuration; server listens on plain HTTP. Frontend Vite proxy also uses HTTP.

7. **Soft-delete only — no hard purge** — `DELETE` marks `item.deleted = true`; no endpoint or mechanism exists to permanently erase data. Relevant if the app ever handles PII.

### Controls That Pass

- Structured JSON logging (no console.log) — passes OWASP-ASVS 7.1.x
- Error handler returns generic message, not stack traces — passes OWASP-ASVS 7.4.1
- Enum-level input validation on all write endpoints — partial pass on OWASP-ASVS 5.x
- Prometheus metrics exposed at `/metrics` — SOC2 CC7.1 monitoring partially satisfied
- Change history on state transitions — SOC2 CC8.1 partial

### Framework Mapping Notes

- This application has no user model or login flow. OWASP-ASVS authentication controls (2.x) apply structurally — the absence of any auth is itself the gap.
- `compliance.sensitive_fields` (email, password, token, secret, api_key) are not present in the current WorkItem data model. If user management is added in future, encryption at rest and PII masking must be implemented from the start.
- SOC2 CC8.1 (Change Management) is partially addressed by the per-field `changeHistory` array on WorkItems, but there is no operator-facing audit trail for configuration changes.
