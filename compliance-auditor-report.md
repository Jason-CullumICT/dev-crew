---

## Compliance Audit Report — dev-crew Source App
**Date:** 2026-05-11 | **Frameworks:** OWASP-ASVS L2, SOC2-Type2 (CC6.1–CC8.1)
**Auditor:** compliance_auditor | **Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

## Findings

### COMP-001: No Authentication Layer — All Endpoints Are Publicly Accessible
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1.1, V4.1.1, V4.1.3 | SOC2 CC6.1, CC6.2
- **File/Component:** `Source/Backend/src/app.ts`, all route handlers under `src/routes/`
- **Observation:** Zero authentication middleware is present. Every API endpoint — `POST /api/work-items`, `POST /api/work-items/:id/approve`, `POST /api/work-items/:id/dispatch`, `GET /api/dashboard/*` — is reachable by any unauthenticated caller. `app.ts` registers routes with no guard. ASVS V4.1.3 requires "deny by default"; the current design is "allow all by default."
- **Remediation:** Implement an authentication mechanism (e.g., JWT bearer tokens, session cookies, or API key for machine clients). Add an authentication middleware that verifies every request before routing it. Enforce deny-by-default: unauthenticated requests receive HTTP 401. Differentiate human callers from machine callers (intake webhooks, CI pipelines).

---

### COMP-002: No Authorization / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1.2, V4.1.3, V4.2.1 | SOC2 CC6.3
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `src/routes/workItems.ts`
- **Observation:** There is no authorization layer. Any caller who can reach the API can approve, reject, dispatch, or delete any work item. High-privilege operations such as `POST /:id/approve` (manual approval override) and `DELETE /:id` (soft delete) require no role or permission. SOC2 CC6.3 requires least-privilege access controls, and ASVS V4 requires that access decisions are enforced server-side.
- **Remediation:** Design and implement RBAC (e.g., roles: `viewer`, `triage-agent`, `approver`, `admin`). Enforce role checks in route handlers or dedicated authorization middleware. Map operations to minimum required roles (e.g., only `approver` role can call `/approve` or `/reject`).

---

### COMP-003: Unauthenticated Webhook Intake Endpoints
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.2.2 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/intake.ts` — `POST /api/intake/zendesk`, `POST /api/intake/automated`
- **Observation:** The Zendesk and automated intake webhooks accept any HTTP POST request without verifying the request origin. Real Zendesk webhooks include an HMAC-SHA256 signature in `X-Zendesk-Webhook-Signature`. Without verifying this signature, a malicious actor can forge work items by POSTing to `/api/intake/zendesk` directly. No secret or signing key validation is performed.
- **Remediation:** Implement HMAC signature validation for Zendesk webhooks (verify `X-Zendesk-Webhook-Signature` against a shared secret stored in environment variables). For the automated endpoint, require a pre-shared API key in a request header. Reject unsigned or unauthenticated requests with HTTP 401.

---

### COMP-004: Missing Required Audit Events — `login_attempt`, `permission_denied`, `data_export`
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 | OWASP-ASVS V7.1.2
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route handlers
- **Observation:** The `security.config.yml` requires these four audit events to be present in logs: `login_attempt`, `permission_denied`, `state_transition`, `data_export`. Of these: (1) `login_attempt` cannot be logged because no authentication system exists; (2) `permission_denied` cannot be logged because no authorization system exists; (3) `state_transition` is captured in-memory in `WorkItem.changeHistory` but is NOT emitted as a structured log event with a consistent event type field; (4) `data_export` is entirely absent. SOC2 CC7.1 requires that threat and anomaly events are detected and logged.
- **Remediation:** After implementing authentication (COMP-001) and authorization (COMP-002), emit structured log events with a dedicated `eventType` field for each required event. For `state_transition`, emit a log entry with `eventType: "state_transition"` on every status change alongside the in-memory history. For `data_export`, emit an audit event whenever bulk data is returned. Persist audit logs to an append-only store.

---

### COMP-005: Audit Log Lacks Authenticated Actor Identity
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V7.1.2 | SOC2 CC7.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`, `src/routes/workflow.ts`
- **Observation:** Change history entries use string literals such as `'user'`, `'system'`, `'dispatcher'`, `'manual-override'` as the `agent` field (e.g., `buildChangeEntry('status', …, 'manual-override', body.reason)`). There is no concept of an authenticated identity. ASVS V7.1.2 requires that audit logs record the user identity. Without authentication (COMP-001), it is structurally impossible to attribute actions to a specific actor.
- **Remediation:** After implementing authentication, extract the authenticated user ID (or service account identifier) from the request context and pass it as the `agent` field to `buildChangeEntry()`. Ensure every state-mutating action records the authenticated actor's ID, not a generic string.

---

### COMP-006: No HTTP Security Headers (Helmet or Equivalent)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.1, V14.4.3, V14.4.6 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No security headers are set on any response. Missing headers include: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`. Express does not set these by default. ASVS V14.4 at Level 2 requires these headers for all responses.
- **Remediation:** Install and configure `helmet` middleware: `app.use(helmet())` in `app.ts`. Tune `Content-Security-Policy` for the API context (consider `default-src 'none'` for a pure API). Enforce HSTS with `includeSubDomains` and `preload` for production.

---

### COMP-007: No CORS Policy Configured
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.8 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is configured. Without an explicit CORS policy, browsers may apply permissive cross-origin behavior depending on the deployment environment. The Vite dev server proxies `/api` to localhost, masking the issue in development. ASVS V14.4.8 requires explicit CORS origin whitelisting.
- **Remediation:** Install the `cors` npm package and configure it with an explicit `origin` allowlist (environment-variable-driven for each deployment tier). Reject requests from unlisted origins with HTTP 403.

---

### COMP-008: Pagination `limit` Parameter Is Unbounded
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.2.1 (data-volume controls) | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts:70`, `src/routes/dashboard.ts:18`, `src/store/workItemStore.ts:35`
- **Observation:** The `limit` query parameter is parsed as an integer but never bounded. A caller can set `?limit=1000000` and receive all records in one response with no restriction. This enables data harvesting and denial-of-service via memory exhaustion. There is no `MAX_LIMIT` constant enforced anywhere in `findAll()` or the dashboard activity handler.
- **Remediation:** Cap the `limit` parameter to a maximum value (e.g., 100 or 200). Add validation: `const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)`. Validate that `limit` is a positive integer (reject NaN, negative values, and non-integer strings with HTTP 400).

---

### COMP-009: Prometheus `/metrics` Endpoint Is Unauthenticated
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.1.1 | SOC2 CC6.3
- **File/Component:** `Source/Backend/src/app.ts:34`
- **Observation:** The `/metrics` endpoint exposes Prometheus counters for all workflow operations (items created, routed, assessed, dispatched, dependency events) with no authentication. While this is operational data rather than PII, it reveals internal system behaviour, throughput, and error patterns to any unauthenticated caller. SOC2 CC6.3 (least-privilege) requires that operational telemetry is accessible only to authorized monitoring systems.
- **Remediation:** Restrict `/metrics` access to internal networks (e.g., bind a separate metrics server to localhost or a private IP), or protect it with a bearer token checked against an environment variable (`METRICS_TOKEN`). Alternatively, use a network-level control (reverse proxy, firewall rule) to block external access.

---

### COMP-010: No TLS/HTTPS Enforcement at Application Level
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V9.1.1, V9.1.2 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The application server starts on `PORT` (default 3001) with no HTTPS redirect middleware, no `Strict-Transport-Security` header (see COMP-006), and no enforcement that incoming connections use TLS. All data in transit (including any future authentication tokens or sensitive payload fields) is transmitted unencrypted unless a reverse proxy enforces TLS. ASVS V9.1.1 requires TLS for all communications.
- **Remediation:** Enforce TLS at the reverse proxy or load balancer level and document this requirement. Add `HSTS` header (via COMP-006 remediation). Add a middleware that redirects HTTP to HTTPS when `NODE_ENV=production`. Document the expected deployment topology (TLS termination point).

---

### COMP-011: In-Memory Data Store — No Persistence, No Encryption at Rest
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V8.1.1 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All application state is stored in a JavaScript `Map` in process memory. There is no database, no persistence layer, and therefore no encryption at rest. All data is lost on process restart. For a production system, SOC2 CC6.1 requires that sensitive data at rest is protected. ASVS V8.1.1 requires that sensitive data (if any) is stored using appropriate encryption.
- **Remediation:** Replace the in-memory store with a persistent database (e.g., PostgreSQL). Enable database encryption at rest via disk-level encryption (filesystem or cloud provider feature). If the database handles any PII or secrets in future, apply field-level encryption for those specific columns.

---

### COMP-012: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V11.1.4 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No rate limiting middleware is applied. An attacker can submit unlimited requests to any endpoint — including state-mutating operations like `POST /api/work-items/:id/approve` — without throttling. This enables brute-force attacks (post-authentication), resource exhaustion, and denial-of-service.
- **Remediation:** Install `express-rate-limit` or equivalent. Apply a global rate limit (e.g., 100 requests/minute per IP) and tighter limits on sensitive or expensive operations (e.g., assessment, dispatch). Return HTTP 429 with a `Retry-After` header on breach.

---

### COMP-013: No `express.json()` Body Size Limit Configured
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V13.2.1
- **File/Component:** `Source/Backend/src/app.ts:13`
- **Observation:** `app.use(express.json())` is called without an explicit `limit` option. Express defaults to 100 KB, which may be insufficient protection against large-payload attacks if upstream proxies do not enforce their own limits. Explicitly documenting and configuring this limit hardens the defence-in-depth posture.
- **Remediation:** Set an explicit body size limit: `app.use(express.json({ limit: '10kb' }))`. Adjust the limit based on the maximum expected payload size for work item creation (title + description fields).

---

### COMP-014: `state_transition` Events Lack Tamper-Evidence
- **Severity:** Low
- **Framework/Control:** SOC2 CC7.1 | OWASP-ASVS V7.3.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`, `src/models/WorkItem.ts`
- **Observation:** State transitions are recorded in `WorkItem.changeHistory`, but this array is stored in-memory alongside the work item and can be arbitrarily overwritten via `store.updateWorkItem(id, { changeHistory: … })`. Multiple route handlers do exactly this (e.g., `workflow.ts:118`). There is no append-only audit log; the history is mutable. ASVS V7.3.1 requires that audit records cannot be deleted or modified.
- **Remediation:** Move audit events to a separate, append-only log store that is not modifiable via the normal update path. In a database implementation, this would be a separate `audit_log` table with no `UPDATE`/`DELETE` grants. At minimum, remove the ability to overwrite `changeHistory` through the `updateWorkItem` API by making it an append-only field.

---

### COMP-015: No OpenTelemetry Instrumentation Despite Architecture Mandate
- **Severity:** Low
- **Framework/Control:** SOC2 CC7.1 (Monitoring) | CLAUDE.md Architecture Rule
- **File/Component:** `Source/Backend/src/utils/logger.ts`, `src/app.ts`
- **Observation:** `CLAUDE.md` mandates OpenTelemetry for distributed tracing with W3C `traceparent` header propagation and trace/span ID injection into logs. No OpenTelemetry packages are present in `package.json`, no tracing middleware is configured in `app.ts`, and log entries contain no `traceId` or `spanId` fields. This violates both the architectural rule and SOC2 CC7.1 (monitoring and anomaly detection).
- **Remediation:** Install `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`. Initialize the SDK before the Express app starts. Inject `traceId`/`spanId` into the structured logger context. Propagate the W3C `traceparent` header across service calls.

---

## Compliance Matrix

| Control ID | Description | Framework | Status | Finding |
|---|---|---|---|---|
| OWASP-ASVS V2.1.1 | Password / credential requirements | OWASP-ASVS L2 | ❌ FAIL | COMP-001 — No auth system |
| OWASP-ASVS V2.2.1 | MFA support | OWASP-ASVS L2 | ❌ FAIL | COMP-001 — No auth system |
| OWASP-ASVS V3.2.1 | Session token generation | OWASP-ASVS L2 | ❌ FAIL | COMP-001 — No session management |
| OWASP-ASVS V3.3.1 | Session logout / invalidation | OWASP-ASVS L2 | ❌ FAIL | COMP-001 — No session management |
| OWASP-ASVS V4.1.1 | Principle of least privilege | OWASP-ASVS L2 | ❌ FAIL | COMP-002, COMP-009 |
| OWASP-ASVS V4.1.3 | Deny by default | OWASP-ASVS L2 | ❌ FAIL | COMP-001 — all endpoints open |
| OWASP-ASVS V4.2.1 | Data volume / pagination controls | OWASP-ASVS L2 | ❌ FAIL | COMP-008 |
| OWASP-ASVS V4.2.2 | Webhook/API authentication | OWASP-ASVS L2 | ❌ FAIL | COMP-003 |
| OWASP-ASVS V7.1.2 | Audit log with user identity | OWASP-ASVS L2 | ❌ FAIL | COMP-004, COMP-005 |
| OWASP-ASVS V7.3.1 | Audit log tamper-evidence | OWASP-ASVS L2 | ❌ FAIL | COMP-014 |
| OWASP-ASVS V7.4.1 | No sensitive data in logs (client-facing) | OWASP-ASVS L2 | ✅ PASS | errorHandler returns generic message |
| OWASP-ASVS V8.1.1 | Sensitive data encryption at rest | OWASP-ASVS L2 | ❌ FAIL | COMP-011 — in-memory only |
| OWASP-ASVS V9.1.1 | TLS for all communications | OWASP-ASVS L2 | ❌ FAIL | COMP-010 |
| OWASP-ASVS V11.1.4 | Rate limiting | OWASP-ASVS L2 | ❌ FAIL | COMP-012 |
| OWASP-ASVS V13.2.1 | Input validation / body size limit | OWASP-ASVS L2 | ⚠️ PARTIAL | COMP-013 — default Express limit only |
| OWASP-ASVS V14.4.1 | HTTP security headers | OWASP-ASVS L2 | ❌ FAIL | COMP-006 |
| OWASP-ASVS V14.4.8 | CORS origin allowlist | OWASP-ASVS L2 | ❌ FAIL | COMP-007 |
| SOC2 CC6.1 | Logical access / encryption controls | SOC2-Type2 | ❌ FAIL | COMP-001, COMP-010, COMP-011 |
| SOC2 CC6.2 | Authentication enforced | SOC2-Type2 | ❌ FAIL | COMP-001 |
| SOC2 CC6.3 | Least-privilege access | SOC2-Type2 | ❌ FAIL | COMP-002, COMP-009 |
| SOC2 CC7.1 | Threat monitoring / audit logging | SOC2-Type2 | ⚠️ PARTIAL | COMP-004, COMP-005, COMP-015 — ops logs exist but required events missing |
| SOC2 CC8.1 | Change management tracking | SOC2-Type2 | ⚠️ PARTIAL | COMP-014 — WorkItem changeHistory exists but is mutable and in-memory |

**Summary: 1 PASS | 3 PARTIAL | 17 FAIL | Pass Rate: ~19%**

---

## Prioritised Remediation Roadmap

| Priority | Finding(s) | Effort | Impact |
|---|---|---|---|
| P1 — Critical | COMP-001: Authentication layer | High | Unlocks all auth-dependent controls |
| P1 — Critical | COMP-002: RBAC / Authorization | Medium | CC6.3, ASVS V4 |
| P1 — Critical | COMP-003: Webhook signature validation | Low | Prevents forged intake |
| P2 — High | COMP-006: HTTP security headers (helmet) | Very Low | 3 ASVS controls in 1 line |
| P2 — High | COMP-007: CORS policy | Very Low | ASVS V14.4.8 |
| P2 — High | COMP-008: Pagination limit cap | Very Low | DoS prevention |
| P2 — High | COMP-012: Rate limiting | Low | ASVS V11.1.4 |
| P3 — Medium | COMP-004/005: Required audit events + actor identity | Medium | SOC2 CC7.1 |
| P3 — Medium | COMP-009: Protect /metrics | Low | CC6.3 |
| P3 — Medium | COMP-010: TLS enforcement | Low | ASVS V9.1.1 |
| P3 — Medium | COMP-011: Persistent + encrypted DB | High | ASVS V8.1.1 |
| P4 — Low | COMP-013: Body size limit | Very Low | Defence in depth |
| P4 — Low | COMP-014: Append-only audit log | Medium | ASVS V7.3.1 |
| P4 — Low | COMP-015: OpenTelemetry instrumentation | Medium | SOC2 CC7.1 |

---

**Grade per `security.config.yml` grading scale:** `F` *(pre-breach classification — 17 controls failed, pass rate 19%, below minimum 60% threshold for grade C; 0 critical in the "confirmed breach" sense, but architectural absence of authentication constitutes grade D/F territory)*
