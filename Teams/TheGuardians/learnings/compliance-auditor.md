# Compliance Auditor — Learnings

<!-- Updated after each Guardian run. Record which controls this project consistently fails, which frameworks are actually in scope, gaps found on prior runs. -->

## Run: 2026-11-23 — SOC2/GDPR/ISO27001/OWASP-ASVS L2 Audit

### Architecture Context
- **dev-crew Source App** is a workflow management backend (Express + TypeScript, in-memory store) with a React frontend.
- No authentication layer exists at all — the entire API is open.
- Data store is in-memory (Map); no persistent database, so encryption-at-rest and GDPR retention policies are moot for now but architecturally absent.

### Controls That Consistently Fail This Codebase
- **Authentication (OWASP-ASVS V2, SOC2 CC6.1/CC6.2)**: Structurally absent. No JWT, no session, no login endpoint. This is the highest-priority gap.
- **Access Control (OWASP-ASVS V4, SOC2 CC6.3)**: No RBAC or ABAC. Every endpoint is world-readable/writable.
- **Required Audit Events**: `login_attempt`, `permission_denied`, `data_export` are never logged because those flows don't exist.
- **Security Headers**: Helmet.js or equivalent not installed; no CORS policy, CSP, HSTS.
- **Rate Limiting**: No rate limiting on any endpoint.

### Controls That Partially Pass
- **CC7.1 (Monitoring)**: Structured JSON logger exists (`utils/logger.ts`) and Prometheus metrics are implemented. Missing: required audit event categories.
- **CC8.1 (Change Management)**: `changeHistory` tracking on WorkItems provides a reasonable audit trail for data mutations.

### Framework Mapping Notes
- For this project domain (workflow management, no PII/payments), GDPR Art. 32 and ISO27001 A.9 (access control) are the most relevant controls.
- The `sensitive_fields` list in `security.config.yml` (email, password, token, secret, api_key) are NOT present in the domain model (WorkItem). The app does not currently handle user credentials. If authentication is added, these controls will need immediate implementation.
- The `/metrics` endpoint exposes Prometheus operational data with no auth — classify as Medium risk (internal ops data, not PII).
- Intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) have no HMAC signature verification — classify as High risk (unauthenticated data injection).

### Architectural Non-Issues For This Domain
- Encryption of `WorkItem` fields at rest: WorkItems contain no PII from `sensitive_fields` list currently.
- MFA: Moot until authentication layer is introduced.
