# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-06-15 — Initial Audit (OWASP-ASVS L2 + SOC2-Type2)

### Controls This Codebase Consistently Fails
- **Authentication (V2.x, CC6.1, CC6.2):** The entire auth layer is absent. No middleware, no dependency in package.json. Every audit will fail these controls until a dedicated auth middleware PR lands.
- **Authorisation / RBAC (V4.x, CC6.3, CC8.1):** No role model exists anywhere in Source/. All workflow mutation endpoints (approve, reject, dispatch) are fully open.
- **Session Management (V3.x):** Entirely absent — flows directly from the auth gap.
- **TLS (V9.1.1):** Express is bound on plain HTTP; no Helmet, no HSTS. Likely handled by infra (reverse proxy) in production but not enforced in code.
- **Audit Event Coverage (CC7.1):** `login_attempt`, `permission_denied`, and `data_export` events do not exist. `state_transition` is partially logged (info level) but lacks actor identity and durability. Logging goes to stdout only — no persistent audit store.
- **Rate Limiting (V13.4.1):** No express-rate-limit or equivalent. Pagination `limit` param is unbounded.
- **HTTP Security Headers (V14.4.1):** Helmet not installed.

### Controls That Are Architectural Non-Issues for This Domain
- **V6.2.1 (Cryptographic randomness):** `uuid` v9 is used for all IDs — this is fine.
- **Sensitive field encryption at rest (V6.2.2 for PII fields email/password/token):** The WorkItem data model does NOT store email, password, token, secret, or api_key — the sensitive_fields list in security.config.yml does not overlap the data schema. If the schema evolves to include these, revisit encryption at rest.
- **Data retention for user PII (GDPR Art. 17):** Currently low risk as the data model holds operational metadata, not user PII. Watch for future features that add reporter/assignee user records.

### Framework Mapping Notes
- **CC8.1** maps well to "authorisation required before workflow state changes" — all five workflow mutation routes (route, assess, approve, reject, dispatch) fail this control.
- **CC7.1** partially maps to the existing Prometheus metrics + structured logger setup, but the control also explicitly requires audit event coverage — the partial logging of state_transition is insufficient on its own.
- The user asked about GDPR and ISO27001 in addition to the configured frameworks; those were noted where relevant (Art. 17 soft-delete gap, ISO27001 Annex A.9 access control) but the primary matrix uses only the configured frameworks (OWASP-ASVS L2, SOC2-Type2).

### Pass Rate Baseline
- First run overall pass rate: **~9%** (1 full pass out of 17 controls)
- Grade: **F** (below 60% minimum for Grade C)
- The two biggest levers to raise the score: ship auth middleware (closes 4–5 controls at once) + structured audit event pipeline (closes CC7.1, V7.2.1).
