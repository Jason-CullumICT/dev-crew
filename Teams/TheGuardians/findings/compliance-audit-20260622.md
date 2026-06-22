# Compliance Audit Report — dev-crew Source App
**Date:** 2026-06-22  
**Auditor:** Compliance Auditor Agent (TheGuardians)  
**Frameworks:** OWASP-ASVS L2, SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)  
**Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

## Executive Summary

The application is a workflow engine that manages work items through a state machine. The codebase implements solid domain logic, structured logging, and Prometheus metrics, but has **critical and pervasive gaps in every security control category**. There is **no authentication, no authorization, no encryption, no TLS enforcement, no rate limiting, and no CORS configuration**. All API endpoints are publicly accessible. The required audit events (login_attempt, permission_denied, state_transition, data_export) are absent or incomplete.

**Overall Compliance Grade: D/F** (estimated pass rate ≈ 10%)

---

## Findings

---

### COMP-001: No Authentication Layer
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1.1, V4.1.1, V4.1.2 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (all routes)
- **Observation:** The Express application registers zero authentication middleware. Every endpoint — including state-mutating operations such as approve (`POST /api/work-items/:id/approve`), reject, and dispatch — is accessible without any credential. There are no JWT validators, session middleware, API key checks, or any other identity gate. The backend `package.json` has no authentication library dependency (`jsonwebtoken`, `passport`, `express-jwt`, etc.).
- **Remediation:**
  1. Introduce an authentication middleware (e.g., JWT Bearer tokens via `express-jwt` or a session-based approach).
  2. Apply the middleware globally in `app.ts` before route registration, with a short-list allowlist for public endpoints (health check, potentially intake webhooks with their own HMAC gate).
  3. Issue tokens from a dedicated auth endpoint; validate on every request.
  4. Map to SOC2 CC6.1: implement logical access controls that restrict API access to authenticated principals only.

---

### COMP-002: No Authorization / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1.3, V4.2.1 · SOC2 CC6.3
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** Even if authentication were added, there is currently no role-based or attribute-based access control. Any authenticated user (or unauthenticated caller today) can approve, reject, or dispatch any work item. There is no concept of "reviewer", "dispatcher", or "admin" roles. No route handler checks a user's role or permission before executing a state transition.
- **Remediation:**
  1. Define roles (e.g., `submitter`, `reviewer`, `dispatcher`, `admin`) in a shared type or configuration.
  2. Create an `authorize(role)` middleware that validates the authenticated principal's role against the required role for each route.
  3. Apply the principle of least privilege: submitters can POST to `/api/work-items`, reviewers can `/assess`, dispatchers can `/dispatch`, etc.
  4. Map to SOC2 CC6.3: document role definitions and access rights formally.

---

### COMP-003: No CORS Configuration
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.5.3 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No `cors` middleware is installed or configured. The backend `package.json` has no `cors` dependency. Without CORS headers, browsers apply their own default CORS policy, but the backend does not restrict cross-origin access by origin — any site can call the API. For a workflow engine that may eventually carry sensitive operational data, this is a significant gap.
- **Remediation:**
  1. Add `cors` (`npm install cors @types/cors`) to backend dependencies.
  2. Configure `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(','), credentials: true }))` as the first middleware in `app.ts`.
  3. Define `ALLOWED_ORIGINS` as an environment variable (e.g., `http://localhost:5173` for dev, the production domain for prod).

---

### COMP-004: No HTTP Security Headers (Helmet)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.1, V14.4.3 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The backend does not use `helmet` or set any security-related HTTP response headers. Missing headers include: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, and `Permissions-Policy`. This leaves the API and any served content vulnerable to clickjacking, MIME-type sniffing, and other browser-based attacks.
- **Remediation:**
  1. Add `helmet` (`npm install helmet`) to backend dependencies.
  2. Add `app.use(helmet())` as the first middleware in `app.ts`.
  3. When TLS is established, enable HSTS: `helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } })`.

---

### COMP-005: No Rate Limiting
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.2.1, V13.1.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, all route files
- **Observation:** No rate-limiting middleware is applied to any endpoint. There is no protection against brute-force, enumeration, or denial-of-service attacks. The list endpoint (`GET /api/work-items`) accepts an arbitrary `limit` query parameter without a maximum cap (`parseInt` called without bound checking or NaN guard), meaning a caller can request all records in a single response by supplying `?limit=999999`.
- **Remediation:**
  1. Add `express-rate-limit` to dependencies.
  2. Apply a global rate limiter (e.g., 100 req/min per IP) and tighter limits on state-mutation endpoints (e.g., 10 req/min on `/approve`, `/reject`, `/dispatch`).
  3. Cap `limit` query parameter: `const limit = Math.min(Math.max(parseInt(...) || 20, 1), 100)` and similarly guard `page` against NaN (`Number.isNaN(page) ? 1 : page`).

---

### COMP-006: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V9.1.1, V9.1.2 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The server binds to a plain HTTP port (`process.env.PORT || 3001`) with no TLS termination or redirect. No HSTS header is set. All API traffic — including any future credentials or tokens — traverses the network in plaintext. The frontend API client (`Source/Frontend/src/api/client.ts`) uses a configurable `VITE_API_BASE_URL` that defaults to `/api` (relative), meaning it inherits the transport of the page, but the backend itself does not enforce HTTPS.
- **Remediation:**
  1. Configure TLS termination at the reverse proxy/load balancer layer (nginx, AWS ALB) and ensure all HTTP traffic is redirected to HTTPS.
  2. Set the `Strict-Transport-Security` header (via Helmet) once TLS is in place.
  3. In production configuration, ensure `VITE_API_BASE_URL` points to an `https://` URL.
  4. Document the TLS configuration in architecture docs to satisfy SOC2 CC6.1 (encryption in transit).

---

### COMP-007: No Encryption at Rest for Sensitive Fields
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V6.2.1 · SOC2 CC6.1 · GDPR Art. 32
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** Data is stored in an in-memory `Map<string, WorkItem>`. No field-level encryption is applied to any data. The `security.config.yml` declares sensitive fields (`email`, `password`, `token`, `secret`, `api_key`), none of which exist in the current `WorkItem` model. However, the `title` and `description` fields could contain PII submitted by users via Zendesk or browser intake (e.g., a user's name or email in a support ticket description). There is no encryption layer protecting this data, and if persistent storage is added in the future, it would be unencrypted by default.
- **Remediation:**
  1. If text fields can contain PII, apply field-level encryption before storage using AES-256-GCM via Node's built-in `crypto` module.
  2. When migrating from in-memory to a persistent database, ensure the database is configured with encryption at rest (e.g., AWS RDS encrypted volumes, PostgreSQL TDE).
  3. Document the data classification of each WorkItem field to clarify which require encryption.

---

### COMP-008: Missing Required Audit Event — `login_attempt`
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.1
- **File/Component:** No authentication module exists
- **Observation:** The `compliance.required_audit_events` list mandates logging of `login_attempt` events. Because there is no authentication layer (see COMP-001), this event is never emitted. SOC2 CC7.1 requires that all access attempts be logged and monitored.
- **Remediation:** Implement authentication (COMP-001), then emit a structured log entry for every authentication attempt with fields: `event: "login_attempt"`, `user`, `outcome: "success" | "failure"`, `ip`, `timestamp`. Route to a dedicated audit log sink (separate from application logs).

---

### COMP-009: Missing Required Audit Event — `permission_denied`
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.1
- **File/Component:** No authorization middleware exists
- **Observation:** No `permission_denied` audit events are ever emitted. Without authorization (COMP-002), no access denial decisions are made, and there is nothing to log. SOC2 CC7.1 requires that all authorization failures be monitored.
- **Remediation:** Implement authorization (COMP-002). In the authorization middleware, emit `{ event: "permission_denied", user, resource, action, timestamp }` whenever access is denied. This data should flow to the audit log, not only the application log.

---

### COMP-010: Incomplete Audit Event — `state_transition`
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.2
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/services/router.ts`, `Source/Backend/src/services/assessment.ts`
- **Observation:** The `compliance.required_audit_events` list requires a dedicated `state_transition` event. While state changes are stored in `changeHistory` (a domain concept) and individual route actions log messages like `"Work item routed"`, `"Work item assessed"`, `"Work item dispatched"`, there is no unified structured audit event with `event: "state_transition"` as a field. This makes it difficult to query or alert on all transitions across the system as a single compliance-auditable event class. Additionally, the actor/user who initiated the transition is recorded as a hard-coded string (`"manual-override"`, `"dispatcher"`) rather than as the authenticated principal performing the action.
- **Remediation:**
  1. Create an `auditLog(event, payload)` utility that emits a structured log entry with `event` as a top-level field.
  2. Call `auditLog("state_transition", { workItemId, from, to, actor, reason, timestamp })` from all state-transition routes.
  3. Once authentication is in place, replace hard-coded actor strings with the authenticated user's identity.

---

### COMP-011: Missing Required Audit Event — `data_export`
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.2
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/dashboard.ts`
- **Observation:** There is no `data_export` audit event anywhere in the codebase. The `GET /api/work-items` list endpoint and all dashboard endpoints return potentially large result sets without logging a `data_export` event. Under SOC2, bulk data reads (especially via the dashboard or paginated list) should be treated as data export events and logged for monitoring and alerting.
- **Remediation:**
  1. Define criteria for what constitutes a "data export" (e.g., full-list retrieval, dashboard summary, CSV/bulk endpoint).
  2. Emit `auditLog("data_export", { endpoint, resultCount, actor, timestamp })` from the relevant routes.
  3. Monitor `data_export` events for anomalous volumes (large result sets from unexpected actors).

---

### COMP-012: Unauthenticated Prometheus Metrics Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.1.2 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (line 34: `app.get('/metrics', ...)`)
- **Observation:** The `/metrics` endpoint exposes operational telemetry (item counts, routing rates, dispatch rates, default Node.js metrics including memory and CPU) without any authentication. This leaks internal system behaviour to any unauthenticated caller, violating the principle of least privilege and potentially aiding attackers in enumerating system activity.
- **Remediation:**
  1. Protect the `/metrics` endpoint with an IP allowlist (only allow scraping from the internal Prometheus server) or with a bearer token (`Authorization: Bearer <METRICS_TOKEN>`).
  2. Alternatively, move `/metrics` to a separate internal port that is not exposed externally.

---

### COMP-013: Webhook Intake Endpoints Lack Signature Verification
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V5.1.5, V13.2.5 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept any payload without verifying that it came from the claimed source. Zendesk supports HMAC-SHA256 webhook signatures via a shared secret. Without signature verification, any party can inject arbitrary work items into the system by posting to these endpoints — a significant supply-chain and data-integrity risk.
- **Remediation:**
  1. For `/intake/zendesk`: Validate the `X-Zendesk-Webhook-Signature` header using the shared secret configured in Zendesk. Reject requests where the signature does not match.
  2. For `/intake/automated`: Require an API key passed via `Authorization` header and validate it against a configured secret.
  3. Store webhook secrets in environment variables, never in source code.

---

### COMP-014: No Permanent Data Deletion (GDPR Right to Erasure)
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 · OWASP-ASVS V8.3.4
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (line 78: `softDelete`)
- **Observation:** The only deletion mechanism is a soft delete (`item.deleted = true`), which marks items as deleted but retains all data (including `title`, `description`, `changeHistory`) in the in-memory store and any future persistent storage. There is no mechanism to permanently purge a work item and all associated history. If work items contain PII (e.g., a user's name in a Zendesk ticket description), the application cannot honour GDPR Article 17 Right to Erasure requests.
- **Remediation:**
  1. Add a `hardDelete(id: string)` function to `workItemStore.ts` that removes the item from the store entirely.
  2. Expose a privileged `DELETE /api/work-items/:id/purge` endpoint (admin role only) that calls `hardDelete`.
  3. Document the data retention policy: how long are soft-deleted items retained before purge?
  4. Implement an automated retention job that permanently purges items older than the retention window.

---

### COMP-015: No JSON Request Body Size Limit
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V12.1.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (line 13: `app.use(express.json())`)
- **Observation:** `express.json()` is called without a `limit` option. By default, Express uses a 100 KB body limit, which may be acceptable, but this is not documented or explicitly enforced. A sufficiently large payload could cause elevated memory consumption, especially given that the in-memory store grows without bound.
- **Remediation:**
  1. Explicitly set a body size limit: `app.use(express.json({ limit: '50kb' }))`.
  2. Consider adding a maximum string length validation for `title` (e.g., 500 chars) and `description` (e.g., 10,000 chars) fields in the route handlers.

---

### COMP-016: NaN Injection in Pagination Parameters
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V5.1.3
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (lines 69-70), `Source/Backend/src/routes/dashboard.ts` (lines 17-18)
- **Observation:** Pagination query parameters `page` and `limit` are parsed with `parseInt(..., 10)` but never validated for `NaN`. Passing `?page=foo&limit=bar` results in `NaN` being passed to the store's `findAll` function, where arithmetic on `NaN` propagates and produces undefined pagination behaviour (e.g., `NaN - 1 = NaN` for offset calculation, `slice(NaN, NaN) = []`).
- **Remediation:**
  ```typescript
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  ```

---

### COMP-017: No Input Sanitization on Free-Text Fields
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V5.2.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/intake.ts`
- **Observation:** Free-text fields `title` and `description` are stored without sanitization. While this is a backend API (responses are JSON, not HTML), if the frontend renders these fields as `innerHTML` or if values are ever templated into server-rendered HTML or emails, XSS injection could occur. The frontend currently renders these fields in React components, which safely escape content by default, but there is no server-side defence-in-depth.
- **Remediation:**
  1. Add maximum length validation for `title` and `description` at the route handler level.
  2. Consider adding a sanitization pass (e.g., strip null bytes and control characters) using a library such as `DOMPurify` (server-side via `jsdom`) for descriptions that may be rendered in HTML contexts.

---

## Compliance Matrix

### OWASP-ASVS Level 2

| Control ID | Description | Status | Finding |
|------------|-------------|--------|---------|
| V2.1.1 | Passwords not stored as cleartext | N/A | No user accounts exist |
| V2.2.1 | Anti-automation for auth | **FAIL** | COMP-005 — No rate limiting |
| V2.2.2 | MFA supported | **FAIL** | COMP-001 — No auth layer |
| V3.1.1 | Session tokens not in URLs | N/A | No session management |
| V3.3.1 | Session logout invalidates tokens | N/A | No session management |
| V4.1.1 | Access control enforced on all requests | **FAIL** | COMP-001, COMP-002 |
| V4.1.2 | All user/admin routes require authentication | **FAIL** | COMP-001 |
| V4.1.3 | Default deny principle applied | **FAIL** | COMP-001, COMP-002 |
| V5.1.1 | HTTP parameters validated against allowed list | **PARTIAL** | Enum fields validated; free-text uncapped |
| V5.1.3 | URL / query parameters validated | **PARTIAL** | No NaN guard — COMP-016 |
| V5.2.1 | Input sanitized for safe contexts | **PARTIAL** | COMP-017 |
| V6.2.1 | Authenticated encryption for sensitive data | **FAIL** | COMP-007 |
| V7.1.1 | Log format is structured and machine-parseable | **PASS** | Structured JSON logging implemented |
| V7.1.2 | Log entries include timestamp and severity | **PASS** | Timestamp + level in every log entry |
| V7.2.1 | Authentication events logged | **FAIL** | COMP-008 — No auth events |
| V7.2.2 | Input validation failures logged | **PARTIAL** | COMP-010, COMP-011 |
| V7.3.1 | Log protection (append-only) | **FAIL** | No log protection mechanism |
| V8.3.4 | Sensitive data deleted on request | **FAIL** | COMP-014 — Soft delete only |
| V9.1.1 | TLS required for all connections | **FAIL** | COMP-006 — HTTP only |
| V13.1.1 | API rate limiting enforced | **FAIL** | COMP-005 |
| V13.2.5 | API keys / webhook signatures validated | **FAIL** | COMP-013 |
| V14.4.1 | Security response headers set | **FAIL** | COMP-004 — No Helmet |
| V14.5.3 | CORS configured and restricted | **FAIL** | COMP-003 |

**OWASP-ASVS Pass: 2 / 23 applicable controls (9%)**

---

### SOC2-Type2

| Control ID | Description | Status | Finding |
|------------|-------------|--------|---------|
| CC6.1 | Logical and physical access controls restrict access | **FAIL** | COMP-001, COMP-003, COMP-004, COMP-006 |
| CC6.2 | Access granted only to authorised individuals | **FAIL** | COMP-001, COMP-002 |
| CC6.3 | Role-based access controls implemented | **FAIL** | COMP-002 |
| CC7.1 | System activity monitored; anomalies detected | **PARTIAL** | Prometheus + structured logs present; COMP-008/009/010/011 missing required events |
| CC8.1 | Change management controls in place | **PARTIAL** | Domain change history tracked; COMP-010 actor attribution missing |

**SOC2 Pass: 0 / 5 controls (0%) — CC7.1 and CC8.1 scored as partial/fail**

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| Total controls evaluated | 28 |
| Controls passed | 2 |
| Controls partially met | 4 |
| Controls failed | 22 |
| **Overall pass rate** | **~7%** |
| Findings: High severity | 8 |
| Findings: Medium severity | 6 |
| Findings: Low severity | 3 |
| **Compliance grade** | **D** (pending red-team: possible F) |

---

## Priority Remediation Roadmap

**Sprint 1 — Critical Blockers (High severity):**
1. COMP-001: Add authentication middleware (JWT)
2. COMP-002: Add RBAC authorization middleware
3. COMP-003: Configure CORS allowlist
4. COMP-005: Add rate limiting + pagination caps
5. COMP-006: Enforce TLS at reverse proxy; add HSTS header
6. COMP-013: Add webhook HMAC signature verification

**Sprint 2 — Compliance Events (Medium severity):**
7. COMP-004: Add Helmet security headers
8. COMP-008/009/010/011: Implement unified `auditLog()` utility for all required events
9. COMP-012: Protect `/metrics` endpoint behind IP allowlist or token
10. COMP-014: Add hard-delete endpoint and data retention policy

**Sprint 3 — Hardening (Low severity):**
11. COMP-007: Document data classification; plan field encryption for future persistence
12. COMP-015: Explicit body size limit
13. COMP-016: NaN guard on pagination parameters
14. COMP-017: String length validation for free-text fields
