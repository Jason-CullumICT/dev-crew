Dashboard not in a pipeline run — proceeding with the full report output.

---

# Compliance Audit Report — dev-crew Source App

**Date:** 2026-11-02 | **Frameworks:** OWASP-ASVS L2, SOC2 Type 2 (CC6.1–CC6.3, CC7.1, CC8.1)
**Auditor:** compliance_auditor | **Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

## Findings

---

### COMP-001: No Authentication on Any API Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · SOC2 CC6.2 · OWASP-ASVS V2.1.1 · OWASP-ASVS V4.1.1
- **File/Component:** `Source/Backend/src/app.ts` — all routes
- **Observation:** The Express application registers zero authentication middleware. Every endpoint — including privileged state-mutation operations such as `/api/work-items/:id/approve`, `/api/work-items/:id/dispatch`, and `/api/intake/*` — is fully accessible to any unauthenticated caller that can reach port 3001. No JWT validation, API-key check, session cookie, or any identity mechanism exists anywhere in the codebase. Neither `passport`, `express-jwt`, nor any auth library appears in `package.json`.
- **Remediation:** Introduce an authentication layer (JWT bearer tokens is the typical fit for this stack). Add `authenticate` middleware before all state-mutation routes. Protect read routes at minimum with a shared API key for system callers. Document the identity model in a specification before implementation.

---

### COMP-002: No Authorization / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 · OWASP-ASVS V4.1.2 · OWASP-ASVS V4.2.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** Beyond the absence of authentication (COMP-001), there is also no authorization layer. Approve, reject, dispatch, and route actions have no caller-identity check whatsoever — any request body wins. The principle of least privilege is entirely absent: there are no roles (e.g., reviewer, approver, dispatcher), no permission checks, and no per-resource ownership model. The `agent` field in `ChangeHistoryEntry` is hard-coded to strings like `'manual-override'` and `'dispatcher'` rather than derived from a real authenticated identity.
- **Remediation:** Define a role model (e.g., `submitter`, `reviewer`, `approver`, `dispatcher`) in the specification. Implement `authorize(role)` middleware that reads the verified identity from the request. Map roles to allowed actions per endpoint.

---

### COMP-003: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS V9.1.1 · OWASP-ASVS V9.1.2
- **File/Component:** `Source/Backend/src/app.ts` (lines 47–51), `Source/Frontend/vite.config.ts` (proxy config)
- **Observation:** The backend binds plain HTTP (`app.listen(PORT, ...)`). There is no HTTPS redirect, no `Strict-Transport-Security` header, and no TLS termination configuration in the application layer. The frontend Vite proxy targets `http://localhost:3001`. All data in transit — including work item content and all workflow state changes — is transmitted unencrypted.
- **Remediation:** Terminate TLS at the reverse proxy level (nginx/Caddy) and enforce HTTPS-only. Add `Strict-Transport-Security` via Helmet.js. Ensure the proxy config for production uses HTTPS. Document the TLS termination architecture in the deployment specification.

---

### COMP-004: Missing HTTP Security Headers (No Helmet.js)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.1 · OWASP-ASVS V14.4.3 · OWASP-ASVS V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** Helmet.js (or equivalent) is absent from the dependency list and not applied in `app.ts`. The following headers are missing on all responses:
  - `Content-Security-Policy` (XSS mitigation)
  - `X-Frame-Options` / `frame-ancestors` (clickjacking)
  - `X-Content-Type-Options: nosniff` (MIME sniffing)
  - `Strict-Transport-Security` (HSTS)
  - `Referrer-Policy`
  - `Permissions-Policy`
- **Remediation:** Add `helmet` to `dependencies` and apply `app.use(helmet())` early in the middleware chain in `app.ts`. Configure CSP for the frontend origin. This is a one-line fix with large security surface reduction.

---

### COMP-005: No CORS Policy — All Origins Accepted
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V13.1.3 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The Express application has no `cors()` middleware configured. For simple cross-origin GET requests, browsers send these without a preflight — meaning the backend responds to any origin. For preflight-required requests (POST with `application/json`), the browser will block the response, but this provides no protection from non-browser clients. The intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) can be called by any origin without restriction.
- **Remediation:** Add the `cors` package and configure an explicit allowlist: `app.use(cors({ origin: ['https://app.example.com'], methods: ['GET','POST','PATCH','DELETE'] }))`. Restrict to known frontend origins in production.

---

### COMP-006: Required Audit Event `login_attempt` — Entirely Absent
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.1
- **File/Component:** Entire `Source/Backend/src/` — no auth module exists
- **Observation:** `security.config.yml` requires `login_attempt` to appear in audit logs. Because no authentication system exists, this event is structurally impossible to emit. There is no login endpoint, no credential validation, and no session establishment — therefore no login attempt can be recorded, whether successful or failed.
- **Remediation:** Implement authentication (COMP-001) and ensure every authentication attempt — success and failure — emits a structured `{ event: 'login_attempt', outcome: 'success'|'failure', userId, ip, timestamp }` log entry at `INFO` level. This is a prerequisite for SOC2 CC7.1 compliance.

---

### COMP-007: Required Audit Event `permission_denied` — Entirely Absent
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.1
- **File/Component:** Entire `Source/Backend/src/` — no authz middleware exists
- **Observation:** `security.config.yml` requires `permission_denied` in audit logs. Because there is no authorization layer, no request is ever denied on access-control grounds. Unauthorized access attempts are silently fulfilled rather than logged and blocked.
- **Remediation:** Implement RBAC (COMP-002). Every `403 Forbidden` response must emit `{ event: 'permission_denied', userId, role, resource, action, timestamp }`. Consider a centralized `authorize()` middleware that emits this event before returning 403.

---

### COMP-008: Required Audit Event `data_export` — Not Logged
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.2
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (GET /), `Source/Backend/src/routes/dashboard.ts`
- **Observation:** `security.config.yml` requires `data_export` events in audit logs. The `GET /api/work-items` endpoint returns paginated work item data and the dashboard endpoints return aggregated summaries, but none of these accesses are logged at a meaningful audit level — only a `debug`-level request log is emitted (line 17 of `app.ts`). Bulk data reads are effectively invisible in the audit trail.
- **Remediation:** Add an `INFO`-level structured log entry `{ event: 'data_export', endpoint, caller, recordCount, filters, timestamp }` in `GET /api/work-items` and dashboard routes. Post-auth (COMP-001), include the caller identity.

---

### COMP-009: `state_transition` Audit Events Lack Structured Event Type
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.1
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (multiple handlers)
- **Observation:** `security.config.yml` requires `state_transition` as a named audit event. State transitions are logged with messages like `"Work item manually approved"` and `"Work item dispatched"`, but there is no structured `event: 'state_transition'` field in the log entry. This makes it impossible to query, filter, or alert on state transitions as a class of audit event — e.g., in a SIEM or log aggregation pipeline.
- **Remediation:** Add `event: 'state_transition'` as an explicit field to every workflow state-change log call in `workflow.ts`: `logger.info({ event: 'state_transition', msg: '...', fromStatus, toStatus, workItemId, ... })`.

---

### COMP-010: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V13.4.1 · OWASP-ASVS V2.2.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/intake.ts`
- **Observation:** No rate-limiting middleware (`express-rate-limit` or equivalent) is installed or configured. The intake endpoints — `/api/intake/zendesk` and `/api/intake/automated` — are especially at risk: an attacker or misconfigured webhook can flood the in-memory store with thousands of work items, causing effective denial of service and data integrity issues. Without auth (COMP-001), the attack surface is the entire internet.
- **Remediation:** Install `express-rate-limit` and apply a general limit globally (`100 req/15min per IP`) and a stricter limit on intake and workflow-action routes (`20 req/min per IP`). For intake webhooks specifically, add webhook-signature validation as an alternative caller verification mechanism.

---

### COMP-011: Prometheus `/metrics` Endpoint Unauthenticated
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS V4.1.1
- **File/Component:** `Source/Backend/src/app.ts` (line 34–37)
- **Observation:** The `/metrics` endpoint is registered without any authentication or IP restriction. It exposes operational counters (items created/dispatched per team, route, type), which reveals workflow throughput, team assignments, and system activity patterns to any unauthenticated caller. This is an information-disclosure risk.
- **Remediation:** Restrict `/metrics` to an internal scrape path only. Options: (a) require a `Bearer` scrape token, (b) bind metrics to a separate port (e.g., 9090) that is only accessible on the internal network, or (c) place behind IP allowlist middleware.

---

### COMP-012: No Session Management Implementation
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V3.1.1 · OWASP-ASVS V3.3.1 · OWASP-ASVS V3.3.2
- **File/Component:** `Source/Backend/src/app.ts` — no session middleware
- **Observation:** OWASP-ASVS L2 requires session tokens to expire after inactivity (V3.3.1: ≤30 min for sensitive operations) and be invalidated on logout (V3.3.2). No session management exists because there is no authentication (COMP-001). When authentication is added, session lifetime and invalidation policies must be part of the implementation from the start.
- **Remediation:** When implementing auth (COMP-001), use short-lived JWT access tokens (≤15 min) with refresh token rotation, or server-side session with inactivity timeout. Define timeout values in the specification and enforce them in middleware.

---

### COMP-013: No Hard-Delete Mechanism — Right to Be Forgotten Gap
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V8.3.4
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (softDelete), `Source/Backend/src/routes/workItems.ts` (DELETE handler)
- **Observation:** The `DELETE /api/work-items/:id` endpoint performs a soft delete only (`item.deleted = true`). The item remains in the in-memory store and is accessible via direct store inspection. If/when a persistent storage layer is added, there will be no hard-delete path to honor erasure requests. The `findById` function excludes deleted items, but there is no purge function.
- **Remediation:** Add a `purgeWorkItem(id)` function to the store that physically removes the entry. Expose it behind a privileged admin endpoint (once auth exists). Document that persistent storage implementations must honour this purge on the underlying medium. Note: with the current in-memory store, all data is lost on restart, so the practical risk is limited to the running session.

---

### COMP-014: No Persistent Storage — Data Integrity and Backup Gap
- **Severity:** Low
- **Framework/Control:** SOC2 CC8.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All work item data is held in a JavaScript `Map` in process memory. There is no database, no file persistence, and no backup mechanism. All data is lost on process restart. SOC2 CC8.1 requires that change management processes include availability protections. While the current design may be intentional for a prototype, it makes data durability and disaster recovery impossible.
- **Remediation:** For production readiness, replace the in-memory store with a persistent database (PostgreSQL, SQLite, etc.). Define a backup and recovery policy. Until then, document in the specification that the system is not production-grade and data loss on restart is expected.

---

### COMP-015: Sensitive Fields Configuration vs. Actual Data Model Mismatch
- **Severity:** Low
- **Framework/Control:** SOC2 CC6.1 · OWASP-ASVS V8.2.1
- **File/Component:** `Teams/TheGuardians/security.config.yml` vs. `Source/Shared/types/workflow.ts`
- **Observation:** `security.config.yml` lists `email`, `password`, `token`, `secret`, `api_key` as sensitive fields requiring encryption. None of these fields exist in the current `WorkItem` data model or anywhere in the source code. This is not a risk today, but when authentication is added, these fields will be introduced and the team must ensure encryption-at-rest and masking in logs are in place from day one — not retrofitted.
- **Remediation:** When adding authentication, enforce: (1) passwords stored as bcrypt/argon2 hashes only, never plaintext; (2) tokens/api_keys stored as hashed values with only the hash persisted; (3) email masked in log output (`u***@example.com`); (4) add a log sanitizer that strips/masks these fields from all log entries.

---

## Compliance Matrix

| Control ID | Framework | Description | Status | Finding |
|---|---|---|---|---|
| CC6.1 | SOC2 Type 2 | Logical & physical access controls; TLS | ❌ FAIL | COMP-001, COMP-003, COMP-005, COMP-011 |
| CC6.2 | SOC2 Type 2 | Credential issuance & management | ❌ FAIL | COMP-001, COMP-006 |
| CC6.3 | SOC2 Type 2 | Role-based access / least privilege | ❌ FAIL | COMP-002, COMP-007 |
| CC7.1 | SOC2 Type 2 | System monitoring & audit logging | ⚠️ PARTIAL | COMP-006, COMP-007, COMP-008, COMP-009 |
| CC8.1 | SOC2 Type 2 | Change management / data integrity | ⚠️ PARTIAL | COMP-014 |
| V2 Authentication | OWASP-ASVS L2 | Identity verification controls | ❌ FAIL | COMP-001 |
| V3 Session Mgmt | OWASP-ASVS L2 | Session lifecycle & timeouts | ❌ FAIL | COMP-012 |
| V4 Access Control | OWASP-ASVS L2 | Authorisation & least privilege | ❌ FAIL | COMP-002 |
| V5 Validation | OWASP-ASVS L2 | Input validation & sanitisation | ⚠️ PARTIAL | (enum validation ✓, text fields unvalidated) |
| V7 Error/Logging | OWASP-ASVS L2 | Error handling & audit logging | ⚠️ PARTIAL | COMP-008, COMP-009 |
| V8 Data Protection | OWASP-ASVS L2 | Data lifecycle & erasure | ⚠️ PARTIAL | COMP-013, COMP-015 |
| V9 Communications | OWASP-ASVS L2 | TLS & transport security | ❌ FAIL | COMP-003 |
| V13 API Security | OWASP-ASVS L2 | API auth, CORS, rate limiting | ❌ FAIL | COMP-001, COMP-005, COMP-010 |
| V14 Configuration | OWASP-ASVS L2 | Security headers & hardening | ❌ FAIL | COMP-004 |

**Summary: 5 controls passing/partial · 9 controls failing · Pass rate: ~29%**

---

## Prioritised Remediation Roadmap

| Priority | Finding(s) | Effort | Impact |
|---|---|---|---|
| 🔴 P1 — Do first | COMP-001 (Authentication) | High | Unlocks CC6.1, CC6.2, CC6.3, V2, V4 |
| 🔴 P1 | COMP-002 (RBAC) | Medium | Required after auth |
| 🔴 P1 | COMP-004 (Helmet.js) | Very Low | One-liner, massive surface reduction |
| 🔴 P1 | COMP-005 (CORS policy) | Very Low | One-liner, required for CC6.1 |
| 🟠 P2 | COMP-003 (TLS enforcement) | Medium | Infrastructure + app config |
| 🟠 P2 | COMP-009 (state_transition event field) | Very Low | Add `event:` key to existing log calls |
| 🟠 P2 | COMP-010 (Rate limiting) | Low | express-rate-limit, 30 min install |
| 🟠 P2 | COMP-011 (Metrics auth) | Low | Token or port restriction |
| 🟡 P3 | COMP-006+007 (login/permission events) | Medium | Follows auth implementation |
| 🟡 P3 | COMP-008 (data_export logging) | Low | Add log call to GET handlers |
| 🟡 P3 | COMP-012 (Session policy) | Medium | Define policy; implement with auth |
| 🟢 P4 | COMP-013 (Hard delete) | Low | Add purge fn + admin endpoint |
| 🟢 P4 | COMP-014 (Persistence) | High | Architecture decision required |
| 🟢 P4 | COMP-015 (Field masking spec) | Low | Document now; implement with auth |

---

## Key Observation

The most significant compliance gap is **architectural**: the application has **no identity layer whatsoever**. Nine of the fourteen findings are either caused directly by this absence or are only fixable once it exists. COMP-001 is the prerequisite blocker for the majority of SOC2 and OWASP-ASVS L2 compliance. The good news is that the logging infrastructure (structured JSON, Prometheus metrics), input validation patterns, and error handling are well-built and provide a solid foundation — the security layer simply needs to be built on top of it.
