# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-10-05 — Initial Audit (OWASP-ASVS L2, SOC2-Type2 CC6.x/CC7.1/CC8.1)

### Architectural Reality
- **This is a workflow-engine MVP** — not a multi-tenant SaaS. There are NO users, NO authentication, NO authorization. The domain is work-item management (create, route, assess, approve, reject, dispatch).
- **In-memory store** — no database, no persistence. All data is lost on restart. This means "encryption at rest" controls are moot until a persistent store is added.
- **Sensitive fields** (email, password, token, secret, api_key) are NOT present in the domain model WorkItem. The `compliance.sensitive_fields` list is pre-populated from the config template and doesn't match this project's actual data model. Flag this in future runs — sensitive field checks are N/A unless a user-auth or credential system is added.

### Controls This Project Consistently Fails
1. **Authentication/Authorization (OWASP-ASVS V2/V4, SOC2 CC6.1/CC6.2/CC6.3)** — no auth layer at all. Every API endpoint is unauthenticated. This is the single biggest gap.
2. **Security Headers (OWASP-ASVS V14.4)** — no `helmet` or equivalent; CSP, HSTS, X-Frame-Options all missing.
3. **CORS (OWASP-ASVS V14.5)** — no CORS configuration; defaults to Express "allow all" behavior.
4. **Rate Limiting** — no rate limiting on any endpoint, including webhook intake routes.
5. **Audit Events (SOC2 CC7.1)** — login_attempt and permission_denied are permanently absent because there is no auth layer. data_export is absent because no export feature exists. state_transition is partially logged (structured log but not a dedicated audit event type).
6. **Pagination Cap** — `?limit=` query parameter is accepted without a maximum cap, allowing unbounded data fetches.
7. **GDPR Art. 17 Hard Delete** — only soft-delete exists; no hard purge mechanism for Right to Erasure.

### Controls That Pass or Are Non-Issues
- **No hardcoded secrets** in source code — credentials are all environment-variable driven.
- **Structured logging** — well implemented with pino/custom logger abstraction.
- **Prometheus metrics** — correctly implemented for domain operations.
- **Change history** — all state transitions tracked in changeHistory (satisfies SOC2 CC8.1).
- **Error handling** — stack traces go to logs only, not to HTTP responses (good).
- **Input validation** — enum fields validated; allowed-fields allowlist on PATCH.

### Framework Mapping Notes
- **OWASP-ASVS V6 (Cryptography)** — mostly N/A for this project's current scope. No sensitive PII in domain model. Becomes relevant if a user store or API key management is ever added.
- **GDPR** was not in `compliance.frameworks` config but is implied by the PII/sensitive_fields list. Flag to team leader: GDPR controls cannot be formally verified without an explicit GDPR entry in the config.
- **ISO27001** was referenced in the audit request but NOT listed in `security.config.yml compliance.frameworks`. Audit was scoped to what the config specifies (OWASP-ASVS L2 and SOC2-Type2).

### Webhook Security
- `/api/intake/zendesk` and `/api/intake/automated` have NO signature verification (no HMAC, no shared secret). Anyone who knows the endpoint URL can inject work items.
