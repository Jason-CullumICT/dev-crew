# Compliance Audit Report — dev-crew Source App
**Date:** 2026-11-09  
**Auditor:** compliance_auditor (TheGuardians)  
**Frameworks:** OWASP-ASVS L2, SOC2-Type2, GDPR, ISO 27001  
**Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

## Executive Summary

The dev-crew Source App is a workflow management engine that routes, assesses, and dispatches work items through a state machine. The application is built on Express.js (backend) and React (frontend) with an **in-memory data store** (no persistent database).

**Critical finding:** The application has **no authentication, no authorisation, and no security headers**. All 10 API endpoints are fully open to any network caller. No sensitive fields (as defined in `security.config.yml`) are present in the data model, but the absence of access controls means all business data is unprotected.

**Overall pass rate: 29% (4 / 14 audited controls pass).**  
Grade threshold per `security.config.yml` grading scale: **F / D** (critical gaps, well below 60% pass rate floor for grade C).

---

## Findings

### COMP-001: No Authentication Layer
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1.1 (Authentication), SOC2 CC6.1, ISO 27001 A.9.4
- **File/Component:** `Source/Backend/src/app.ts`, all route files
- **Observation:** The Express application registers six route groups with zero authentication middleware. Every endpoint — including write operations (`POST /api/work-items`, `POST /api/work-items/:id/approve`, `POST /api/work-items/:id/dispatch`) — is callable by any unauthenticated network client. No login route, JWT validation, API key check, session cookie, or OAuth flow exists. The package manifest confirms no auth library (`passport`, `jsonwebtoken`, etc.) is installed.
- **Remediation:**
  1. Add an authentication middleware (e.g., JWT Bearer tokens or API key header validation) applied globally before all route groups.
  2. Create a `POST /api/auth/login` endpoint that validates credentials and issues a signed token.
  3. Install and wire `helmet` to set security-relevant HTTP headers alongside auth.
  4. Add `bcrypt` for password hashing if credential storage is introduced.

---

### COMP-002: No Authorisation / Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1.1–4.1.3 (Access Control), SOC2 CC6.3, ISO 27001 A.9.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`
- **Observation:** There is no role-based or attribute-based access control. Any caller that can reach the API can approve, reject, or dispatch any work item — operations that should be restricted to privileged roles. The state machine enforces valid status transitions (a partial mitigation) but enforces no identity-based policy. The `manual-override` agent label in `buildChangeEntry` is hardcoded rather than derived from an authenticated principal.
- **Remediation:**
  1. Define roles: `viewer`, `contributor`, `approver`, `dispatcher`.
  2. Apply an RBAC middleware after authentication that maps the authenticated identity's role to permitted actions.
  3. Restrict `approve`, `reject`, `dispatch` to `approver`/`dispatcher` roles.
  4. Record the authenticated principal's identity (not just `'manual-override'`) in `ChangeHistoryEntry.agent`.

---

### COMP-003: Missing Security HTTP Headers
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.1–14.4.6, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No security headers are set. The backend does not use `helmet` or any equivalent middleware. The following are absent:
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy`
  - `Permissions-Policy`
  The vite dev server similarly has no CSP configuration (`Source/Frontend/vite.config.ts`).
- **Remediation:**
  1. `npm install helmet` and add `app.use(helmet())` as the first middleware in `app.ts`.
  2. Configure a strict CSP via `helmet.contentSecurityPolicy(...)`.
  3. Enable HSTS with `includeSubDomains` and a `max-age` of at least 1 year for production.

---

### COMP-004: No CORS Policy
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.5.3, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** Express has no CORS middleware configured. By default, browsers will apply the same-origin policy, but there is no explicit allowlist to control which origins may call the API — and no `cors` package is installed. If this API is ever accessed cross-origin (e.g., embedded portal, external webhook caller), the absence of a CORS policy becomes exploitable.
- **Remediation:**
  1. `npm install cors @types/cors`.
  2. Add `app.use(cors({ origin: ['https://your-frontend-domain.com'], credentials: true }))` with an explicit allowlist — never `origin: '*'` for authenticated APIs.

---

### COMP-005: Required Audit Events Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 (Monitoring of Security Events), ISO 27001 A.12.4
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route/service files
- **Observation:** `security.config.yml` mandates four audit events. Status:

  | Required Event | Status | Evidence |
  |---|---|---|
  | `login_attempt` | ❌ MISSING | No authentication layer exists; no login endpoint or login audit log. |
  | `permission_denied` | ❌ MISSING | No access control layer; no 403 responses or denial logs. |
  | `state_transition` | ⚠️ PARTIAL | Status changes are recorded in `ChangeHistoryEntry` on the work item and emit ad-hoc `logger.info` calls, but there is no standardised audit event with `event_type: "state_transition"` making them queryable as a compliance audit stream. |
  | `data_export` | ❌ MISSING | No data export endpoint. The list endpoint (`GET /api/work-items`) returns all items without audit logging of access. |

  Additionally, no audit log destination is configured — events only go to `process.stdout`. There is no retention policy or tamper-evident log store.
- **Remediation:**
  1. Introduce an `auditLog()` helper that emits structured events with `event_type`, `actor`, `resource`, `result`, and `timestamp`.
  2. Emit `login_attempt` and `permission_denied` events once auth/authz are added.
  3. Standardise state_transition logs: replace ad-hoc messages with `auditLog({ event_type: 'state_transition', ... })`.
  4. Emit `data_export` on any bulk list/export call.
  5. Route audit logs to a tamper-evident, append-only sink (e.g., separate log file or SIEM).

---

### COMP-006: No MFA Support
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.8.1 (MFA), SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (architecture-level gap)
- **Observation:** Since there is no authentication layer (COMP-001), MFA cannot exist. For privileged operations (approve, dispatch, mass-delete), OWASP-ASVS L2 requires step-up authentication or MFA. This is a derivative gap of COMP-001.
- **Remediation:** Implement auth (COMP-001) with an optional TOTP or WebAuthn second factor for high-privilege roles.

---

### COMP-007: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V9.1.1–9.1.3, SOC2 CC6.1, ISO 27001 A.10.1
- **File/Component:** `Source/Backend/src/app.ts`, `docker-compose.test.yml`
- **Observation:** The backend binds to `http://localhost:3001` (plain HTTP). `docker-compose.test.yml` exposes the same port without TLS termination. `Source/Frontend/vite.config.ts` proxies to `http://localhost:3001`. No HSTS, no TLS configuration, no redirect from HTTP to HTTPS. Data in transit (including work item contents, any future credentials) is unencrypted.
- **Remediation:**
  1. Place a TLS-terminating reverse proxy (nginx, Caddy, or AWS ALB) in front of the application in all non-dev environments.
  2. Add an HSTS header via `helmet` (covered by COMP-003 remediation).
  3. Add a middleware that redirects HTTP to HTTPS when `NODE_ENV=production`.

---

### COMP-008: No Rate Limiting
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V11.1.1–11.1.2 (Business Logic), SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** There is no rate-limiting middleware. The list endpoint `GET /api/work-items` accepts an arbitrary `limit` parameter (`parseInt(req.query.limit as string, 10)`) with no maximum cap. This enables:
  - Unbounded item enumeration in a single request.
  - Denial-of-service via repeated unauthenticated requests.
  - Brute-force abuse once authentication is added.
- **Remediation:**
  1. `npm install express-rate-limit` and apply a global rate limiter (`max: 100`, `windowMs: 15 * 60 * 1000`).
  2. Apply a tighter limit on write endpoints and on the future auth endpoint.
  3. Cap the `limit` query parameter: `const limit = Math.min(parseInt(req.query.limit ?? '20'), 100)`.

---

### COMP-009: Webhook Intake Endpoints Lack Authentication
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V2.1.1, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept arbitrary work-item creation requests with no webhook signature verification (e.g., HMAC-SHA256 `X-Zendesk-Webhook-Signature` header). Any caller can inject work items into the workflow.
- **Remediation:**
  1. Validate the `X-Zendesk-Webhook-Signature` header using a shared secret from environment variables (`process.env.ZENDESK_WEBHOOK_SECRET`).
  2. Add a secret token header check for `/api/intake/automated`.
  3. Log failed signature validation as a `permission_denied` audit event.

---

### COMP-010: Internal Error Messages Returned to Clients
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V7.4.1 (Error Handling)
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** Catch blocks in route handlers expose raw `err.message` to API callers:
  ```ts
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
  ```
  This can leak internal paths, library names, or business logic details. The global `errorHandler` correctly returns a generic message, but route-level handlers bypass it.
- **Remediation:**
  1. In catch blocks, log `err.message` and `err.stack` server-side, but return only a generic `{ error: 'An unexpected error occurred' }` with a stable error code.
  2. Use an `AppError` class to distinguish user-facing 4xx messages (safe to return) from unexpected 5xx messages (never return raw).

---

### COMP-011: Prometheus Metrics Endpoint Publicly Accessible
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 (Least Privilege Access), ISO 27001 A.9.4
- **File/Component:** `Source/Backend/src/app.ts` (line 34)
- **Observation:** `GET /metrics` returns Prometheus runtime metrics (default Node.js metrics + domain counters) without any authentication. This exposes internal operational details (memory, CPU, GC timing, work item volume by type/priority) to any network caller.
- **Remediation:**
  1. Restrict `/metrics` to an internal network or separate management port.
  2. At minimum, require a bearer token header: check `Authorization: Bearer <METRICS_TOKEN>` against `process.env.METRICS_TOKEN`.

---

### COMP-012: No Data Retention or Hard-Delete Mechanism (GDPR Art. 17)
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 (Right to Erasure), GDPR Art. 25 (Privacy by Design)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** Soft-delete (`deleted: true`) marks items as deleted but they remain in the in-memory `Map`. There is no permanent deletion function and no data retention policy. If the application is extended to store personal data (user names, email addresses, descriptions referencing individuals), the GDPR Right to Erasure would be unenforceable.
- **Remediation:**
  1. Add a `hardDelete(id)` function to `workItemStore.ts` that removes the entry from the `Map`.
  2. Define a data retention schedule (e.g., hard-delete soft-deleted items after 30 days).
  3. Document a Right-to-Erasure procedure in the data processing agreement.

---

### COMP-013: Sensitive Fields Not Encrypted at Rest
- **Severity:** Low (currently — escalates if PII is added)
- **Framework/Control:** OWASP-ASVS V6.2.1, SOC2 CC6.1, GDPR Art. 32, ISO 27001 A.10.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`, `Source/Shared/types/workflow.ts`
- **Observation:** `security.config.yml` lists `email`, `password`, `token`, `secret`, `api_key` as sensitive fields. Currently, **none of these fields exist** in the `WorkItem` data model — the domain stores only work item metadata (title, description, type, status, etc.). However, there is no technical control to prevent these fields from being added in future without encryption. The in-memory store applies no field-level encryption. If the system is extended with user accounts or API credentials, they would be stored in plaintext.
- **Remediation:**
  1. If user accounts or API credentials are introduced, encrypt at-rest using AES-256-GCM via Node.js `crypto` module with the key in `process.env.ENCRYPTION_KEY`.
  2. Never store raw passwords — hash with `bcrypt` (cost factor ≥ 12).
  3. Add a field-level encryption wrapper to `workItemStore.ts` for any field matching the sensitive_fields list before storage.

---

### COMP-014: No Input Sanitisation Against XSS
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V5.2.1 (Sanitisation)
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Frontend/src/pages/WorkItemDetailPage.tsx`
- **Observation:** Work item `title` and `description` fields accept free-text input. There is no HTML encoding or sanitisation applied before the values are stored or returned. If the frontend renders any field as `innerHTML` or the system is extended with HTML rendering, XSS is possible. Currently the React frontend uses standard JSX (which escapes by default), limiting the immediate risk.
- **Remediation:**
  1. Validate that `title` and `description` contain no HTML or script tags at the API level (regex or `sanitize-html` library).
  2. Confirm all frontend rendering uses JSX / React safe rendering (no `dangerouslySetInnerHTML`).
  3. Set CSP header (covered by COMP-003).

---

## Compliance Matrix

### OWASP-ASVS Level 2

| Control | Description | Status | Finding |
|---------|-------------|--------|---------|
| V2.1.1 | Password / credential authentication | ❌ FAIL | COMP-001 |
| V2.8.1 | Multi-factor authentication for privileged ops | ❌ FAIL | COMP-006 |
| V3.1.1 | Session management with timeout | ❌ FAIL | COMP-001 (no sessions) |
| V4.1.1 | Principle of least privilege enforced | ❌ FAIL | COMP-002 |
| V4.1.3 | Authorisation for all protected resources | ❌ FAIL | COMP-002 |
| V5.2.1 | Input sanitisation against injection | ⚠️ PARTIAL | COMP-014 (validation present, sanitisation absent) |
| V5.3.1 | Output encoding for XSS prevention | ⚠️ PARTIAL | React JSX escapes; no server-side encoding |
| V6.2.1 | Sensitive data encrypted at rest (AES-256+) | ⚠️ N/A NOW | COMP-013 (no sensitive fields currently stored) |
| V7.4.1 | Error messages don't expose internals to client | ⚠️ PARTIAL | COMP-010 |
| V9.1.1 | TLS enforced for all client connections | ❌ FAIL | COMP-007 |
| V9.1.3 | Only strong TLS cipher suites | ❌ FAIL | COMP-007 |
| V11.1.1 | Business logic limits (rate limits) | ❌ FAIL | COMP-008 |
| V14.4.1 | Security headers (Content-Security-Policy) | ❌ FAIL | COMP-003 |
| V14.5.3 | CORS origin restricted | ❌ FAIL | COMP-004 |

**OWASP-ASVS L2 Pass Rate: 2/14 = 14%** ❌

---

### SOC2 Type 2

| Control | Description | Status | Finding |
|---------|-------------|--------|---------|
| CC6.1 | Logical access controls restrict access | ❌ FAIL | COMP-001, COMP-002, COMP-003 |
| CC6.2 | Credentials are protected and managed | ❌ FAIL | COMP-001 (no credential system) |
| CC6.3 | Role-based access controls enforced | ❌ FAIL | COMP-002 |
| CC7.1 | Security events are monitored and logged | ⚠️ PARTIAL | COMP-005 (partial logging, missing 3/4 required events) |
| CC8.1 | Change management with audit trail | ⚠️ PARTIAL | ChangeHistory exists on work items; no formal change-management audit log |

**SOC2-Type2 Pass Rate: 0/5 controls fully pass, 2/5 partial = 20%** ❌

---

### GDPR (supplemental — per task scope)

| Article | Description | Status | Finding |
|---------|-------------|--------|---------|
| Art. 17 | Right to Erasure (hard delete) | ❌ FAIL | COMP-012 |
| Art. 25 | Privacy by Design | ❌ FAIL | No privacy-by-design controls |
| Art. 32 | Security of processing (encryption, pseudonymisation) | ⚠️ N/A NOW | COMP-013 |

---

### ISO 27001 (supplemental — per task scope)

| Control | Description | Status | Finding |
|---------|-------------|--------|---------|
| A.9.1 | Access control policy | ❌ FAIL | COMP-002 |
| A.9.4 | System access control | ❌ FAIL | COMP-001 |
| A.10.1 | Cryptographic controls | ❌ FAIL | COMP-007, COMP-013 |
| A.12.4 | Logging and monitoring | ⚠️ PARTIAL | COMP-005 |
| A.14.2 | Security in development processes | ⚠️ PARTIAL | CLAUDE.md enforces arch rules; no SAST pipeline |

---

## Controls That Pass

The following controls are **satisfied** by the current implementation:

| Area | Evidence |
|------|---------|
| Structured JSON logging | `Source/Backend/src/utils/logger.ts` — `LogEntry` schema, never `console.log` |
| Prometheus metrics | `Source/Backend/src/metrics.ts` — domain-significant operations metered |
| State machine transition enforcement | `VALID_STATUS_TRANSITIONS` in `workflow.ts` prevents invalid jumps |
| Change history tracking | `ChangeHistoryEntry[]` on every work item with field-level diff |
| Input validation on enums | Routes validate `type`, `priority`, `source`, `complexity` against enum values |
| Soft delete | `store.softDelete()` with change history entry; deleted items excluded from all reads |
| Generic error response from global handler | `errorHandler.ts` returns `{ error: 'Internal server error' }`, not stack traces |

---

## Priority Remediation Roadmap

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| P1 | COMP-001: Authentication | High | Unlocks all other controls |
| P1 | COMP-002: Authorisation/RBAC | Medium | Requires auth first |
| P1 | COMP-003: Security Headers (helmet) | Low | Immediate wins |
| P1 | COMP-004: CORS Policy | Low | Immediate wins |
| P2 | COMP-005: Audit Events | Medium | SOC2 CC7.1 |
| P2 | COMP-007: TLS | Medium | Infrastructure change |
| P2 | COMP-009: Webhook Auth | Low | Closes intake attack surface |
| P3 | COMP-008: Rate Limiting | Low | DoS protection |
| P3 | COMP-010: Error Message Sanitisation | Low | Information leakage |
| P3 | COMP-011: Metrics Auth | Low | Operational exposure |
| P4 | COMP-012: Hard Delete / GDPR | Medium | GDPR readiness |
| P4 | COMP-013: Encryption Framework | Medium | Future-proofing |
| P4 | COMP-014: Input Sanitisation | Low | XSS defence-in-depth |

---

*Report generated by compliance_auditor — TheGuardians pipeline — 2026-11-09*
