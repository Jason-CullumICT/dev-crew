# Compliance Audit Report — dev-crew Source App
**Date:** 2026-04-14  
**Auditor:** compliance_auditor (TheGuardians)  
**Run:** run-20260414-213739  
**Frameworks Audited:** OWASP-ASVS Level 2, SOC2-Type2 (CC6.1–CC6.3, CC7.1, CC8.1)  
**Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

## Executive Summary

The codebase implements a **workflow engine** for routing and triaging work items (features, bugs, issues). It has strong domain logic (state machine, change history, dependency gating) but is critically deficient in **authentication, authorisation, and transport security**. All API endpoints are completely open — there is no credential check of any kind. Three of the four required audit events are absent from the logging layer. The application does not enforce TLS at the application layer.

**Compliance Grade (pre-remediation):** D  
_Zero critical controls in CC6.1/CC6.2/CC6.3 pass. Authentication is entirely absent. Multiple ASVS L2 mandatory controls fail._

---

## Findings

### COMP-001: No Authentication on Any API Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1.1, SOC2 CC6.1, SOC2 CC6.2
- **File/Component:** `Source/Backend/src/app.ts`, all routes
- **Observation:** The Express application mounts all routers without any authentication middleware. Every endpoint — including state-transition actions (`/approve`, `/reject`, `/dispatch`), webhook intake endpoints, and the Prometheus metrics endpoint — accepts requests from any anonymous caller. The middleware directory contains only `errorHandler.ts`; there is no auth or session middleware. The `package.json` has no auth library (`passport`, `jsonwebtoken`, `express-jwt`, etc.).
- **Remediation:**
  1. Choose an auth strategy (JWT Bearer or API key for machine-to-machine, OAuth2 for human users).
  2. Implement auth middleware and mount it globally before any router (`app.use(authMiddleware)`).
  3. Protect `/metrics` with IP allowlist or a separate internal port.
  4. Add auth library (`jsonwebtoken`, `passport-jwt`, or similar) to `package.json`.

---

### COMP-002: No Authorisation / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1.3, V4.2.1, SOC2 CC6.3
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** Beyond authentication absence, there is no authorisation layer. Sensitive state-transition operations (`/approve`, `/reject`, `/dispatch`) are callable by any authenticated or unauthenticated caller. There is no concept of roles (admin, reviewer, dispatcher) and no RBAC middleware. The principle of least privilege is not applied.
- **Remediation:**
  1. Define a role model (e.g., `viewer`, `reviewer`, `approver`, `dispatcher`).
  2. Implement a `requireRole(role)` middleware and apply it to each sensitive endpoint.
  3. Store actor identity in the token/session and propagate it to `changeHistory` entries (currently hardcoded to `'manual-override'` or `'dispatcher'`).

---

### COMP-003: Missing Required Audit Events — `login_attempt`, `permission_denied`, `data_export`
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1, OWASP-ASVS V7.2.1, V7.2.2
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route/service files
- **Observation:** `security.config.yml` requires four audit events: `login_attempt`, `permission_denied`, `state_transition`, `data_export`. Only `state_transition` is effectively logged (via `changeHistory` tracking in `changeHistory.ts`). The other three are absent:
  - **`login_attempt`** — No authentication system exists; this event cannot be emitted.
  - **`permission_denied`** — No authorisation checks exist; access rejections are never logged.
  - **`data_export`** — No data export endpoint exists (`/api/export` or similar); this capability and its audit trail are absent.
  The structured logger in `utils/logger.ts` supports the correct JSON format, but the call sites don't exist.
- **Remediation:**
  1. After implementing auth (COMP-001), emit `login_attempt` with `{ success: bool, actor, ip, timestamp }`.
  2. After implementing authz (COMP-002), emit `permission_denied` with `{ actor, endpoint, method, timestamp }`.
  3. If data export is a future requirement, create the endpoint and emit `data_export` with `{ actor, recordCount, filters, timestamp }`.

---

### COMP-004: TLS / HTTPS Not Enforced at Application Layer
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V9.1.1, V9.1.2, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The application starts an HTTP server (`app.listen(PORT)`) with no TLS configuration. There is no HTTPS enforcement, no `http → https` redirect, and no HSTS header. While a reverse proxy (nginx/load balancer) may handle TLS termination in production, the application itself does not enforce secure transport, and the frontend API client (`Source/Frontend/src/api/client.ts`) uses a configurable `VITE_API_BASE_URL` that defaults to `/api` — no protocol enforcement.
- **Remediation:**
  1. In production, enforce TLS at the reverse proxy level and document this in architecture docs.
  2. Add `helmet` middleware to set `Strict-Transport-Security` (HSTS) header: `app.use(helmet())`.
  3. If TLS is terminated at the app: use `https.createServer(tlsOptions, app)`.
  4. Validate `VITE_API_BASE_URL` starts with `https://` in production builds.

---

### COMP-005: No Security Headers (Missing Helmet / CSP)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.1, V14.4.3, V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No HTTP security headers are set. The following are absent:
  - `Content-Security-Policy` — XSS mitigation
  - `X-Frame-Options` — Clickjacking protection
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security`
  - `Referrer-Policy`
  The `package.json` has no `helmet` dependency.
- **Remediation:**
  1. Add `helmet` to dependencies: `npm install helmet`.
  2. Add `app.use(helmet())` as the first middleware in `app.ts`.
  3. Configure a Content-Security-Policy appropriate for the frontend's requirements.

---

### COMP-006: No CORS Policy Configured
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.5.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is present. The `cors` package is absent from `package.json`. Without server-side CORS enforcement, the API cannot restrict which origins are permitted to make cross-origin requests. Browser CORS enforcement alone is insufficient (non-browser API clients bypass it entirely).
- **Remediation:**
  1. Add `cors` package: `npm install cors`.
  2. Configure a restrictive allowlist: `app.use(cors({ origin: [process.env.FRONTEND_URL], credentials: true }))`.
  3. Add appropriate `Vary: Origin` handling.

---

### COMP-007: No Rate Limiting on Any Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.2.2, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/intake.ts`
- **Observation:** No rate-limiting middleware exists. The webhook intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) are particularly vulnerable — a single caller can flood the system, exhausting the in-memory store and causing denial of service. No `express-rate-limit` or equivalent is present in `package.json`.
- **Remediation:**
  1. Add `express-rate-limit`: `npm install express-rate-limit`.
  2. Apply a global rate limit and stricter limits on intake endpoints.
  3. Consider IP-based or token-based throttling for webhooks.

---

### COMP-008: Webhook Intake Endpoints Lack Signature Verification
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V1.14.1, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** The Zendesk webhook receiver (`POST /api/intake/zendesk`) and automated event receiver (`POST /api/intake/automated`) accept any payload without verifying the caller's identity or a HMAC signature. Any external party who discovers the endpoint URL can inject arbitrary work items. Zendesk provides webhook signing via `X-Zendesk-Webhook-Signature`; this is not checked.
- **Remediation:**
  1. For the Zendesk endpoint: verify `X-Zendesk-Webhook-Signature` using a shared secret from env vars.
  2. For the automated endpoint: require a pre-shared `Authorization: Bearer <token>` header.
  3. Emit a `permission_denied` audit event on signature failure.

---

### COMP-009: Soft-Delete Only — No Hard Deletion / Right to Erasure
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V8.3.4, SOC2 CC6.3
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** `DELETE /api/work-items/:id` only sets `deleted: true` in the in-memory Map. The data record is never physically removed. Soft-deleted items remain accessible via the raw `items` Map (e.g., in `resetStore()` for tests). There is no data retention policy, no purge mechanism, and no hard-delete endpoint. If the domain ever stores PII (user-submitted descriptions, contact info), this would violate the right to erasure.
- **Remediation:**
  1. Implement a `hardDelete(id)` store function that removes the record entirely.
  2. Expose it as an admin-only endpoint (`DELETE /api/work-items/:id?permanent=true`).
  3. Implement a retention policy (e.g., purge soft-deleted items after N days).

---

### COMP-010: Error Stack Traces Logged at Server (Internal Exposure Risk)
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V7.4.1
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts`
- **Observation:** The global error handler logs `err.stack` to stdout: `logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack })`. While this does not leak stack traces to the HTTP response (which correctly returns `{ error: 'Internal server error' }`), stack traces in logs may contain file paths and internal architecture details. In a shared log aggregation platform, this could expose internals to unauthorised operators.
- **Remediation:**
  1. In production, suppress `stack` from log output (use `LOG_LEVEL=info` to exclude debug-level details, or conditionally omit `stack` when `NODE_ENV === 'production'`).
  2. Consider a structured error taxonomy (error codes) instead of raw stacks in logs.

---

### COMP-011: No Input Payload Size Limits
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V5.1.4, V13.2.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** `express.json()` is mounted without a `limit` option, defaulting to `100kb`. While this is Express's default, it is not explicitly configured and there are no application-level length limits on fields such as `title` and `description`. An attacker can send very large strings to exhaust memory in the in-memory store.
- **Remediation:**
  1. Set an explicit JSON body size limit: `app.use(express.json({ limit: '10kb' }))`.
  2. Add field-level length validation in route handlers (e.g., `title.length <= 200`).

---

### COMP-012: No OpenTelemetry Trace Context Propagation
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V7.1.2, SOC2 CC7.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/utils/logger.ts`
- **Observation:** `CLAUDE.md` mandates W3C `traceparent` header propagation and OpenTelemetry instrumentation for distributed tracing. The logger (`utils/logger.ts`) does not inject trace/span IDs. No OpenTelemetry SDK is in `package.json`. Log entries cannot be correlated across service boundaries.
- **Remediation:**
  1. Add `@opentelemetry/sdk-node` and auto-instrumentation packages.
  2. Update the logger to inject `trace_id` and `span_id` from the active OTel context.
  3. Propagate `traceparent` in outgoing HTTP requests.

---

## Compliance Matrix

### SOC2-Type2 Controls

| Control ID | Description | Status | Notes |
|------------|-------------|--------|-------|
| CC6.1 | Logical and physical access controls | **FAIL** | No authentication, no access controls on any endpoint |
| CC6.2 | Credential issuance and user registration | **FAIL** | No user management system; no credential lifecycle |
| CC6.3 | Access modification / revocation | **FAIL** | No RBAC; no access provisioning or revocation |
| CC7.1 | Detection and monitoring | **PARTIAL** | Prometheus metrics and structured logging present; security events missing |
| CC8.1 | Change management | **PARTIAL** | WorkItem `changeHistory` tracks domain changes; no infra change control |

**SOC2 Pass Rate: 0 / 5 full pass (2 partial)**

---

### OWASP-ASVS Level 2

| Area | Control | Status | Notes |
|------|---------|--------|-------|
| V2 Authentication | V2.1.1 — Password security | N/A | No user auth system exists |
| V2 Authentication | V2.5.2 — No hardcoded credentials | **PASS** | No credentials in source code |
| V3 Session Management | V3.1.1 — Session termination | N/A | No sessions implemented |
| V4 Access Control | V4.1.1 — Policy-enforced access control | **FAIL** | All endpoints open |
| V4 Access Control | V4.1.3 — Principle of least privilege | **FAIL** | No roles or permission model |
| V4 Access Control | V4.2.2 — Rate limiting / brute force | **FAIL** | No rate limiting |
| V6 Cryptography | V6.2.1 — Strong crypto for sensitive data | N/A | No PII fields in data model |
| V6 Cryptography | V6.3.1 — Secure random UUIDs | **PASS** | `uuid` package used for IDs |
| V7 Error / Logging | V7.1.2 — Log correlation / trace IDs | **FAIL** | No OTel trace IDs in logs |
| V7 Error / Logging | V7.2.1 — Authentication event logging | **FAIL** | No auth events logged |
| V7 Error / Logging | V7.2.2 — Access control event logging | **FAIL** | No authz events logged |
| V7 Error / Logging | V7.3.1 — State transitions logged | **PASS** | `changeHistory` tracks all transitions |
| V8 Data Protection | V8.1.2 — No sensitive data in logs | **PASS** | WorkItem fields contain no PII |
| V8 Data Protection | V8.3.4 — Data deletion on request | **FAIL** | Soft delete only; no hard erasure |
| V9 Communications | V9.1.1 — TLS enforced | **FAIL** | HTTP only at application layer |
| V9 Communications | V9.2.1 — Certificate validation | N/A | No TLS at app layer to validate |
| V13 API | V13.1.1 — All API endpoints authenticated | **FAIL** | No authentication |
| V13 API | V13.2.1 — Input validation / payload size | **FAIL** | No payload size limits |
| V14 Configuration | V14.4.1 — Security headers present | **FAIL** | No Helmet / no security headers |
| V14 Configuration | V14.5.3 — CORS policy configured | **FAIL** | No CORS middleware |

**OWASP-ASVS Pass Rate: 4 PASS, 10 FAIL, 5 N/A out of 19 assessed controls**  
**(Pass rate on assessed: 29%)**

---

### Required Audit Events Matrix

| Event | Required | Present | Notes |
|-------|----------|---------|-------|
| `login_attempt` | Yes | **NO** | No auth system exists |
| `permission_denied` | Yes | **NO** | No authz system exists |
| `state_transition` | Yes | **YES** | `changeHistory` + `logger.info` in workflow routes |
| `data_export` | Yes | **NO** | No export endpoint or capability |

---

### Sensitive Fields Matrix

| Field | In Data Model | Encrypted at Rest | Masked in Logs |
|-------|--------------|-------------------|----------------|
| `email` | No | N/A | N/A |
| `password` | No | N/A | N/A |
| `token` | No | N/A | N/A |
| `secret` | No | N/A | N/A |
| `api_key` | No | N/A | N/A |

> **Note:** None of the sensitive fields defined in `security.config.yml` appear in the current data model. The application stores workflow metadata only (title, description, status, priority). This is architecturally clean. **If the domain evolves to store user-submitted contact information, requester email, or Zendesk user identity, the encryption/masking controls must be revisited immediately.**

---

## Overall Compliance Score

| Framework | Controls Assessed | Pass | Fail | N/A | Pass Rate |
|-----------|------------------|------|------|-----|-----------|
| SOC2-Type2 | 5 | 0 | 3 | 2 partial | 0% full pass |
| OWASP-ASVS L2 | 19 | 4 | 10 | 5 | 29% |
| Required Audit Events | 4 | 1 | 3 | 0 | 25% |
| **Combined** | **28** | **5** | **16** | **7** | **~24%** |

**Grade: D** _(Exceeds max_critical=1 threshold; CC6.1/CC6.2/CC6.3 are hard failures)_

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| P1 | COMP-001: Implement authentication | High |
| P1 | COMP-002: Implement authorisation / RBAC | High |
| P1 | COMP-007: Rate limiting on all endpoints | Low |
| P1 | COMP-008: Webhook signature verification | Medium |
| P2 | COMP-003: Add missing audit event emission | Medium |
| P2 | COMP-004: Enforce TLS / add HSTS header | Low |
| P2 | COMP-005: Add Helmet security headers | Low |
| P2 | COMP-006: Configure CORS policy | Low |
| P3 | COMP-009: Hard delete / data erasure | Medium |
| P3 | COMP-011: Input payload size limits | Low |
| P4 | COMP-010: Suppress stack traces in production logs | Low |
| P4 | COMP-012: OpenTelemetry trace context injection | Medium |
