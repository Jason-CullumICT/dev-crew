---

## Compliance Audit Report — dev-crew Source App

**Date:** 2026-05-25
**Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1–CC6.3, CC7.1, CC8.1) · GDPR Art.17 (user-requested)
**Scope:** `Source/Backend/` · `Source/Frontend/` · `Source/Shared/`

---

### COMP-001: No Authentication System — All API Endpoints Publicly Accessible
- **Severity:** **Critical**
- **Framework/Control:** OWASP-ASVS L2 V2.1.1, V2.2.1, V2.3.1 · SOC2 CC6.1 · SOC2 CC6.2
- **File/Component:** `Source/Backend/src/app.ts` (no auth middleware registered)
- **Observation:** The Express application registers zero authentication middleware. Every route — work item CRUD, workflow state transitions, dispatch, approval/rejection, intake webhooks, and the dashboard — is accessible to any unauthenticated HTTP client. There is no JWT validation, no API key check, no session handling, and no identity concept anywhere in the codebase. Any caller can create, mutate, approve, reject, or dispatch work items without any credential.
- **Remediation:** Add an authentication middleware layer (e.g., JWT Bearer or API-key verification) that runs before all `/api/*` routes. Introduce a user/identity context. Map CLAUDE.md's `admin@example.com / admin123` credential to a real auth scheme. Consider using a library such as `passport`, `express-jwt`, or a gateway-level IdP.

---

### COMP-002: No Authorization or Role-Based Access Control
- **Severity:** **High**
- **Framework/Control:** OWASP-ASVS L2 V4.1.1, V4.1.3, V4.2.1 · SOC2 CC6.3
- **File/Component:** All route handlers in `Source/Backend/src/routes/`
- **Observation:** Beyond the missing authentication (COMP-001), there is no authorization layer. Critical workflow actions — approve, reject, dispatch — should require elevated roles (e.g., `manager`, `lead`). Any authenticated user (once auth is added) would be able to perform any operation on any work item. There is no concept of resource ownership, team scoping, or least-privilege enforcement.
- **Remediation:** After establishing an identity system (COMP-001), add a RBAC or ABAC middleware that enforces: (a) only authorized roles can approve/reject/dispatch, (b) team-scoped access for assigned work items, (c) read-only vs. read-write separation. Apply the principle of least privilege — the intake webhook should use a service account with only `create` permission.

---

### COMP-003: Missing Required Audit Log Events
- **Severity:** **High**
- **Framework/Control:** OWASP-ASVS L2 V7.3.1, V7.3.2 · SOC2 CC7.1
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route handlers
- **Observation:** `security.config.yml` mandates four audit events. Coverage:
  | Required Event | Status | Notes |
  |---|---|---|
  | `login_attempt` | **ABSENT** | No auth system exists |
  | `permission_denied` | **ABSENT** | No access control to deny |
  | `state_transition` | **PARTIAL** | Stored in `changeHistory` per item but not emitted as a dedicated audit log event with actor identity |
  | `data_export` | **ABSENT** | No export feature; no log if one is added |

  Audit events lack actor identity (who performed the action), source IP, and correlation ID — all required for SOC2 evidence.
- **Remediation:** Introduce an `auditLog()` helper that emits structured log entries with `event`, `actor`, `resource`, `sourceIp`, `traceId`, and `outcome`. Emit `state_transition` events from all workflow route handlers. Once auth exists, emit `login_attempt` (success/failure) and `permission_denied`.

---

### COMP-004: Unauthenticated Webhook Intake Endpoints
- **Severity:** **High**
- **Framework/Control:** OWASP-ASVS L2 V2.3.1, V4.2.1 · SOC2 CC6.2
- **File/Component:** `Source/Backend/src/routes/intake.ts` — `POST /api/intake/zendesk`, `POST /api/intake/automated`
- **Observation:** Both intake routes accept arbitrary JSON payloads from any caller. The Zendesk endpoint has no HMAC signature verification (Zendesk provides `X-Zendesk-Webhook-Signature-256`). The automated endpoint has no bearer token or shared-secret check. An attacker can flood the system with fake work items or inject malicious content without restriction.
- **Remediation:** For `/api/intake/zendesk`: verify the `X-Zendesk-Webhook-Signature-256` header using a pre-shared secret stored in an environment variable. For `/api/intake/automated`: require a bearer token or HMAC-signed request. Both should enforce rate limits (see COMP-006).

---

### COMP-005: No TLS / HTTPS Enforcement
- **Severity:** **High**
- **Framework/Control:** OWASP-ASVS L2 V9.1.1, V9.1.2
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The application listens on plain HTTP with no TLS termination, no HTTPS redirect, and no HSTS header. All API traffic — including any future credential tokens — is transmitted in plaintext. Even if deployed behind a TLS-terminating reverse proxy, the application does not enforce that traffic arrived over a secure channel (no `X-Forwarded-Proto` check or secure cookie flag).
- **Remediation:** At minimum, enforce TLS at the reverse proxy (nginx/Caddy) and add `app.use(helmet())` with HSTS enabled. For direct connections, configure HTTPS with a valid certificate. Add a redirect from HTTP to HTTPS if the app handles both.

---

### COMP-006: No Rate Limiting on Any Endpoint
- **Severity:** **Medium**
- **Framework/Control:** OWASP-ASVS L2 V2.2.1, V4.2.2
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No rate-limiting middleware is present. All endpoints — including state-transition actions, intake webhooks, and search — are unbounded. This enables credential-stuffing (once auth exists), DoS via work-item flood, and data enumeration via high-limit pagination (see COMP-007).
- **Remediation:** Add `express-rate-limit` at the application level with tiered limits: 100 req/min for general API, 20 req/min for workflow mutation endpoints, 5 req/min for intake webhooks.

---

### COMP-007: No Maximum Pagination Limit — Full Data Enumeration Risk
- **Severity:** **Medium**
- **Framework/Control:** OWASP-ASVS L2 V4.2.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/routes/dashboard.ts:18`, `Source/Backend/src/store/workItemStore.ts:35`
- **Observation:** The `limit` query parameter is parsed as-is with no maximum cap:
  ```typescript
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  ```
  An unauthenticated caller can request `GET /api/work-items?limit=999999` to return the entire dataset in one response, bypassing any pagination intent. This is an enumeration vector.
- **Remediation:** Enforce a maximum limit (e.g., 100) in the store and route handlers: `const limit = Math.min(pagination.limit ?? 20, 100);`. Return a 400 if the requested limit exceeds the cap.

---

### COMP-008: No HTTP Security Headers (Missing Helmet / CSP / HSTS)
- **Severity:** **Medium**
- **Framework/Control:** OWASP-ASVS L2 V14.4.1, V14.4.3, V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No security headers are set. Absent headers include `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`. The API serves JSON responses so CSP impact is lower, but a shared origin or future HTML response renders this a meaningful risk.
- **Remediation:** `npm install helmet` and add `app.use(helmet())` as the first middleware in `app.ts`. Configure `contentSecurityPolicy` explicitly.

---

### COMP-009: No CORS Policy Configured
- **Severity:** **Medium**
- **Framework/Control:** OWASP-ASVS L2 V14.4.7
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is registered. Express does not set `Access-Control-Allow-Origin`. In development this is handled by Vite's proxy (`server.proxy` in `vite.config.ts`), but the backend is directly accessible on port 3001 without any origin restriction. Any web page can make credentialed cross-origin requests to the API.
- **Remediation:** Add `cors` middleware with an explicit allowlist: `app.use(cors({ origin: ['http://localhost:5173'], credentials: true }))`. In production, restrict to the known frontend domain only.

---

### COMP-010: Prometheus /metrics Endpoint is Unauthenticated
- **Severity:** **Medium**
- **Framework/Control:** OWASP-ASVS L2 V4.2.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts:34`
- **Observation:** `GET /metrics` is publicly accessible and exposes internal operational data including item counts by source/type, dispatch rates by team, and cycle detection frequencies. This provides an attacker with a reconnaissance surface — work item volumes, team assignments, and pipeline activity patterns are leaked without any authentication.
- **Remediation:** Restrict `/metrics` to internal network only (reverse proxy allow-list) or add token-based authentication. A common pattern is a static bearer token via environment variable checked in the route handler.

---

### COMP-011: Route Exception Messages Forwarded Directly to Clients
- **Severity:** **Low**
- **Framework/Control:** OWASP-ASVS L2 V7.4.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (multiple `catch` blocks), `Source/Backend/src/routes/workItems.ts`
- **Observation:** The global `errorHandler` middleware correctly returns a generic `{ error: 'Internal server error' }`. However, individual route `catch` blocks forward raw exception messages to the client:
  ```typescript
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
  ```
  If an internal service (store, dependency service) throws with implementation detail in the message, that detail reaches the HTTP client.
- **Remediation:** In `catch` blocks, log the full error internally but return a generic user-facing message. Only pass through messages for known, explicitly user-safe errors (e.g., validation errors thrown with custom `UserError` subclasses).

---

### COMP-012: No GDPR Art. 17 Hard Delete (Right to Erasure)
- **Severity:** **Medium**
- **Framework/Control:** GDPR Art. 17 (Right to Erasure)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts:78`, `Source/Backend/src/routes/workItems.ts:141`
- **Observation:** The `DELETE /api/work-items/:id` endpoint performs a soft delete only — it sets `deleted: true` and retains the record in memory. There is no hard delete or purge path. If/when a database is introduced, soft-deleted records will persist indefinitely. If work items can contain PII in the `description` or `title` fields, this violates the right to erasure requirement.
- **Remediation:** Implement a `purgeWorkItem()` function that permanently removes the record. Expose it via `DELETE /api/work-items/:id?permanent=true` with elevated authorization. Document a data retention policy that specifies soft-deleted items are purged after N days via a scheduled job.

---

### COMP-013: No Data Retention Policy or Scheduled Purge
- **Severity:** **Low**
- **Framework/Control:** GDPR Art. 5(1)(e) (Storage Limitation) · SOC2 CC6.5
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** Soft-deleted items accumulate in the in-memory store with no expiry or scheduled cleanup. There is no documented retention schedule. When persistence is added, this will result in indefinite retention of all work items, including any PII embedded in descriptions.
- **Remediation:** Define a data retention policy (e.g., soft-deleted items purged after 90 days, completed items archived after 1 year). Implement a scheduled job (cron or a `setInterval` in the store) to enforce purges.

---

## Compliance Matrix

| Control ID | Framework | Description | Status |
|---|---|---|---|
| V2.1.1 | OWASP-ASVS L2 | Authentication system present | ❌ FAIL |
| V2.2.1 | OWASP-ASVS L2 | Anti-automation / rate limiting | ❌ FAIL |
| V2.2.2 | OWASP-ASVS L2 | MFA supported | ❌ FAIL |
| V3.1.1 | OWASP-ASVS L2 | Session management | ❌ FAIL |
| V4.1.1 | OWASP-ASVS L2 | Access control enforced at all endpoints | ❌ FAIL |
| V4.1.3 | OWASP-ASVS L2 | Principle of least privilege | ❌ FAIL |
| V4.2.1 | OWASP-ASVS L2 | Per-resource/per-operation authorization | ❌ FAIL |
| V7.1.1 | OWASP-ASVS L2 | No credentials/secrets in logs | ✅ PASS |
| V7.3.1 | OWASP-ASVS L2 | Security events logged | ❌ FAIL |
| V7.4.1 | OWASP-ASVS L2 | Generic error responses to clients | ⚠️ PARTIAL |
| V8.1.1 | OWASP-ASVS L2 | Sensitive data not stored unnecessarily | ✅ PASS |
| V9.1.1 | OWASP-ASVS L2 | TLS enforced for all communications | ❌ FAIL |
| V14.4.1 | OWASP-ASVS L2 | HTTP security headers (Helmet/CSP/HSTS) | ❌ FAIL |
| V14.4.7 | OWASP-ASVS L2 | CORS policy configured | ❌ FAIL |
| CC6.1 | SOC2-Type2 | Logical access controls | ❌ FAIL |
| CC6.2 | SOC2-Type2 | Authentication before system access | ❌ FAIL |
| CC6.3 | SOC2-Type2 | Role-based access control | ❌ FAIL |
| CC7.1 | SOC2-Type2 | System monitoring and audit logging | ⚠️ PARTIAL |
| CC8.1 | SOC2-Type2 | Change management controls | ⚠️ PARTIAL |

**Totals: 2 PASS · 3 PARTIAL · 14 FAIL**
**Pass Rate: ~28%** (5/18 including partials)

---

## Summary & Grade

| Category | Count |
|---|---|
| Critical findings | 1 |
| High findings | 4 |
| Medium findings | 5 |
| Low findings | 2 |
| **Controls Passed** | **5 / 18** |
| **Pass Rate** | **28%** |

**Grade: D**
_(1 critical, pass rate 28% < 60% minimum for grade C)_

---

### Priority Remediation Path

1. **Immediate (Critical):** Implement authentication (COMP-001). Nothing else in the security posture matters until callers can be identified.
2. **Short-term (High):** Add RBAC middleware (COMP-002) · Webhook signature verification (COMP-004) · Enforce TLS via proxy + Helmet (COMP-005, COMP-008) · Add required audit events (COMP-003).
3. **Medium-term:** Rate limiting (COMP-006) · CORS lockdown (COMP-009) · Pagination cap (COMP-007) · Protect `/metrics` (COMP-010).
4. **Backlog:** Hard delete / GDPR erasure path (COMP-012) · Data retention policy (COMP-013) · Standardize exception message forwarding (COMP-011).
