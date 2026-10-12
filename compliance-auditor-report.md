---

## Compliance Audit Report — dev-crew Source App
**Date:** 2026-10-12 | **Frameworks:** OWASP-ASVS L2, SOC2-Type2 | **Auditor:** compliance_auditor (Sonnet)

---

## Findings

### COMP-001: No Authentication Layer on Any API Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 2.1.1, 4.1.1 | SOC2-Type2 CC6.1, CC6.2
- **File/Component:** `Source/Backend/src/app.ts` — all routes
- **Observation:** The entire Express API is completely unauthenticated. There is no authentication middleware, no login endpoint, no JWT/session validation, and no API key scheme. Every endpoint — including state-transition actions (`/approve`, `/reject`, `/dispatch`) and dashboard reads — is open to any unauthenticated caller on the network. The middleware chain only contains `express.json()`, a request debug logger, and the error handler.
- **Remediation:** Add an authentication middleware (e.g., JWT Bearer token validation) applied globally before all route handlers. Implement a login endpoint that issues signed tokens. Consider `passport.js` or a lightweight `jsonwebtoken` guard. For service-to-service calls, use API key validation with `Authorization` header checking.

---

### COMP-002: Required Audit Events Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2-Type2 CC7.1 | OWASP-ASVS 7.2.1, 7.2.2
- **File/Component:** `Source/Backend/src/routes/`, `Source/Backend/src/utils/logger.ts`
- **Observation:** The `security.config.yml` mandates four audit events. Status of each:
  - `login_attempt` — **MISSING.** No authentication layer exists, so this event is never emitted.
  - `permission_denied` — **MISSING.** No authorization layer exists; access is never denied.
  - `state_transition` — **PARTIALLY PRESENT.** Work item status changes are logged (e.g., `'Work item manually approved'`) but they are standard operational logs, not structured audit events. They lack actor identity (the real user ID) — hardcoded strings like `'manual-override'` and `'dispatcher'` are used instead.
  - `data_export` — **MISSING.** No export functionality exists and no log event is defined for bulk data reads.
- **Remediation:** Create a dedicated `auditLog()` function that emits a structured JSON event with fields: `{ event, actor, target, timestamp, outcome, ip }`. Emit `login_attempt` from an auth endpoint, `permission_denied` from authorization middleware, `state_transition` from workflow actions (replacing the actor placeholder strings with a real user identity from the auth context), and `data_export` from any bulk-read or export operation.

---

### COMP-003: No TLS/HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 9.1.1, 9.1.2 | SOC2-Type2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (lines 46–52)
- **Observation:** The application binds to a plain HTTP listener (`app.listen(PORT)`). No TLS termination, redirect from HTTP→HTTPS, or HSTS header is configured in source code. All data (including any future sensitive payloads) travels unencrypted over the wire. While TLS can be handled at a reverse-proxy layer (nginx/load balancer), this is not verifiable from source — and there is no code-level enforcement or security headers (`helmet` is not installed).
- **Remediation:** (1) Install `helmet` (`npm install helmet`) and add `app.use(helmet())` before route registration to set HSTS, X-Frame-Options, and other security headers. (2) Document in `CLAUDE.md` that TLS termination is handled at infrastructure layer, and add an integration test that confirms the `Strict-Transport-Security` header is present in responses. (3) Add a middleware that rejects requests where `X-Forwarded-Proto !== 'https'` when `NODE_ENV === 'production'`.

---

### COMP-004: No Authorization / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 4.1.2, 4.1.3 | SOC2-Type2 CC6.3
- **File/Component:** `Source/Backend/src/routes/workflow.ts` — `/approve`, `/reject`, `/dispatch`
- **Observation:** Even if authentication were added (COMP-001), there is zero authorization logic. Any authenticated user could approve, reject, or dispatch any work item. Privilege-escalating actions (state transitions, assignment to teams) are performed without any role check. The `trackUpdates` call on PATCH uses the hardcoded actor string `'user'` rather than the caller's identity.
- **Remediation:** Define roles (e.g., `reader`, `reviewer`, `approver`, `dispatcher`). Implement a `requireRole(...roles)` middleware factory and apply it per-route: `router.post('/:id/approve', requireRole('approver'), ...)`. Derive the actor identity from the auth token on every mutating operation.

---

### COMP-005: Webhook Intake Endpoints Have No Authentication
- **Severity:** High
- **Framework/Control:** OWASP-ASVS 2.1.1 | SOC2-Type2 CC6.1
- **File/Component:** `Source/Backend/src/routes/intake.ts` — `POST /api/intake/zendesk`, `POST /api/intake/automated`
- **Observation:** The Zendesk and automated intake webhooks accept arbitrary JSON payloads with no authentication or HMAC signature verification. An attacker who knows the endpoint URL can inject unlimited fabricated work items directly into the workflow engine, potentially flooding the system or injecting malicious content in `title`/`description` fields.
- **Remediation:** For `/api/intake/zendesk`: verify the `X-Zendesk-Webhook-Signature` HMAC-SHA256 header using a shared secret stored in an environment variable. For `/api/intake/automated`: add an API key header check (`Authorization: Bearer <INTAKE_API_KEY>`). Reject requests that fail validation with `401`.

---

### COMP-006: Pagination Limit Not Capped — Full Data Enumeration Possible
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 5.1.1 | SOC2-Type2 CC6.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (lines 68–71), `Source/Backend/src/store/workItemStore.ts` (lines 31–32)
- **Observation:** The `limit` query parameter is parsed and passed directly to the store with no upper-bound cap: `limit: req.query.limit ? parseInt(...) : 20`. A caller can send `GET /api/work-items?limit=999999` and receive every work item in a single response, bypassing pagination entirely. This enables full data enumeration in a single request.
- **Remediation:** Add `const limit = Math.min(req.query.limit ? parseInt(...) : 20, 100);` to enforce a maximum of 100 items per page. Document the max-page-size in the API contracts file.

---

### COMP-007: No Actor Identity in Operational Logs or Change History
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 7.1.1, 7.2.1 | SOC2-Type2 CC7.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (lines 113–116, 169–172, 258–265)
- **Observation:** Change history entries use hardcoded actor strings: `'manual-override'`, `'dispatcher'`, `'user'`, `'system'`. Operational logs (`logger.info(...)`) never include a `userId`, `userEmail`, or `requestId`. This means the audit trail cannot answer "who did what" — a core SOC2 CC7.1 requirement. Log correlation across requests is also impossible without a `requestId`.
- **Remediation:** (1) Extract actor identity from the auth token (once COMP-001 is fixed) and thread it through all service calls. (2) Add a request ID middleware (`npm install uuid`) that generates a `requestId` per request and injects it into all log calls via `AsyncLocalStorage` or `req.requestId`. (3) Replace hardcoded actor strings in `buildChangeEntry` calls with the real authenticated user ID.

---

### COMP-008: No Hard Delete / Right to Erasure Mechanism
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 (Right to Erasure) | OWASP-ASVS 8.3.4
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (line 78–89), `Source/Backend/src/routes/workItems.ts` (lines 141–150)
- **Observation:** The `DELETE /api/work-items/:id` endpoint performs only a soft delete (`item.deleted = true`). The item remains in the in-memory store indefinitely and is returned by `getAllItems` callers that don't filter on `deleted`. There is no hard-delete endpoint, no data purge mechanism, and no retention policy. While the current data model contains no PII fields matching `sensitive_fields`, the `title` and `description` fields of work items could contain user-entered PII in practice.
- **Remediation:** Implement a `purgeWorkItem(id)` function that removes the item from the Map entirely. Expose it as a privileged admin endpoint (gated by role, per COMP-004). Document the data retention policy (e.g., soft-deleted items purged after 30 days). If a persistent database is added in future, implement a scheduled purge job.

---

### COMP-009: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS 2.2.1 | SOC2-Type2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** There is no rate-limiting middleware on any route. The intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) and workflow action endpoints (`/approve`, `/dispatch`) are particularly at risk — an attacker can flood them with requests at unlimited rate, causing denial of service or work-item store flooding.
- **Remediation:** Install `express-rate-limit` and apply a global limiter (e.g., 100 req/min per IP) and a tighter limiter on intake and state-transition endpoints (e.g., 10 req/min per IP).

---

### COMP-010: No Correlation / Trace IDs in Log Entries
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS 7.1.3
- **File/Component:** `Source/Backend/src/utils/logger.ts`
- **Observation:** The `CLAUDE.md` architecture rules mandate OpenTelemetry tracing with W3C `traceparent` propagation. However, the logger emits no `traceId`, `spanId`, or `requestId` fields. Log entries cannot be correlated across a single request's lifecycle, making incident investigation difficult.
- **Remediation:** Integrate `@opentelemetry/sdk-node` (or `pino`'s built-in serializers). Add a request middleware that extracts/generates the `traceparent` and injects `traceId`/`spanId` into all log entries for that request via `AsyncLocalStorage`.

---

## Compliance Matrix

| Framework | Control ID | Description | Status |
|-----------|-----------|-------------|--------|
| **OWASP-ASVS L2** | V2 (Auth) | Authentication required before access | ❌ FAIL |
| OWASP-ASVS L2 | V3 (Session Mgmt) | Session timeouts / secure tokens | ❌ FAIL |
| OWASP-ASVS L2 | V4 (Access Control) | Role-based authorization on all routes | ❌ FAIL |
| OWASP-ASVS L2 | V5 (Input Validation) | Pagination limit capped; enum validation | ⚠️ PARTIAL |
| OWASP-ASVS L2 | V6 (Cryptography) | Sensitive data encrypted at rest | ⚠️ PARTIAL* |
| OWASP-ASVS L2 | V7 (Logging) | Sufficient structured logging | ⚠️ PARTIAL |
| OWASP-ASVS L2 | V9 (Communications) | TLS enforced for all traffic | ❌ FAIL |
| **SOC2-Type2** | CC6.1 | Logical access controls implemented | ❌ FAIL |
| SOC2-Type2 | CC6.2 | User registration & access authorization | ❌ FAIL |
| SOC2-Type2 | CC6.3 | Access revocation & removal process | ❌ FAIL |
| SOC2-Type2 | CC7.1 | System monitoring & audit events | ⚠️ PARTIAL |
| SOC2-Type2 | CC8.1 | Change management audit trail | ⚠️ PARTIAL |

> *V6 partial: `sensitive_fields` in config (email, password, token, secret, api_key) do not appear in the current WorkItem schema — no at-rest encryption gap for the current data model. Gap exists if PII enters `title`/`description` or if a database is added.

**Summary:** 2 of 12 controls PARTIAL-pass, 0 fully pass, 10 fail or partially fail.
**Pass rate: ~17%** — below the 90% threshold for Grade A, 75% for Grade B, and 60% for Grade C.
**Projected grade: D** (>2 High findings; no critical exploits confirmed by red-team yet).

---

## Prioritized Remediation Roadmap

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| P1 | COMP-001 — Add JWT authentication middleware | Medium | Unlocks CC6.1, CC6.2, V2 |
| P1 | COMP-005 — Webhook HMAC signature verification | Low | Closes critical injection vector |
| P1 | COMP-002 — Emit required audit events | Medium | CC7.1, V7.2 |
| P2 | COMP-004 — Add RBAC / route authorization | Medium | CC6.3, V4 |
| P2 | COMP-003 — Add `helmet`, document TLS at infra | Low | V9, CC6.1 |
| P2 | COMP-009 — Rate limiting with `express-rate-limit` | Low | V2.2.1, CC6.1 |
| P3 | COMP-006 — Cap pagination limit to max 100 | Very Low | V5 |
| P3 | COMP-007 — Thread actor identity through logs | Medium | V7.1, CC7.1 |
| P3 | COMP-008 — Hard-delete / purge endpoint | Low | GDPR Art. 17 |
| P4 | COMP-010 — OpenTelemetry trace ID in logs | Medium | V7.1.3 |
