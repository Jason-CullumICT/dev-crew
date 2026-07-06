---

## Compliance Audit Report — TheGuardians
**Date:** 2026-07-06 | **Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1–CC8.1) | **App:** dev-crew Source App (Backend + Frontend)

---

### COMP-001: No Authentication Mechanism on Any Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1, CC6.2 · OWASP-ASVS V2.1.1, V4.1.1
- **File/Component:** `Source/Backend/src/app.ts` — all route registrations
- **Observation:** The entire Express application has zero authentication middleware. Every API endpoint (`/api/work-items`, `/api/work-items/:id/approve`, `/api/work-items/:id/dispatch`, `/api/intake/*`, `/api/dashboard/*`, `/metrics`) is reachable by any unauthenticated caller without a token, session, or API key. There is no `passport`, `express-jwt`, API-key middleware, or equivalent in `package.json` or `app.ts`. The `admin@example.com / admin123` credentials in `CLAUDE.md` refer to the orchestrator dashboard (port 9800), not this app.
- **Remediation:** Add authentication middleware (JWT bearer or API-key) as the first protected middleware layer. For service-to-service calls (intake webhooks, dashboard reads), use API keys with scoped permissions. For human-facing routes (approve, reject, dispatch), use JWT with an identity provider. All routes except `/health` should require authentication.

---

### COMP-002: No Authorization / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 · OWASP-ASVS V4.1.1, V4.1.2, V4.1.3
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `workItems.ts`
- **Observation:** Once COMP-001 is addressed, there is still no RBAC layer. Any authenticated caller could perform any action: approve, reject, dispatch, soft-delete. The principle of least privilege is entirely absent. A Zendesk webhook caller should not be able to approve items; a read-only viewer should not be able to dispatch. The `trackUpdates` service records `'user'` as a hardcoded agent string rather than the actual identity.
- **Remediation:** Define roles (e.g., `viewer`, `editor`, `approver`, `admin`, `service-account`) and apply middleware guards per route. Reject requests where the caller's role lacks the required permission, and emit a `permission_denied` audit event on rejection.

---

### COMP-003: Required Audit Events Absent from Logging Layer
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.1.2
- **File/Component:** All route handlers and services — no file contains an audit event emitter
- **Observation:** All four `required_audit_events` from `security.config.yml` are missing:
  - **`login_attempt`** — No auth, so no login; this event cannot exist until COMP-001 is resolved.
  - **`permission_denied`** — No authz, so no denial; blocked until COMP-002 is resolved.
  - **`state_transition`** — The `changeHistory` array on `WorkItem` records field mutations, but this is application state, not a security audit log. No structured `event_type: state_transition` entry is emitted to the logger with actor, resource, old status, new status, and outcome.
  - **`data_export`** — No export feature exists, and no event would fire if it did.

  Current logging (`logger.info({ msg: 'Work item routed', ... })`) serves operational observability but not compliance audit trails.
- **Remediation:** Create a dedicated `auditLogger` module that emits structured events with fields: `event_type`, `actor`, `resource_type`, `resource_id`, `outcome`, `timestamp`. Wire `state_transition` events into every workflow state change in `workflow.ts` and `router.ts`. Add `permission_denied` events to the future auth middleware. Ensure audit logs are append-only and shipped to an immutable sink (e.g., separate log stream, SIEM).

---

### COMP-004: No HTTP Security Headers (Helmet Missing)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.1, V14.4.2, V14.4.3, V14.4.4, V14.4.5, V14.4.6
- **File/Component:** `Source/Backend/src/app.ts` · `Source/Backend/package.json`
- **Observation:** The `helmet` package is absent from `package.json`. The application sends no security-relevant response headers: no `X-Content-Type-Options: nosniff`, no `X-Frame-Options`, no `Content-Security-Policy`, no `Strict-Transport-Security`, no `Referrer-Policy`, no `Permissions-Policy`. Any response to the frontend is exposed to clickjacking, MIME-sniffing, and protocol downgrade attacks.
- **Remediation:** `npm install helmet` and add `app.use(helmet())` as the first middleware in `app.ts`. Configure CSP to disallow `eval` and restrict origins to the known frontend domain.

---

### COMP-005: Intake Webhooks Accept Unsigned Payloads
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V8.3.4 · SOC2 CC8.1
- **File/Component:** `Source/Backend/src/routes/intake.ts` (lines 11, 34)
- **Observation:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept POST requests from any caller without verifying an HMAC-SHA256 signature. A malicious actor with network access can create arbitrary work items by POSTing to these endpoints, potentially flooding the backlog or injecting malicious titles/descriptions that the frontend will render.
- **Remediation:** For Zendesk, verify the `X-Zendesk-Webhook-Signature-V3` header against a shared secret stored in `ZENDESK_WEBHOOK_SECRET`. For automated intake, require an API key or HMAC secret in `AUTOMATED_INTAKE_SECRET`. Reject (HTTP 401) any request that fails signature verification, and log the rejection.

---

### COMP-006: `/metrics` Endpoint Unauthenticated — Information Disclosure
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS V4.1.1
- **File/Component:** `Source/Backend/src/app.ts` (line 34)
- **Observation:** The Prometheus `/metrics` endpoint is exposed without authentication. It reveals system internals: total work items created by source/type, dispatch counts by team, assessment verdict distribution, cycle detection event rates, and Node.js runtime metrics. This is operational intelligence that should be restricted to the monitoring stack.
- **Remediation:** Restrict `/metrics` to a localhost binding or an internal network CIDR, or require a bearer token (`METRICS_BEARER_TOKEN` env var). The simplest Express pattern is to check `req.ip === '127.0.0.1'` and reject externally-originating requests.

---

### COMP-007: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.2.1 · SOC2 CC6.1 (availability)
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** `express-rate-limit` (or equivalent) is absent. Every endpoint — including the intake webhooks and state-transition endpoints — has no request throttling. An attacker or misconfigured system can flood the in-memory store or trigger thousands of state transitions per second, degrading availability and polluting audit history.
- **Remediation:** Install `express-rate-limit` and apply a default limiter (e.g., 100 req/min per IP) globally, with a tighter limit (e.g., 20 req/min) on intake and workflow mutation endpoints.

---

### COMP-008: No CORS Policy — Permissive Cross-Origin Behaviour
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.5.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The `cors` package is absent and no CORS headers are set. Without an explicit `Access-Control-Allow-Origin` policy, the backend relies on browser defaults which may allow cross-origin reads from attacker-controlled pages, particularly since there is no authentication (COMP-001) to protect data.
- **Remediation:** Install `cors` and configure an explicit allowlist: `origin: ['http://localhost:5173', 'https://<production-domain>']`. Deny credentials sharing until authentication is implemented.

---

### COMP-009: Error Messages from Route Handlers Expose Internal Details
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V7.4.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (lines 62, 89, 139, 206, 294, 349, 369)
- **Observation:** Every `catch` block in `workflow.ts` extracts the raw error message via `err instanceof Error ? err.message : 'Internal server error'` and sends it directly to the client in `res.status(500).json({ error: message })`. If a lower-layer function throws an error containing a file path, internal class name, or query detail, that information reaches the caller verbatim. The global `errorHandler` correctly returns a generic message, but these per-route catches bypass it.
- **Remediation:** Replace per-route `catch` blocks with a pattern that logs the full error internally and returns a generic `{ error: 'Internal server error' }` for unexpected 500-level errors. Only intentional business-rule rejections (4xx) should include descriptive messages.

---

### COMP-010: TLS/HTTPS Not Enforced at Application Layer
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V9.1.1 · SOC2 CC6.7
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Frontend/vite.config.ts`
- **Observation:** No TLS configuration exists in the Express application. The frontend Vite proxy (`server.proxy: { '/api': 'http://localhost:3001' }`) uses plain HTTP. No `Strict-Transport-Security` header is set (see COMP-004). There is no documented TLS-termination proxy in the `Source/` tree. In production, all traffic between browser → frontend → backend would be unencrypted unless a reverse proxy is configured externally.
- **Remediation:** Add `Strict-Transport-Security` via helmet. Document the TLS termination boundary in `CLAUDE.md`. In the Vite production build configuration, ensure `VITE_API_BASE_URL` points to an `https://` origin.

---

### COMP-011: No Data Encryption at Rest — No Persistence Layer
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V6.2.1 · SOC2 CC6.1 · GDPR Art. 32
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All data is held in a JavaScript `Map` in process memory. There is no persistent storage. While the absence of a disk layer means classical "encryption at rest" controls don't apply today, it also means all data is irrecoverably lost on process restart. Any migration to a persistent store would land without encryption controls unless planned now.
- **Remediation:** Before adding persistence: require database-level encryption (e.g., PostgreSQL TDE or AES-256-CBC column encryption for sensitive fields) as a migration acceptance criterion. Document this in the `Specifications/` architecture decision record.

---

### COMP-012: No GDPR Hard-Delete Capability
- **Severity:** Low
- **Framework/Control:** GDPR Art. 17 (Right to Erasure)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (line 78), `Source/Backend/src/routes/workItems.ts` (line 141)
- **Observation:** The `DELETE /api/work-items/:id` endpoint performs a soft delete only — it sets `item.deleted = true` but retains the record in the in-memory Map. There is no `purge` or hard-delete endpoint. When persistence is added, soft-deleted records will remain in the database indefinitely. The current data model does not store user PII, but any future addition of user-linked fields (e.g., `createdBy`, `assignee.email`) would require a compliant erasure path.
- **Remediation:** Implement a `POST /api/work-items/:id/purge` endpoint (admin-role only) that physically removes the record. Define a data retention schedule and document the erasure SLA.

---

### COMP-013: `err.stack` Logged at Error Level — Path Leakage in Aggregated Logs
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V7.1.2
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts` (line 6)
- **Observation:** `logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack })` logs the full stack trace at `ERROR` level unconditionally. Stack traces contain absolute server filesystem paths (e.g., `/workspace/Source/Backend/src/...`). In environments where logs are shipped to a log aggregator accessible beyond the operations team, this constitutes an information disclosure of the server's directory structure.
- **Remediation:** Log stack traces at `DEBUG` level only (or behind a `LOG_LEVEL=debug` gate). At `ERROR` level, log only `err.message`. Sanitize stack paths in production using a log-scrubbing middleware.

---

## Compliance Matrix

| Control ID | Framework | Area | Status | Finding |
|---|---|---|---|---|
| V4.1.1 | OWASP-ASVS L2 | Access Control Enforcement | ❌ FAIL | COMP-001 / COMP-002 |
| V4.1.2 | OWASP-ASVS L2 | Attribute-Level Access | ❌ FAIL | COMP-002 |
| V4.1.3 | OWASP-ASVS L2 | Principle of Least Privilege | ❌ FAIL | COMP-002 |
| V2.1.x | OWASP-ASVS L2 | Password/Auth Management | ❌ FAIL | COMP-001 |
| V3.7.1 | OWASP-ASVS L2 | Session Management | ❌ FAIL | COMP-001 |
| V7.1.2 | OWASP-ASVS L2 | Security Event Logging | ❌ FAIL | COMP-003 |
| V7.4.1 | OWASP-ASVS L2 | Generic Client Error Messages | ✅ PASS | Errorhandler returns generic 500 |
| V8.3.4 | OWASP-ASVS L2 | Webhook Payload Integrity | ❌ FAIL | COMP-005 |
| V9.1.1 | OWASP-ASVS L2 | TLS for All Communications | ❌ FAIL | COMP-010 |
| V6.2.1 | OWASP-ASVS L2 | Stored Cryptography | ⚠️ N/A¹ | COMP-011 |
| V14.4.1 | OWASP-ASVS L2 | HTTP Security Headers | ❌ FAIL | COMP-004 |
| V14.4.2 | OWASP-ASVS L2 | Content-Type Header Set | ✅ PASS | Express json() sets automatically |
| V14.5.3 | OWASP-ASVS L2 | CORS Allowlist Policy | ❌ FAIL | COMP-008 |
| V14.4.x | OWASP-ASVS L2 | Rate Limiting Controls | ❌ FAIL | COMP-007 |
| **CC6.1** | **SOC2-Type2** | Logical & Physical Access | ❌ **FAIL** | COMP-001, COMP-006 |
| **CC6.2** | **SOC2-Type2** | Authentication | ❌ **FAIL** | COMP-001 |
| **CC6.3** | **SOC2-Type2** | Access Restriction | ❌ **FAIL** | COMP-002 |
| **CC7.1** | **SOC2-Type2** | System Monitoring | ⚠️ **PARTIAL** | Prometheus metrics ✅; security event logs ❌ (COMP-003) |
| **CC8.1** | **SOC2-Type2** | Change Management | ⚠️ **PARTIAL** | `changeHistory` on WorkItems ✅; webhook integrity ❌ (COMP-005) |

> ¹ *N/A today (in-memory store, no disk) but must be addressed before any persistence layer is added.*

**Summary: 2 PASS · 2 PARTIAL · 11 FAIL out of 15 assessed controls → 13% pass rate**

Under the project's grading rubric (`security.config.yml`), this is **Grade D** (no critical findings, but compliance pass rate is below all thresholds A–C, and the number of High severity findings exceeds Grade B limits).

---

### Priority Remediation Path

| Priority | Action | Controls Unlocked |
|---|---|---|
| 🔴 1 | Add `helmet()` middleware (5 min) | V14.4.x (6 controls immediately) |
| 🔴 2 | Add `cors()` with allowlist | V14.5.3 |
| 🔴 3 | Implement authentication middleware (JWT/API-key) | CC6.1, CC6.2, V2.x, V3.x, V4.1.1 |
| 🔴 4 | Implement RBAC middleware | CC6.3, V4.1.x |
| 🟡 5 | Add dedicated audit logger + wire `state_transition` events | CC7.1, V7.1.2 |
| 🟡 6 | Add HMAC signature verification to intake webhooks | CC8.1, V8.3.4 |
| 🟡 7 | Protect `/metrics` endpoint | CC6.1 |
| 🟡 8 | Add `express-rate-limit` | V4.2.1 |
| 🟢 9 | Implement hard-delete / erasure endpoint | GDPR Art. 17 |
| 🟢 10 | Restrict stack traces to DEBUG level | V7.1.2 (partial) |
