---

## Compliance Audit Report — dev-crew Source App
**Date:** 2026-08-10 | **Frameworks:** OWASP-ASVS L2, SOC2-Type2 (CC6.1–CC6.3, CC7.1, CC8.1)

---

### COMP-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High (Critical-equivalent)
- **Framework/Control:** SOC2 CC6.1, CC6.2, CC6.3 | OWASP-ASVS 4.1.1, 4.1.2, 4.1.3, 2.1.1
- **File/Component:** `Source/Backend/src/app.ts`, all route files under `Source/Backend/src/routes/`
- **Observation:** Every API endpoint — including state-transition actions (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`), CRUD operations, the dashboard, and the intake webhooks — accepts requests with zero authentication. There is no middleware performing identity verification (no JWT validation, no session check, no API-key gate). Any anonymous caller on the network can create, modify, delete, approve, or dispatch work items. There is no RBAC: all callers are implicitly "admin."
- **Remediation:** Introduce an authentication middleware (JWT or API-key) applied globally in `app.ts` before all route registrations. Define roles (e.g., `viewer`, `operator`, `admin`) and apply role checks per route. Use a library such as `express-jwt` + `jsonwebtoken` or a purpose-built identity provider. Require MFA for admin-role operations to meet ASVS 2.2.

---

### COMP-002: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 9.1.1, 9.1.2 | SOC2 CC6.1 | ISO27001 A.10.1.1
- **File/Component:** `Source/Backend/src/app.ts` (HTTP-only `app.listen`), `Source/Frontend/vite.config.ts` (proxy to `http://localhost:3001`)
- **Observation:** The backend Express server starts a plain HTTP listener on `PORT` (default 3001) with no TLS context. The frontend Vite dev-server proxies to `http://localhost:3001`. There is no redirect from HTTP to HTTPS and no HSTS header. In any non-localhost deployment, all data — including work item descriptions and operation metadata — travels in plaintext.
- **Remediation:** Terminate TLS at the server or at a reverse proxy (nginx/Caddy). Configure an HSTS response header (`Strict-Transport-Security: max-age=63072000; includeSubDomains`). Add an HTTP→HTTPS redirect. In production, provision a valid certificate via Let's Encrypt or the org's PKI.

---

### COMP-003: Missing Security HTTP Headers
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 14.4.1–14.4.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The Express app applies no security headers. The following are absent: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`. This exposes users to clickjacking, MIME-sniffing, and information-leakage attacks.
- **Remediation:** Add `helmet` as a dependency (`npm install helmet`) and apply it as the first middleware in `app.ts`: `app.use(helmet())`. Configure a restrictive CSP that explicitly lists allowed sources for scripts, styles, and frames.

---

### COMP-004: No Rate Limiting on Any Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 4.2.2, 13.1.1 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`
- **Observation:** All endpoints are unrestricted. A single client can issue unlimited requests per second, enabling denial-of-service, credential-stuffing (if auth is added later), and brute-force enumeration of work-item IDs. Additionally, the `?limit=` pagination parameter has no upper-bound cap — a caller may pass `?limit=999999` to retrieve the entire dataset in a single response, bypassing pagination intent.
- **Remediation:** Apply `express-rate-limit` globally and with stricter limits on mutation endpoints. Add a `MAX_PAGE_LIMIT = 100` constant and enforce it in `workItemStore.findAll()` and `dashboardService.getActivity()`.

---

### COMP-005: Required Audit Events Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route and service files
- **Observation:** The `security.config.yml` mandates four audit events. Current status:

  | Required Event | Status | Notes |
  |---|---|---|
  | `login_attempt` | ❌ ABSENT | No auth system; event never possible |
  | `permission_denied` | ❌ ABSENT | No access control layer; event never possible |
  | `state_transition` | ⚠️ PARTIAL | `changeHistory` records mutations in-app but they are not emitted as structured audit-log events |
  | `data_export` | ❌ ABSENT | No logging on list/export endpoints |

  The existing logger emits no dedicated audit-level events with the required structure (who, what, when, outcome).
- **Remediation:** Create a dedicated `auditLog()` function in `utils/logger.ts` that emits a structured JSON record with fields: `event_type`, `actor_id`, `resource_id`, `outcome`, `timestamp`, `source_ip`. Emit `state_transition` on every status change in workflow routes. Once auth is implemented, emit `login_attempt` and `permission_denied` events.

---

### COMP-006: No CORS Policy Configured
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 14.5.3 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No `Access-Control-Allow-Origin` policy is set. The Express server relies on browser defaults. Any web page on any origin can make cross-origin requests to the API and read responses, enabling cross-site data exfiltration once auth tokens exist.
- **Remediation:** Add the `cors` package (`npm install cors`) and configure an allowlist of permitted origins: `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }))`. Never use wildcard `*` with credentials.

---

### COMP-007: Prometheus `/metrics` Endpoint Publicly Accessible
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 | OWASP-ASVS 4.1.1
- **File/Component:** `Source/Backend/src/app.ts` (line 34–37)
- **Observation:** The `/metrics` endpoint returns raw Prometheus metrics including counters per work-item type, route, verdict, and team assignment. This leaks operational intelligence about system load and business data to any anonymous caller, violating least-privilege access.
- **Remediation:** Protect `/metrics` with either IP allowlisting (restrict to Prometheus scraper IP) or a bearer-token check (`Authorization: Bearer <METRICS_TOKEN>`). Do not apply this to health checks, which are intentionally public.

---

### COMP-008: Intake Webhooks Accept Requests Without Signature Verification
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 4.2.1 | SOC2 CC6.3
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** Both `/api/intake/zendesk` and `/api/intake/automated` accept any `POST` without verifying the request's authenticity. Zendesk signs its webhooks with HMAC-SHA256; this signature is not validated. Any caller can forge intake events and inject arbitrary work items into the system.
- **Remediation:** For the Zendesk webhook: validate the `X-Zendesk-Webhook-Signature` header using `crypto.timingSafeEqual(HMAC-SHA256(body, ZENDESK_WEBHOOK_SECRET))`. For the automated intake endpoint: require an `Authorization: Bearer <INTAKE_API_KEY>` header and validate against an environment variable secret.

---

### COMP-009: Audit Logs Lack Caller Identity and Request Correlation IDs
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 | OWASP-ASVS 7.1.1, 7.1.2
- **File/Component:** `Source/Backend/src/utils/logger.ts`, `Source/Backend/src/app.ts`
- **Observation:** The structured logger emits `timestamp`, `level`, and `message` but never includes: the authenticated user's identity (`actor_id`), a per-request correlation/trace ID, or the client IP address. Without these, logs cannot be used to reconstruct "who did what" for SOC2 evidence or incident investigation.
- **Remediation:** In the request-logging middleware in `app.ts`, generate a `requestId` (UUID) per request and attach it to `res.locals`. Pass it through to every log call in route handlers. Once auth is implemented, add the authenticated identity. Consider using `cls-hooked` or `AsyncLocalStorage` to propagate the request context without manual threading.

---

### COMP-010: Audit Logs Not Durably Persisted or Tamper-Protected
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 | ISO27001 A.12.4.1, A.12.4.2
- **File/Component:** `Source/Backend/src/utils/logger.ts`
- **Observation:** All log output goes to `process.stdout` only. In the current containerised setup logs are ephemeral — they are lost if the container restarts. There is no log forwarding to a SIEM, no tamper-protection (append-only store), and no defined retention period. SOC2 evidence collection requires durable, queryable audit records retained for a minimum of 12 months (Type 2 audit period + buffer).
- **Remediation:** Forward logs to a durable destination (e.g., AWS CloudWatch Logs, Datadog, Elasticsearch). Configure a 13-month log retention policy. For the highest assurance, use an append-only log store or WORM-bucket to prevent tampering.

---

### COMP-011: Soft-Delete Only — No Permanent Erasure Capability
- **Severity:** Low
- **Framework/Control:** GDPR Art. 17 (Right to Erasure) | ISO27001 A.8.3.2
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (`softDelete` function)
- **Observation:** The `softDelete()` function sets `deleted = true` but retains all data in the in-memory Map indefinitely. There is no hard-delete API or data-purge mechanism. Once a persistent database layer is added, this pattern will make GDPR Art. 17 compliance impossible without schema changes. Note: the current data model contains no end-user PII (email, name, etc.), so immediate risk is low — but this must be addressed before PII-containing fields (e.g., ticket submitter details from Zendesk) are stored.
- **Remediation:** Implement a `hardDelete(id)` store function and a corresponding `DELETE /api/work-items/:id/purge` endpoint (admin-only). Document the data retention policy and retention period in a data register.

---

### COMP-012: Raw Service Error Messages Forwarded to HTTP Clients
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS 7.4.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (lines 62, 88, 139, 206, 292, etc.)
- **Observation:** In multiple `catch` blocks, the raw `err.message` is passed directly as the HTTP response body (e.g., `res.status(500).json({ error: message })`). Internal error strings from the service layer — which may include stack paths, internal IDs, or implementation details — are exposed to API callers. This aids an attacker in fingerprinting the system.
- **Remediation:** Map service-layer errors to a fixed set of user-facing error codes. Return only the generic string (`"Internal server error"`) for unclassified errors, and log the full message server-side. Use a custom `AppError` class with a `clientMessage` field to separate internal from external messaging.

---

## Compliance Matrix

| Control ID | Framework | Control Description | Status | Finding |
|---|---|---|---|---|
| CC6.1 | SOC2-Type2 | Logical and physical access controls | ❌ FAIL | COMP-001, COMP-004, COMP-006, COMP-007 |
| CC6.2 | SOC2-Type2 | User registration and de-provisioning | ❌ FAIL | COMP-001 (no user management exists) |
| CC6.3 | SOC2-Type2 | Role-based access, least privilege | ❌ FAIL | COMP-001 (no RBAC) |
| CC7.1 | SOC2-Type2 | Security event monitoring and logging | ❌ FAIL | COMP-005, COMP-009, COMP-010 |
| CC8.1 | SOC2-Type2 | Change management and tracking | ⚠️ PARTIAL | `changeHistory` covers in-app mutations; no external audit trail |
| ASVS 2.1.1 | OWASP-ASVS L2 | User passwords not stored in plaintext | ✅ N/A | No user password management in current data model |
| ASVS 2.2.1 | OWASP-ASVS L2 | Anti-automation / MFA controls | ❌ FAIL | COMP-001 (no auth layer) |
| ASVS 4.1.1 | OWASP-ASVS L2 | Enforce access control on every request | ❌ FAIL | COMP-001 |
| ASVS 4.1.2 | OWASP-ASVS L2 | Deny all by default | ❌ FAIL | COMP-001 |
| ASVS 4.1.3 | OWASP-ASVS L2 | Least privilege principle | ❌ FAIL | COMP-001 |
| ASVS 4.2.2 | OWASP-ASVS L2 | Rate limiting and anti-DoS | ❌ FAIL | COMP-004 |
| ASVS 7.1.1 | OWASP-ASVS L2 | Audit log content (who, what, when) | ❌ FAIL | COMP-009 |
| ASVS 7.4.1 | OWASP-ASVS L2 | No stack traces or sensitive info in responses | ⚠️ PARTIAL | Generic 500 in errorHandler ✅; raw messages in catch blocks ⚠️ |
| ASVS 9.1.1 | OWASP-ASVS L2 | TLS enforced for all connections | ❌ FAIL | COMP-002 |
| ASVS 13.1.1 | OWASP-ASVS L2 | API rate limiting and request size limits | ❌ FAIL | COMP-004 |
| ASVS 14.4.1 | OWASP-ASVS L2 | HTTP security headers present | ❌ FAIL | COMP-003 |
| ASVS 14.5.3 | OWASP-ASVS L2 | CORS policy restricts origins | ❌ FAIL | COMP-006 |

**Summary:**

| | Count |
|---|---|
| Controls Passed | 2 |
| Controls Failed | 13 |
| **Pass Rate** | **13%** |

---

## Grading Assessment

Per `security.config.yml` grading thresholds:

| Grade | Criteria | Meets? |
|---|---|---|
| A | 0 critical, ≤2 high, ≥90% pass rate | ❌ |
| B | 0 critical, ≤6 high, ≥75% pass rate | ❌ |
| C | ≤1 critical, ≤12 high, ≥60% pass rate | ❌ |
| D | ≤2 critical | ❌ (pass rate is disqualifying) |

> **Estimated Grade: D** — COMP-001 (no authentication) is treated as a critical gap; the 13% compliance pass rate is far below the 60% floor required for a C. The application is not suitable for production deployment in its current state.

---

## Priority Remediation Roadmap

1. **Immediate (blocks production):** Implement authentication middleware (COMP-001) and TLS (COMP-002)
2. **Sprint 1:** Add Helmet security headers (COMP-003), CORS policy (COMP-006), and rate limiting (COMP-004)
3. **Sprint 2:** Protect `/metrics` endpoint (COMP-007), add webhook signature verification (COMP-008), add request correlation IDs (COMP-009)
4. **Sprint 3:** Implement structured audit events for `state_transition`, `login_attempt`, `permission_denied` (COMP-005); connect log forwarding to durable storage (COMP-010)
5. **Backlog:** Implement hard-delete for GDPR erasure (COMP-011), standardise error messages (COMP-012)
