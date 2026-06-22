# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-06-22 — Initial Audit

### Codebase Characteristics
- **Stack:** Express (TypeScript) backend, React/Vite frontend, in-memory store
- **Domain:** Workflow engine for work item state management (no user auth, no PII model in shared types)
- **Dependencies:** `express`, `prom-client`, `uuid`, `pino` — zero security libraries

### Controls This Project Consistently Fails
1. **Authentication (ASVS V4.1.x, SOC2 CC6.1)** — No auth layer at all. This is the root cause of most other failures. All COMP-00x authentication/authorization findings cascade from this.
2. **CORS/Helmet (ASVS V14.x)** — No security middleware whatsoever in `app.ts`. Helmet and cors are not in dependencies.
3. **Rate Limiting (ASVS V13.1.1)** — No rate limiting installed or configured.
4. **Required Audit Events (SOC2 CC7.1)** — `login_attempt`, `permission_denied`, `data_export` will always be absent until auth/authz is added. `state_transition` events are logged but not as a named event type.
5. **TLS Enforcement (ASVS V9.1.1)** — App binds plain HTTP; TLS is expected at infra layer but not enforced by the app.

### Controls That Are Architectural Non-Issues for This Domain
- **V2.1.x (Password Storage)** — No user accounts or password fields in the WorkItem model. The sensitive_fields in `security.config.yml` (`email`, `password`, `token`, `api_key`) do not exist in the current data model. Flag as N/A unless auth is added.
- **V3.x (Session Management)** — No sessions; flag as N/A unless auth is added.
- **V12.x (File Upload)** — No file handling in this application; mark as N/A.

### Framework Mapping Notes
- SOC2 CC6.1 is extremely broad — maps to auth, CORS, TLS, and Helmet all at once. One control, many findings.
- OWASP-ASVS V7.1.x (Log format) is the only category this app passes — structured JSON logging is well implemented.
- SOC2 CC8.1 (Change Management) is partially satisfied by the domain `changeHistory` mechanism, but lacks actor attribution (hard-coded strings like `"manual-override"` instead of authenticated user identity).

### Pagination / Input Validation
- `parseInt` used without NaN guard on `page` and `limit` query params in both `workItems.ts` and `dashboard.ts`. Consistent pattern.
- No maximum cap on `limit` query param — COMP-005/COMP-016.

### Webhook Intake
- Both `/api/intake/zendesk` and `/api/intake/automated` are unauthenticated and unsigned. High-risk ingestion points.

### Soft Delete vs. GDPR
- `softDelete` sets `item.deleted = true` but never purges data. No hard-delete path exists. This is a recurring gap for GDPR Art. 17 compliance.

### Metrics Endpoint
- `/metrics` is registered publicly without auth in `app.ts`. Always check this endpoint for unauthenticated exposure.
