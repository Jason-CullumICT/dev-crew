# Compliance Audit Report — dev-crew Source App
**Date:** 2026-06-01  
**Auditor:** compliance_auditor (TheGuardians)  
**Frameworks:** OWASP-ASVS Level 2, SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)  
**Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`  

---

## Executive Summary

The dev-crew Source App is a workflow orchestration engine with no authentication, no authorisation, and no transport security controls in the current codebase. **All API endpoints are fully open to unauthenticated callers.** None of the required audit log events (login_attempt, permission_denied, data_export) are emitted. TLS is not configured. Security HTTP headers are absent. The overall compliance posture is **critical**.

**Compliance Score: 2 / 14 controls PASS (14 %)**  
**Grade: D (multiple High findings; no Critical only because the application contains no live PII/credentials in-band — but the gap is architectural, not mitigated)**

---

## Findings

---

### COMP-001: No Authentication on Any API Endpoint

- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1.1 — Verify user can authenticate; SOC2 CC6.1 — Logical access controls require authentication before granting access
- **File/Component:** `Source/Backend/src/app.ts` — all route mounts; `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `dashboard.ts`, `intake.ts`
- **Observation:** Zero authentication middleware exists anywhere in the Express application. Every endpoint — including work-item creation, state transitions (approve/reject/dispatch), and the dashboard — is callable by any anonymous network client without a token, session cookie, or API key. The `CLAUDE.md` dev credentials (`admin@example.com / admin123`) appear only in documentation and have no backing authentication layer in the source.
- **Remediation:**
  1. Add an authentication middleware (e.g., JWT bearer token via `jsonwebtoken`, or API-key header validation) applied globally in `app.ts` before all route mounts.
  2. Protect state-mutation routes (POST/PATCH/DELETE) at minimum; read-only endpoints may remain open if the threat model allows it.
  3. Add the `login_attempt` audit event (success and failure) once auth is implemented.

---

### COMP-002: No Authorisation / Role-Based Access Control

- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1.1 — Verify RBAC enforced; OWASP-ASVS V4.2.1 — Operation-level access control; SOC2 CC6.3 — Authorised access to systems
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (approve/reject/dispatch endpoints); all routes
- **Observation:** There is no concept of caller identity or role. Any caller who can reach the network can approve, reject, or dispatch work items. The `approve` endpoint (`POST /api/work-items/:id/approve`) accepts a manual override with no privilege check. The `dispatch` endpoint assigns work items to engineering teams with no operator validation.
- **Remediation:**
  1. Define at least two roles: `operator` (can read + trigger workflow actions) and `admin` (can approve/reject/dispatch).
  2. Implement an authorisation middleware that extracts the caller's role from the authenticated token and denies operations outside the permitted set.
  3. Emit `permission_denied` audit log events on every authorisation rejection.

---

### COMP-003: Missing Required Audit Log Events

- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 — Detection of security-relevant events via monitoring/logging; OWASP-ASVS V7.1.2 — Audit log of security-relevant events
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route and service files
- **Observation:** The `security.config.yml` mandates four audit events. Status:

  | Required Event | Present? | Notes |
  |---|---|---|
  | `login_attempt` | ❌ NO | No auth system → no login events |
  | `permission_denied` | ❌ NO | No authz system → never emitted |
  | `state_transition` | ⚠️ PARTIAL | Status changes captured in `changeHistory[]` on the WorkItem object, but **not emitted as a dedicated structured log event**. The logger emits `Work item assessed` / `Work item routed` etc., but these do not carry a consistent `event` field that tools can filter on. |
  | `data_export` | ❌ NO | No export endpoint and no event if one is added |

- **Remediation:**
  1. Add a dedicated `auditLog()` wrapper around the structured logger that always emits a JSON entry with `event`, `actor`, `resourceId`, `outcome`, and `timestamp` fields.
  2. Emit `state_transition` on every call to `buildChangeEntry` for the `status` field.
  3. Once authentication is added, emit `login_attempt` (with `outcome: success|failure`) on every auth attempt.
  4. Emit `permission_denied` on every authorisation rejection.
  5. Add a `data_export` event to any future reporting or export endpoints.

---

### COMP-004: No TLS / HTTPS Enforcement

- **Severity:** High
- **Framework/Control:** OWASP-ASVS V9.1.1 — Verify TLS used for all external connections; SOC2 CC6.1 — Data in transit protected
- **File/Component:** `Source/Backend/src/app.ts` (HTTP-only server), `Source/Frontend/vite.config.ts` (HTTP proxy)
- **Observation:** The backend listens on plain HTTP (`app.listen(PORT)`). The Vite dev server proxies `/api` to `http://localhost:3001`. There is no TLS certificate configuration, no HTTPS redirect middleware, and no HSTS header. All data including any future sensitive payloads travels unencrypted over the wire.
- **Remediation:**
  1. Terminate TLS at the infrastructure layer (reverse proxy such as nginx/Caddy) and enforce HTTPS-only ingress.
  2. Add `Strict-Transport-Security` header (HSTS) via Helmet or custom middleware.
  3. Ensure Vite proxy and any inter-service calls also use HTTPS in non-development environments.

---

### COMP-005: Missing Security HTTP Headers

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.1 — Verify HTTP security headers present; SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** None of the following security headers are set by the Express application:

  | Header | Status |
  |---|---|
  | `Content-Security-Policy` | ❌ Missing |
  | `X-Frame-Options` | ❌ Missing |
  | `X-Content-Type-Options: nosniff` | ❌ Missing |
  | `Strict-Transport-Security` | ❌ Missing |
  | `Referrer-Policy` | ❌ Missing |
  | `Permissions-Policy` | ❌ Missing |

  Express by default emits `X-Powered-By: Express`, disclosing the server technology.

- **Remediation:**
  1. Install and configure `helmet` (`npm install helmet`) in `app.ts`: `app.use(helmet())`.
  2. Disable `X-Powered-By`: `app.disable('x-powered-by')`.
  3. Configure CSP appropriate to the API-only nature of the backend (no `script-src` needed for pure REST APIs).

---

### COMP-006: No Rate Limiting on Any Endpoint

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V13.1.1 — Verify REST API rate limiting; SOC2 CC6.1 (availability controls)
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** There is no rate-limiting middleware. An attacker or misconfigured client can flood any endpoint — including intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) — at an unbounded rate, exhausting memory (in-memory store) or CPU. The pagination `limit` query parameter is also uncapped: `GET /api/work-items?limit=999999` returns all items in a single response.
- **Remediation:**
  1. Add `express-rate-limit` globally with a default limit (e.g., 100 req/min per IP) and a tighter limit on mutation endpoints.
  2. Enforce a hard maximum on the `limit` pagination parameter (e.g., max 100): `const limit = Math.min(parseInt(...), 100)`.

---

### COMP-007: Intake Webhook Endpoints Have No Caller Verification

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V13.2.5 — Verify REST services verify request origin; SOC2 CC6.2 — Access provisioning
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept JSON from any source with no signature verification (e.g., HMAC-SHA256 of the payload using a shared secret), no API key, and no IP allowlist. An anonymous actor can inject arbitrary work items into the system by sending a crafted POST request.
- **Remediation:**
  1. For Zendesk webhooks: validate the `X-Zendesk-Webhook-Signature` header using a shared secret stored in an environment variable.
  2. For automated intake: require a bearer token or HMAC signature.
  3. Reject requests that fail signature verification with HTTP 401 before processing the body.

---

### COMP-008: Prometheus `/metrics` Endpoint Is Unauthenticated

- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 — Restrict access to internal observability data; OWASP-ASVS V4.1.1
- **File/Component:** `Source/Backend/src/app.ts` lines 34–37
- **Observation:** The Prometheus scrape endpoint (`GET /metrics`) is mounted without any authentication. It exposes internal operational counters (`workflow_items_created_total`, `workflow_items_dispatched_total`, dispatch gating statistics, etc.) to any unauthenticated caller. This can leak throughput and behavioural data useful for reconnaissance.
- **Remediation:**
  1. Restrict `/metrics` to internal network ranges via a reverse-proxy IP allowlist, or
  2. Add bearer-token validation middleware on this route only (many Prometheus setups support `authorization` headers for scraping).

---

### COMP-009: No Hard-Delete / Right-to-Erasure Mechanism (GDPR Art. 17 Risk)

- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 — Right to erasure; SOC2 CC6.3 (data lifecycle controls)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (`softDelete`), entire data model
- **Observation:** The store implements only a soft-delete (`item.deleted = true`). There is no permanent removal path. Although the current data model does not store PII fields listed in `security.config.yml` (`email`, `password`, `token`, `secret`, `api_key`), the `description` and `title` fields of a WorkItem can contain arbitrary user-supplied text, including PII. Once a work item is soft-deleted, the data persists indefinitely in the in-memory store (and would persist in any future database). No mechanism exists to permanently erase individual records on request.
- **Remediation:**
  1. Implement a `hardDelete(id)` store function that fully removes the record from the backing store.
  2. Add a `DELETE /api/work-items/:id/permanent` (or `DELETE` with `?permanent=true`) endpoint, protected by an admin role (see COMP-002).
  3. Define and document a data retention policy — maximum age after soft-delete before permanent removal.

---

### COMP-010: No CORS Policy Configured

- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.5.1 — Verify CORS policy is explicitly configured
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No `cors` middleware is configured. Express does not set `Access-Control-Allow-Origin` by default; however, this also means there is no explicit allowlist. In production, if the backend is placed behind an origin-sharing configuration (CDN, API gateway), CORS could be inadvertently opened to all origins. Without an explicit policy, the security posture is undefined.
- **Remediation:**
  1. Install `cors` (`npm install cors`) and configure an explicit origin allowlist: `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }))`.
  2. Restrict allowed methods to `GET, POST, PATCH, DELETE`.
  3. Set `credentials: false` unless cookie-based auth is adopted.

---

### COMP-011: Sensitive Fields Not Present in Data Model (Informational)

- **Severity:** Low (Informational)
- **Framework/Control:** Sensitive fields audit per `security.config.yml` (`email`, `password`, `token`, `secret`, `api_key`)
- **File/Component:** `Source/Shared/types/workflow.ts`, `Source/Backend/src/models/WorkItem.ts`
- **Observation:** None of the five sensitive field names (`email`, `password`, `token`, `secret`, `api_key`) appear in the WorkItem data model or any service. At this time there is no PII stored in the designated sensitive fields. This is **not a finding requiring remediation** but is recorded to confirm the audit scope was exercised. If user identity is added to the model (e.g., a `requestedBy` email field), encryption-at-rest and masking in logs must be applied before that field ships.
- **Remediation:** None required now. When user identity fields are introduced: apply AES-256 encryption at the persistence layer and mask them in log output.

---

### COMP-012: Error Stack Traces Logged to Server — Acceptable (PASS with Note)

- **Severity:** Low (Informational)
- **Framework/Control:** OWASP-ASVS V7.4.1 — Error handling must not expose stack traces to clients
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts`
- **Observation:** The error handler logs `stack: err.stack` to the server log (appropriate for debugging) and returns only `{ error: "Internal server error" }` to the HTTP client. Stack traces are not leaked to callers. **This control PASSES.**
- **Remediation:** None required. In production, consider setting a log level threshold so debug/stack information is filtered unless `LOG_LEVEL=debug`.

---

## Compliance Matrix

| Control ID | Framework | Description | Status | Finding |
|---|---|---|---|---|
| V2.1 | OWASP-ASVS L2 | Authentication — Verify users can authenticate | ❌ FAIL | COMP-001 |
| V2.2 | OWASP-ASVS L2 | General authenticator requirements (MFA path) | ❌ FAIL | COMP-001 |
| V4.1 | OWASP-ASVS L2 | Access Control — General RBAC | ❌ FAIL | COMP-002 |
| V4.2 | OWASP-ASVS L2 | Operation-level access control | ❌ FAIL | COMP-002 |
| V7.4 | OWASP-ASVS L2 | Error handling — no stack trace to client | ✅ PASS | COMP-012 |
| V9.1 | OWASP-ASVS L2 | Communications security — TLS | ❌ FAIL | COMP-004 |
| V13.1 | OWASP-ASVS L2 | API rate limiting | ❌ FAIL | COMP-006 |
| V13.2 | OWASP-ASVS L2 | RESTful services — input validation (partial) | ⚠️ PARTIAL | COMP-007 |
| V14.4 | OWASP-ASVS L2 | HTTP Security Headers | ❌ FAIL | COMP-005 |
| V14.5 | OWASP-ASVS L2 | CORS policy configured | ❌ FAIL | COMP-010 |
| CC6.1 | SOC2-Type2 | Logical access controls — authentication before access | ❌ FAIL | COMP-001, COMP-004 |
| CC6.2 | SOC2-Type2 | Access provisioning — verified before granting | ❌ FAIL | COMP-007 |
| CC6.3 | SOC2-Type2 | Authorised access to systems | ❌ FAIL | COMP-002 |
| CC7.1 | SOC2-Type2 | Detection/monitoring of security events | ❌ FAIL | COMP-003 |
| CC8.1 | SOC2-Type2 | Change management — changes tracked | ✅ PASS | WorkItem `changeHistory[]` provides in-domain change audit trail |

**Summary: 2 PASS / 1 PARTIAL / 12 FAIL**  
**Pass Rate: 14 % (2/15 controls)**  
**Grading threshold for A: ≥ 90 % → Current grade: F (structural authentication absence)**

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | COMP-001 — Add authentication | High | Blocks all other access control gaps |
| P1 | COMP-002 — Add authorisation/RBAC | Medium (post-auth) | Prevents privilege abuse |
| P1 | COMP-004 — Enforce TLS | Low (infra config) | Encrypts all data in transit |
| P2 | COMP-003 — Emit required audit events | Medium | SOC2 CC7.1 compliance |
| P2 | COMP-005 — Add Helmet security headers | Low (`npm install helmet`) | Quick win |
| P2 | COMP-006 — Add rate limiting + cap pagination | Low | DoS protection |
| P2 | COMP-007 — Webhook signature validation | Medium | Prevents intake injection |
| P3 | COMP-008 — Restrict metrics endpoint | Low | Reduce info leakage |
| P3 | COMP-009 — Implement hard delete | Medium | GDPR Art. 17 readiness |
| P3 | COMP-010 — Configure CORS policy | Low | Explicit security boundary |

---

*Report generated by compliance_auditor · TheGuardians · 2026-06-01*
