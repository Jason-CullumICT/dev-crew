---

## Compliance Audit Report — dev-crew Source App

**Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1–CC6.3, CC7.1, CC8.1) · GDPR · ISO27001  
**Date:** 2026-11-23 | **Auditor:** compliance_auditor (TheGuardians)

---

### COMP-001: No Authentication System — All API Endpoints Unauthenticated

- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · SOC2 CC6.2 · OWASP-ASVS V2.1 · ISO27001 A.9.4
- **File/Component:** `Source/Backend/src/app.ts` — all route registrations; `Source/Backend/src/middleware/` (single file: errorHandler only)
- **Observation:** The Express application registers six route namespaces (`/api/work-items`, `/api/dashboard`, `/api/intake`, `/metrics`) with **zero authentication middleware**. There is no JWT validation, no session management, no API-key gate — every endpoint is world-accessible. The only middleware present is a debug request logger and an error handler. Any actor with network access can read, create, modify, approve, dispatch, or soft-delete any work item without credentials.
- **Remediation:**
  1. Add an authentication middleware (JWT Bearer or session) applied globally before all `/api/*` routes in `app.ts`.
  2. Install and configure `helmet` for security headers and enforce `Authorization` header validation.
  3. Return `401 Unauthorized` for all unauthenticated requests and log the attempt as a `login_attempt` audit event.

---

### COMP-002: No Role-Based Access Control (RBAC)

- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 · OWASP-ASVS V4.1 · ISO27001 A.9.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts` — `/approve`, `/reject`, `/dispatch` endpoints; `Source/Backend/src/routes/workItems.ts`
- **Observation:** Sensitive state-transition endpoints (`/approve`, `/reject`, `/dispatch`) require no authorisation check beyond finding the item by ID. Any caller can approve, reject, or dispatch any work item. There is no concept of users, roles, or permissions anywhere in the codebase. OWASP-ASVS L2 V4.1 requires that all pages enforce access control rules, and CC6.3 requires that access is restricted to authorised users based on job responsibility.
- **Remediation:**
  1. Define roles (e.g., `submitter`, `reviewer`, `admin`, `dispatcher`) with associated permission sets.
  2. Apply role guards to sensitive endpoints — only `reviewer`/`admin` may approve/reject; only `dispatcher`/`admin` may dispatch.
  3. Log `permission_denied` events when a role check fails (also satisfies COMP-004).

---

### COMP-003: Required Audit Events Absent From Logging Layer

- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · ISO27001 A.12.4 · OWASP-ASVS V7.2
- **File/Component:** `Source/Backend/src/utils/logger.ts` — structured logger; all route handlers
- **Observation:** `security.config.yml` mandates four audit event types: `login_attempt`, `permission_denied`, `state_transition`, `data_export`. Audit:
  - **`login_attempt`** — Never emitted. No login flow exists.
  - **`permission_denied`** — Never emitted. No access control checks exist.
  - **`state_transition`** — Partially present. `workflow.ts` logs `'Work item approved/rejected/dispatched'` but does not use a structured `event: state_transition` field, making it unfilterable as a compliance event category.
  - **`data_export`** — Never emitted. No export functionality exists and no log event defined.
- **Remediation:**
  1. Add a formal `auditLog()` helper that emits a log entry with `event`, `actorId`, `resource`, `resourceId`, `outcome`, and `timestamp` fields.
  2. Emit `state_transition` events for every status change with the structured audit helper.
  3. When auth is added (COMP-001), emit `login_attempt` (success/failure) and `permission_denied` events through the same helper.
  4. When any list/export endpoint returns data, emit `data_export`.

---

### COMP-004: No Security Headers or CORS Policy

- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4 · ISO27001 A.14.1
- **File/Component:** `Source/Backend/src/app.ts`; `Source/Backend/package.json` (no `helmet` dependency)
- **Observation:** The Express app does not configure any HTTP security headers. Missing:
  - `helmet` — no `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` (HSTS), `Content-Security-Policy`, `X-XSS-Protection`, `Referrer-Policy`
  - No CORS policy — the backend accepts requests from any origin
  - No HSTS — TLS/HTTPS is not enforced at the application layer
  Additionally, `helmet` and `cors` are absent from `package.json` dependencies.
- **Remediation:**
  1. `npm install helmet cors` in `Source/Backend`.
  2. Add `app.use(helmet())` and `app.use(cors({ origin: process.env.ALLOWED_ORIGINS }))` early in `app.ts`.
  3. Set `Strict-Transport-Security` with `includeSubDomains` and `preload` for production.

---

### COMP-005: Intake Webhooks Have No Origin Verification (No HMAC Signature)

- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS V1.6 · ISO27001 A.14.2
- **File/Component:** `Source/Backend/src/routes/intake.ts` — `/api/intake/zendesk`, `/api/intake/automated`
- **Observation:** The Zendesk and automated intake webhooks accept any POST request without verifying the caller's identity. Zendesk signs webhooks with an HMAC-SHA256 header (`X-Zendesk-Webhook-Signature`). The `/api/intake/automated` endpoint has no authentication at all. Any external actor can inject arbitrary work items into the system by hitting these endpoints.
- **Remediation:**
  1. For `/zendesk`: validate the `X-Zendesk-Webhook-Signature` header against `ZENDESK_WEBHOOK_SECRET` (env var) using HMAC-SHA256 before processing the payload.
  2. For `/automated`: require a pre-shared bearer token or mutual TLS.
  3. Return `401` and log a `permission_denied` event on signature failure.

---

### COMP-006: Prometheus /metrics Endpoint Is Unauthenticated

- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · ISO27001 A.9.4
- **File/Component:** `Source/Backend/src/app.ts` — `GET /metrics`
- **Observation:** The Prometheus metrics endpoint at `GET /metrics` is fully open with no authentication. This endpoint exposes internal operational telemetry: request counts, work item volumes, dispatch team assignments, dependency graph events. While no PII is exposed, this data could aid a threat actor in reconnaissance (understanding system structure and traffic patterns).
- **Remediation:**
  1. Gate `/metrics` with IP allowlisting (allow only Prometheus scraper IP) or a bearer token check.
  2. Alternatively, move Prometheus metrics to a separate internal port not exposed publicly.

---

### COMP-007: No Rate Limiting on Any Endpoint

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V11.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` — all routes
- **Observation:** No rate limiting middleware is applied to any endpoint. This exposes the application to brute-force, enumeration, and denial-of-service attacks. OWASP-ASVS L2 V11.1.6 requires that the application protects against automated attacks including excessive account operations.
- **Remediation:**
  1. `npm install express-rate-limit` in `Source/Backend`.
  2. Apply a global rate limit (`app.use(rateLimit({ windowMs: 15*60*1000, max: 300 }))`).
  3. Apply stricter limits to state-transition endpoints (`/approve`, `/reject`, `/dispatch`): max 30 per minute.

---

### COMP-008: Soft-Delete Does Not Satisfy GDPR Right to Erasure (Art. 17)

- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 · ISO27001 A.18.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` — `softDelete()` function
- **Observation:** `softDelete()` sets `item.deleted = true` and retains the full item (including all fields and change history) in the in-memory Map. The item is excluded from list responses but remains fully recoverable by ID internally. If work items ever contain personal data (description fields, assignee names, reporter info), this does not constitute erasure under GDPR Article 17. Additionally, there is no data retention policy enforcing actual purge after a retention period.
- **Remediation:**
  1. Implement a `hardDelete(id)` function that removes the item from the Map entirely.
  2. For GDPR erasure requests, scrub PII fields (nullify/redact description, title) or perform hard delete depending on audit-trail requirements.
  3. Define a retention policy (e.g., 90-day auto-purge of soft-deleted items) and implement a scheduled cleanup.

---

### COMP-009: No TLS/HTTPS Enforcement at Application Layer

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V9.1 · ISO27001 A.14.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`; deployment configuration (not found)
- **Observation:** The application starts on plain HTTP (`app.listen(PORT, ...)`). There is no redirect from HTTP to HTTPS, no TLS termination at the app level, and no HSTS enforcement. Transit encryption cannot be confirmed as mandatory from code alone. OWASP-ASVS V9.1.1 requires TLS for all communications containing sensitive data.
- **Remediation:**
  1. Enforce TLS at the reverse proxy / load balancer level (nginx, AWS ALB) with HTTPS-only configuration.
  2. Add HSTS header via `helmet` (COMP-004 remediation covers this).
  3. Document TLS configuration in infrastructure-as-code.

---

### COMP-010: Change History Actor is Hardcoded as `'user'` / `'manual-override'`

- **Severity:** Low
- **Framework/Control:** SOC2 CC7.1 · ISO27001 A.12.4
- **File/Component:** `Source/Backend/src/routes/workItems.ts:132` — `trackUpdates(item, updates, 'user', 'Manual update')`; `Source/Backend/src/routes/workflow.ts:113` — `buildChangeEntry(..., 'manual-override', ...)`
- **Observation:** All change history entries record the actor as the literal string `'user'` or `'manual-override'` rather than the authenticated user's identity. Without a real actor ID, the audit trail cannot answer "who approved this work item?" — a core SOC2 CC7.1 requirement for accountability.
- **Remediation:**
  1. Once authentication is added (COMP-001), thread the authenticated user's ID (`req.user.id`) into all `buildChangeEntry()` and `trackUpdates()` calls.
  2. Update the `ChangeHistoryEntry` type to require a non-anonymous actor field.

---

## Compliance Matrix

| Framework | Control | Description | Status | Notes |
|-----------|---------|-------------|--------|-------|
| **SOC2 Type2** | CC6.1 | Logical access controls | ❌ FAIL | Zero auth on all endpoints |
| **SOC2 Type2** | CC6.2 | User authentication management | ❌ FAIL | No login/user system |
| **SOC2 Type2** | CC6.3 | Role-based access restrictions | ❌ FAIL | No RBAC |
| **SOC2 Type2** | CC7.1 | Detection / audit logging | ⚠️ PARTIAL | Logger exists; 3/4 required audit events absent |
| **SOC2 Type2** | CC8.1 | Change management | ⚠️ PARTIAL | changeHistory tracking present; actors hardcoded |
| **OWASP-ASVS L2** | V2 (Authentication) | Authentication controls | ❌ FAIL | No auth system at all |
| **OWASP-ASVS L2** | V4 (Access Control) | Access control enforcement | ❌ FAIL | No access control |
| **OWASP-ASVS L2** | V7 (Error/Logging) | Error handling & logging | ⚠️ PARTIAL | Structured logs present; audit events missing |
| **OWASP-ASVS L2** | V9 (Communications) | TLS/HTTPS | ❌ FAIL | HTTP only; no security headers |
| **OWASP-ASVS L2** | V11 (Business Logic) | Rate limiting / brute-force protection | ❌ FAIL | No rate limiting |
| **OWASP-ASVS L2** | V14 (Config) | Security HTTP headers | ❌ FAIL | No helmet/CORS |
| **GDPR** | Art. 17 | Right to Erasure | ❌ FAIL | Soft-delete retains all data |
| **ISO27001** | A.9.1 | Access control policy | ❌ FAIL | No access control |
| **ISO27001** | A.12.4 | Audit logging | ⚠️ PARTIAL | Infrastructure exists; events incomplete |
| **ISO27001** | A.14.1 | Security in app development | ❌ FAIL | No TLS, no security headers |
| **ISO27001** | A.18.1 | Data retention | ❌ FAIL | No retention policy |

**Controls Passed (full):** 0 | **Controls Partial:** 3 | **Controls Failed:** 13  
**Compliance Pass Rate: ~19%** (3 partials counted as 0.5 each = 1.5/16)

---

## Summary

The application has a well-structured logging foundation and a sensible data mutation audit trail (`changeHistory`), but it **entirely lacks an authentication and authorisation layer**. Every API endpoint is world-accessible with no credentials required. This single architectural gap cascades into failures across SOC2 CC6.1–CC6.3, OWASP-ASVS V2/V4, and ISO27001 A.9.

**Priority remediation order:**
1. 🔴 **COMP-001** — Implement authentication (blocks CC6.1, CC6.2, all audit-actor issues)
2. 🔴 **COMP-002** — Implement RBAC (blocks CC6.3, V4)
3. 🔴 **COMP-003** — Implement structured audit events (login_attempt, permission_denied, state_transition, data_export)
4. 🔴 **COMP-004** — Add `helmet` + CORS (security headers, HSTS)
5. 🔴 **COMP-005** — Add HMAC verification to intake webhooks
6. 🟡 **COMP-006** — Gate `/metrics` endpoint
7. 🟡 **COMP-007** — Add rate limiting
8. 🟡 **COMP-008** — Implement GDPR-compliant data erasure
9. 🟡 **COMP-009** — Enforce TLS at infrastructure level and document
10. 🟢 **COMP-010** — Wire actor identity into change history once auth exists
