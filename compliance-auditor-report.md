The pipeline state is managed by the team leader — the dashboard will be updated when the run is wired in. Now presenting the complete compliance audit:

---

# 🛡️ Compliance Audit Report — dev-crew Source App
**Date:** 2026-04-14 | **Auditor:** compliance_auditor | **Frameworks:** OWASP-ASVS L2 + SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)

---

## Executive Summary

The application is a Node.js/Express workflow engine with a React frontend. After static analysis across all source files, **15 of 21 assessed controls fail**, yielding a **29% compliance pass rate**. The most severe gap is a **complete absence of authentication and authorization** — every API endpoint is publicly accessible with no credentials required. Combined with missing security headers, no TLS enforcement, no rate limiting, and absent required audit events, the application does not meet the minimum security posture for either OWASP-ASVS Level 2 or SOC2-Type 2.

---

## Findings

### COMP-001: No Authentication Layer on Any API Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · CC6.2 | OWASP-ASVS V2.2.1 · V4.1.1 · V4.1.2
- **File/Component:** `Source/Backend/src/app.ts`, all routes
- **Observation:** Zero authentication middleware is registered in the Express application. Every route — including state-mutation endpoints (`/api/work-items/:id/dispatch`, `/approve`, `/reject`, `/route`, `/assess`) and intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) — accepts and processes any unauthenticated HTTP request. There is no JWT validation, no session middleware, no API-key check, and no deny-by-default posture. Any caller on the network can create, modify, or delete work items and trigger state machine transitions.
- **Remediation:** Introduce an authentication middleware (e.g., JWT Bearer token verification or API-key header check) registered before all `app.use('/api/...')` mounts. Enforce a deny-by-default policy: reject all requests that do not carry a valid, verified credential. For SOC2 CC6.2 compliance, define a credential issuance and rotation process.

---

### COMP-002: No Role-Based Access Control (RBAC)
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 | OWASP-ASVS V4.1.3 · V4.2.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts`, `dashboard.ts`
- **Observation:** Once authentication is added (see COMP-001), there is still no authorization layer. All operations — including privileged actions such as approving, rejecting, dispatching work items, and bulk-replacing dependency graphs — are available to any authenticated caller. There is no concept of roles, permissions, or scopes anywhere in the codebase. The principle of least privilege is not applied.
- **Remediation:** Implement RBAC middleware. Define roles (e.g., `viewer`, `operator`, `admin`) and attach authorization checks to each route. Approval, rejection, and dispatch endpoints require elevated privilege. The intake webhook endpoints should be restricted to a dedicated service account.

---

### COMP-003: No TLS / HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 | OWASP-ASVS V9.1.1 · V9.1.2
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The backend binds to a plain HTTP socket (`app.listen(PORT, ...)`). No TLS configuration, no HTTPS redirect middleware, and no `Strict-Transport-Security` header are present. All API traffic — including any future authentication credentials and work item data — transits in cleartext. The frontend Vite proxy (`vite.config.ts`) also targets `http://localhost:3001`.
- **Remediation:** Terminate TLS at the application level or upstream (reverse proxy/load balancer). Add a middleware that redirects HTTP→HTTPS in production. Once TLS is in place, add `Strict-Transport-Security: max-age=31536000; includeSubDomains` via the security headers package (see COMP-004).

---

### COMP-004: Missing HTTP Security Headers
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 | OWASP-ASVS V14.4.1 · V14.4.2 · V14.4.3 · V14.4.4 · V14.4.5 · V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No security headers middleware (`helmet` or equivalent) is installed. The application is missing all of the following protections:
  - `Content-Security-Policy` — allows arbitrary script injection
  - `X-Frame-Options` / `frame-ancestors` — clickjacking risk
  - `X-Content-Type-Options: nosniff` — MIME-type sniffing risk
  - `Strict-Transport-Security` — HSTS not declared
  - `Referrer-Policy` — leaks referrer information
  - `Permissions-Policy` — no browser feature restrictions
- **Remediation:** `npm install helmet` and add `app.use(helmet())` as the first middleware in `app.ts`. Configure a strict `Content-Security-Policy` appropriate for the API (or the full-stack if served from the same origin).

---

### COMP-005: No Rate Limiting or Anti-Automation Controls
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 | OWASP-ASVS V2.2.1 · V4.2.2
- **File/Component:** `Source/Backend/src/app.ts`, `routes/intake.ts`
- **Observation:** No rate-limiting middleware is applied to any endpoint. The intake webhook endpoints (`POST /api/intake/zendesk`, `POST /api/intake/automated`) and state-machine action endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`) can be called at arbitrary rates. Since the store is in-memory, a sustained flood of creation requests will exhaust server memory. The `GET /api/work-items` endpoint also accepts arbitrary `limit` values with no cap (e.g., `?limit=1000000`), enabling full-dataset extraction in a single call.
- **Remediation:** Add `express-rate-limit` middleware. Apply global rate limiting and stricter limits on mutation endpoints and intake webhooks. In the `findAll` store function and `getActivity` service, enforce a maximum `limit` cap (e.g., `Math.min(limit, 100)`).

---

### COMP-006: Required Audit Events Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 | OWASP-ASVS V7.1.2 · V7.2.1
- **File/Component:** `Source/Backend/src/` (entire logging layer)
- **Observation:** Per `security.config.yml`, four event types are required in audit logs. Status of each:

  | Required Event | Present? | Notes |
  |---|---|---|
  | `login_attempt` | ❌ ABSENT | No auth layer exists; structurally impossible to emit |
  | `permission_denied` | ❌ ABSENT | No access control; structurally impossible to emit |
  | `state_transition` | ⚠️ PARTIAL | State changes are logged with messages like `'Work item routed'` but not as a structured `event: 'state_transition'` audit record |
  | `data_export` | ❌ ABSENT | No export endpoint or functionality exists |

  The structured logger emits good operational logs but does not produce a dedicated, machine-parseable audit event stream. Log entries lack a top-level `event` discriminator field, making automated compliance querying difficult.
- **Remediation:** (1) Implement authentication (prerequisite for `login_attempt`/`permission_denied`). (2) Introduce a dedicated `auditLog()` function that emits structured records with a consistent `event` field, `actor`, `resource`, `action`, and `outcome`. (3) Emit `state_transition` audit events at each workflow step. (4) If data export is ever added, emit `data_export` events with the actor identity and record count.

---

### COMP-007: No CORS Policy Configured
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.5.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is registered. Express default behavior does not set `Access-Control-Allow-Origin` headers, which means browsers enforce same-origin policy by default. However, this is a gap — without explicit CORS configuration there is no enforced allowlist of trusted origins. When deployed behind a reverse proxy or with a different origin for the frontend, misconfiguration risk is high.
- **Remediation:** `npm install cors` and configure `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [] }))`. Explicitly enumerate trusted origins; do not use wildcard `*` in production.

---

### COMP-008: Request Body Size Limit Not Enforced
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V5.1.1
- **File/Component:** `Source/Backend/src/app.ts` line 13
- **Observation:** `app.use(express.json())` is configured without a `limit` option. Express's default body size is 100KB, but this is not explicitly enforced in code. Large payloads in `description` or other string fields are not rejected, creating a risk of resource exhaustion attacks against the in-memory store.
- **Remediation:** Change to `app.use(express.json({ limit: '16kb' }))` (or an appropriate size for the domain). Add explicit string-length validation for `title` (e.g., max 200 chars) and `description` (e.g., max 10,000 chars) in the create/update route handlers.

---

### COMP-009: Internal Error Messages Exposed to Clients
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V7.4.1 · V14.2.2
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (all catch blocks)
- **Observation:** Every `catch` block in `workflow.ts` extracts the raw error message and returns it directly to the caller:
  ```typescript
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
  ```
  Internal error messages can reveal implementation details, service topology, file paths, or dependency structure. While stack traces are not exposed (the global `errorHandler` correctly returns a generic message), the per-route pattern leaks `err.message` unconditionally on 500 responses.
- **Remediation:** For 500-class errors, return a generic message (`{ error: 'Internal server error' }`) to the client and log the full message+stack server-side. Only expose specific, curated messages (e.g., validation errors, business rule violations) to callers. Consider distinguishing between `OperationalError` (safe to surface) and unexpected errors (must not be surfaced).

---

### COMP-010: In-Memory Store — No Data Durability or Encryption at Rest
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 · CC8.1 | OWASP-ASVS V8.1.1 · V8.1.2
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All application data is held in a `Map<string, WorkItem>` in Node.js process memory. Consequences:
  - **No data persistence**: a process restart loses all data with no recovery path.
  - **No encryption at rest**: all work item data is stored in plaintext in process heap.
  - **No backup mechanism**: SOC2 CC8.1 change management and CC6.1 data protection require durability controls.
  - **Soft-delete only** (`item.deleted = true`): deleted items remain fully in memory; there is no hard-purge path (relevant to GDPR Art. 17 if PII is ever added to the domain).
- **Remediation:** Replace the in-memory store with a persistent database (PostgreSQL recommended). Enable encryption at rest at the database level. Implement database backups with tested restore procedures. Add a hard-delete function for GDPR erasure compliance.

---

### COMP-011: Prometheus `/metrics` Endpoint is Unauthenticated and Publicly Accessible
- **Severity:** Low
- **Framework/Control:** SOC2 CC6.1 | OWASP-ASVS V4.1.3
- **File/Component:** `Source/Backend/src/app.ts` lines 34–37
- **Observation:** The `/metrics` endpoint (Prometheus scrape) is registered as a public route with no authentication gate. While the metrics are operational counters (item counts by type/status/team) and not PII, they reveal internal system activity patterns and could assist reconnaissance. Additionally, no network-level restriction prevents external callers from reaching this endpoint.
- **Remediation:** Restrict `/metrics` to internal network requests only (e.g., via a middleware that checks source IP against a trusted CIDR range) or require a bearer token. Alternatively, expose metrics on a separate internal port that is not reachable from the public network.

---

### COMP-012: Intake Webhooks Lack Authentication / HMAC Signature Verification
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · CC6.2 | OWASP-ASVS V4.1.1
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept any HTTP request without verifying the caller's identity. Real Zendesk webhook integrations sign payloads using HMAC-SHA256 with a shared secret. Without signature verification, anyone who discovers the endpoint URL can inject arbitrary work items into the system.
- **Remediation:** Implement HMAC-SHA256 signature verification middleware for intake endpoints. Validate the `X-Zendesk-Webhook-Signature` (or equivalent) header against `ZENDESK_WEBHOOK_SECRET` from environment variables. Reject requests that fail verification with HTTP 401.

---

## Compliance Matrix

| Framework | Control | Description | Status | Severity if Failed |
|-----------|---------|-------------|--------|--------------------|
| **OWASP-ASVS L2** | V2.2.1 | Anti-automation / rate limiting | ❌ FAIL | High |
| OWASP-ASVS L2 | V3.1.1–V3.3.x | Session management | ⚪ N/A | — |
| OWASP-ASVS L2 | V4.1.1 | Access control enforced server-side | ❌ FAIL | High |
| OWASP-ASVS L2 | V4.1.2 | Deny by default | ❌ FAIL | High |
| OWASP-ASVS L2 | V4.1.3 | Principle of least privilege | ❌ FAIL | High |
| OWASP-ASVS L2 | V4.2.1 | Access control for sensitive data | ❌ FAIL | High |
| OWASP-ASVS L2 | V4.2.2 | Pagination limit enforcement | ❌ FAIL | Medium |
| OWASP-ASVS L2 | V5.1.1 | HTTP parameter / body validation | ⚠️ PARTIAL | Medium |
| OWASP-ASVS L2 | V6.2.x | Sensitive field encryption | ✅ N/A | — |
| OWASP-ASVS L2 | V7.1.2 | Log sufficient context | ⚠️ PARTIAL | Medium |
| OWASP-ASVS L2 | V7.2.1 | Audit log required events | ❌ FAIL | High |
| OWASP-ASVS L2 | V7.4.1 | Error messages safe for clients | ⚠️ PARTIAL | Medium |
| OWASP-ASVS L2 | V8.1.1 | Sensitive data not logged | ✅ PASS | — |
| OWASP-ASVS L2 | V8.1.2 | Encryption at rest | ❌ FAIL | Medium |
| OWASP-ASVS L2 | V9.1.1 | TLS for all connections | ❌ FAIL | High |
| OWASP-ASVS L2 | V14.4.1–V14.4.6 | HTTP Security Headers | ❌ FAIL | High |
| OWASP-ASVS L2 | V14.5.3 | CORS policy enforced | ❌ FAIL | Medium |
| OWASP-ASVS L2 | V14.2.2 | No stack traces in responses | ✅ PASS (global handler) | — |
| **SOC2-Type2** | CC6.1 | Logical access security controls | ❌ FAIL | High |
| SOC2-Type2 | CC6.2 | Credential issuance prior to access | ❌ FAIL | High |
| SOC2-Type2 | CC6.3 | Role-based access controls | ❌ FAIL | High |
| SOC2-Type2 | CC7.1 | System monitoring and anomaly detection | ⚠️ PARTIAL | Medium |
| SOC2-Type2 | CC8.1 | Change management processes | ⚠️ PARTIAL | Low |

**Legend:** ✅ PASS · ⚠️ PARTIAL · ❌ FAIL · ⚪ N/A

---

## Summary Metrics

| Metric | Count |
|--------|-------|
| Controls assessed | 23 |
| ✅ PASS / ⚪ N/A | **6** |
| ⚠️ PARTIAL | **4** |
| ❌ FAIL | **13** |
| **Compliance pass rate** | **26%** |
| High-severity findings | **7** (COMP-001, 002, 003, 004, 005, 006, 012) |
| Medium-severity findings | **4** (COMP-007, 008, 009, 010) |
| Low-severity findings | **1** (COMP-011) |

**Grade (per `security.config.yml` grading):** **D** — multiple High findings; pass rate below all thresholds.

---

## Priority Remediation Roadmap

**Immediate (before any shared-environment deployment):**
1. **COMP-001** — Add authentication middleware (JWT or API-key)
2. **COMP-012** — Add HMAC signature verification on intake webhooks
3. **COMP-004** — Install `helmet` for security headers
4. **COMP-003** — Enforce TLS / HTTPS

**Short-term:**
5. **COMP-002** — Implement RBAC with role checks on each route
6. **COMP-005** — Add rate limiting (`express-rate-limit`) + pagination caps
7. **COMP-006** — Introduce structured audit event emission (`login_attempt`, `permission_denied`, `state_transition`)

**Medium-term:**
8. **COMP-010** — Replace in-memory store with a persistent, encrypted database
9. **COMP-007** — Explicit CORS policy
10. **COMP-008** — Body size limits + field-length validation
11. **COMP-009** — Sanitize error messages returned to clients
12. **COMP-011** — Restrict `/metrics` endpoint to internal access
