The pipeline state is managed by the team leader; the audit findings stand independently. Here is the complete compliance audit report:

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-09-21 | **Auditor:** compliance_auditor | **Frameworks:** OWASP-ASVS L2 · SOC2-Type2 CC6/CC7/CC8

---

## Executive Summary

The application is a TypeScript/Express workflow engine with an in-memory data store and a React frontend. The audit covered all source files under `Source/Backend/`, `Source/Frontend/`, and `Source/Shared/`. **No authentication or authorization system exists anywhere in the codebase.** This single architectural gap causes cascade failures across the majority of OWASP ASVS L2 and SOC2-Type2 controls. Of 20 controls assessed, **7 pass and 13 fail** — a 35% compliance pass rate, which places the application below the Grade B threshold (`min_compliance_pass_rate: 75`).

---

## Findings

### COMP-001: No Authentication Layer
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1, V3.1 · SOC2 CC6.1 · SOC2 CC6.2
- **File/Component:** `Source/Backend/src/app.ts` — all routes
- **Observation:** The Express application mounts routes (`/api/work-items`, `/api/workflow`, `/api/intake`, `/api/dashboard`) with zero authentication middleware. No JWT validation, no session verification, no API key checks, and no identity context is established anywhere. Any unauthenticated HTTP client can read, create, update, approve, reject, or delete any work item. The `Source/Backend/package.json` contains no authentication library (`jsonwebtoken`, `passport`, `express-jwt`).
- **Remediation:**
  1. Add an authentication middleware (e.g., JWT bearer token validation via `express-jwt` or `passport-jwt`).
  2. Mount it globally before all protected routes in `app.ts`.
  3. Propagate the authenticated principal (`req.user`) to service and logging layers.
  4. Protect intake webhook endpoints (`/api/intake/*`) with shared-secret HMAC signature verification rather than bearer tokens.

---

### COMP-002: No Authorization / Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1, V4.2 · SOC2 CC6.3
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `dashboard.ts`
- **Observation:** There is no role-based or attribute-based access control anywhere. Any caller (once COMP-001 is addressed) could approve, reject, or dispatch any work item regardless of their role. The workflow actions (`/approve`, `/reject`, `/dispatch`) require different authorization levels (e.g., only managers can approve), but no such enforcement exists. No user context is threaded through any service call.
- **Remediation:**
  1. Define roles (e.g., `viewer`, `submitter`, `reviewer`, `manager`).
  2. Implement an authorization middleware/guard that checks `req.user.role` against required permissions for each route.
  3. Apply the principle of least privilege: read-only routes allow `viewer+`; state transitions require `reviewer+`; approve/reject/dispatch require `manager`.

---

### COMP-003: Missing Required Audit Events — login_attempt & permission_denied
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1
- **File/Component:** `Source/Backend/src/utils/logger.ts`, `Source/Backend/src/app.ts`
- **Observation:** `security.config.yml` mandates four audit events. Two can never be emitted because there is no authentication system: `login_attempt` and `permission_denied`. The `data_export` event is also absent (no export endpoint exists). Only `state_transition` is logged, but via generic `logger.info` calls rather than a structured, tamper-evident audit log with actor identity.
- **Remediation:**
  1. Implement a dedicated `auditLog()` function that emits a structured `{ event, actor, workItemId, timestamp, outcome }` record — separate from the application debug log.
  2. Once COMP-001 is resolved, emit `login_attempt` (both success and failure) from the auth middleware.
  3. Emit `permission_denied` from the authorization guard (COMP-002).
  4. Emit `state_transition` from all workflow route handlers with actor identity, previous status, and new status.
  5. If a data export feature is added, emit `data_export` with actor, scope, and record count.

---

### COMP-004: No Security HTTP Headers (No Helmet)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.1, V14.4.3, V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** No `helmet` middleware is installed or configured. The application sends no `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options`, `X-Frame-Options`, or `Referrer-Policy` headers. The frontend Vite dev server also has no security header configuration.
- **Remediation:**
  1. `npm install helmet` in `Source/Backend/`.
  2. Add `app.use(helmet())` before all routes in `app.ts`.
  3. Configure HSTS with `includeSubDomains` and `preload` for production.
  4. Configure CSP to restrict script sources to same-origin.

---

### COMP-005: No CORS Policy
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.5.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is configured on the Express application. Any cross-origin request is permitted by the browser's default behavior. In production, this would allow any third-party site to make authenticated API calls on behalf of a logged-in user.
- **Remediation:**
  1. `npm install cors` and `npm install --save-dev @types/cors`.
  2. Add `app.use(cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true }))` before routes.
  3. Set `ALLOWED_ORIGIN` env var to the frontend's production domain.

---

### COMP-006: No Rate Limiting
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.2.2 (brute-force protection), SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No rate-limiting middleware is present. The API accepts unlimited requests per IP/client, enabling brute-force attacks against auth endpoints (once added) and bulk data scraping against list endpoints.
- **Remediation:**
  1. `npm install express-rate-limit`.
  2. Apply a global limiter (`100 req/15min`) and a stricter limiter on auth endpoints (`10 req/15min`).
  3. Apply to the intake webhook endpoints to prevent spam injection.

---

### COMP-007: Pagination Limit Uncapped — Data Enumeration Risk
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.2.1 (data-level access control)
- **File/Component:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/store/workItemStore.ts:35`
- **Observation:** The `limit` query parameter is read directly from the request without an upper bound: `parseInt(req.query.limit as string, 10)`. An attacker can pass `?limit=999999` to retrieve all work items in a single request, bypassing pagination controls entirely.
- **Remediation:**
  ```typescript
  const limit = Math.min(
    req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    100  // hard cap
  );
  ```

---

### COMP-008: Prometheus /metrics Endpoint Unauthenticated
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.3.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts:34-37`
- **Observation:** The `/metrics` endpoint exposes detailed Prometheus metrics (request counts, memory usage, GC stats via `collectDefaultMetrics`) with no authentication or network access control. This exposes operational intelligence useful for reconnaissance (request volume, error rates, timing patterns).
- **Remediation:**
  1. Restrict `/metrics` to an internal network/localhost only via firewall rules, OR
  2. Add bearer token authentication: check `Authorization: Bearer <METRICS_TOKEN>` where the token is set via env var.

---

### COMP-009: No Encryption at Rest — In-Memory Store
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V8.1.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All application data is stored in a JavaScript `Map` in process memory. There is no persistence layer (no database, no disk storage). While this means there is no "at-rest" encrypted file, it also means all data is lost on restart, there is no disaster recovery, and there is no audit trail persistence. For a compliance-grade system, this constitutes a failure of the "protect stored data" control.
- **Remediation:**
  1. Introduce a persistent store (e.g., PostgreSQL or SQLite) with encrypted storage at the filesystem or database level (TDE or dm-crypt).
  2. Encrypt any fields classified as sensitive before writing to the store.
  3. Ensure database credentials are injected via environment variables (already a project rule).

---

### COMP-010: No TLS/HTTPS Enforcement
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V9.1.1, V9.2.1
- **File/Component:** `Source/Backend/src/app.ts` (plain HTTP listener), `Source/Frontend/vite.config.ts` (proxy to `http://localhost:3001`)
- **Observation:** The backend binds to plain HTTP (`app.listen(PORT)`) with no TLS termination in the application. The Vite proxy targets `http://localhost:3001`. While TLS is often terminated at a reverse proxy (nginx/load balancer) in production, there is no documentation or enforcement that this is done, and no HSTS policy (see COMP-004) to prevent downgrade attacks.
- **Remediation:**
  1. Document and enforce that all production deployments require TLS termination at the load balancer / ingress.
  2. Add HSTS header via `helmet` (COMP-004) to prevent HTTP downgrade.
  3. Add a check at startup: if `NODE_ENV=production` and `TRUST_PROXY` is unset, log a critical warning.

---

### COMP-011: No Data Retention / Hard Delete Mechanism
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V8.3.4 (sensitive data minimisation) · SOC2 CC6.3 (access removal)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts:78-89`
- **Observation:** Work items are soft-deleted (`deleted: true`) but remain in the in-memory store indefinitely and are returned by `getAllItems()` raw (though filtered from public API). There is no hard-delete capability, no data retention schedule, and no right-to-erasure mechanism. If work items ever contain PII (e.g., reporter names injected from Zendesk payloads), there is no way to permanently purge them.
- **Remediation:**
  1. Implement a `hardDelete(id)` function that physically removes the item from the store.
  2. Define and document a retention policy (e.g., purge soft-deleted items after 90 days).
  3. Ensure Zendesk intake endpoint scrubs or masks PII from incoming payloads before storage.

---

### COMP-012: Intake Webhooks Lack Signature Verification
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V1.14.5 (3rd-party component integrity) · SOC2 CC8.1
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** The `/api/intake/zendesk` and `/api/intake/automated` endpoints accept JSON payloads with no authentication, no HMAC signature verification, and no source IP allow-list. Any party that discovers these endpoints can inject arbitrary work items into the workflow system.
- **Remediation:**
  1. For Zendesk: verify the `X-Zendesk-Webhook-Signature` header using HMAC-SHA256 with a shared secret stored in env var.
  2. For automated: require a bearer token or client certificate.
  3. Add validation that rejects suspiciously large payloads (set `express.json({ limit: '1mb' })`).

---

### COMP-013: State Transitions Logged Without Actor Identity
- **Severity:** Low
- **Framework/Control:** SOC2 CC7.1 (state_transition audit event)
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (approve/reject/dispatch handlers)
- **Observation:** State transitions are logged (`logger.info({ msg: 'Work item manually approved', ... })`) and recorded in `changeHistory`, but the `agent` field is hardcoded to `'manual-override'` or `'dispatcher'` with no actual user identity. Without an auth system, no real actor identity can be captured, but the logging structure should be designed to accommodate it once COMP-001 is resolved.
- **Remediation:**
  1. Add an `actor` field to all state-transition log entries, sourced from `req.user.id` once authentication is implemented.
  2. In `buildChangeEntry()`, accept an optional `actorId` parameter.
  3. Ensure audit log entries are immutable and separately retained from application logs.

---

## Compliance Matrix

### OWASP ASVS Level 2

| Control ID | Description | Status | Finding |
|-----------|-------------|--------|---------|
| V2.1 | Password & Authenticator Security | ❌ FAIL | COMP-001 — No auth system |
| V3.1 | Fundamental Session Management | ❌ FAIL | COMP-001 — No sessions |
| V4.1 | General Access Control | ❌ FAIL | COMP-002 — No access control |
| V4.2 | Operation-Level Access Control | ❌ FAIL | COMP-002, COMP-007 |
| V4.3 | Other Access Control | ❌ FAIL | COMP-008 — /metrics unprotected |
| V5.1 | Input Validation | ⚠️ PARTIAL | Enum validation present; no XSS/injection protection |
| V6.3 | Random Value Generation | ✅ PASS | UUIDs used for all IDs |
| V8.1 | General Data Protection | ❌ FAIL | COMP-009 — in-memory, no encryption |
| V8.3 | Sensitive Private Data | ✅ PASS | No PII fields in data model |
| V9.1 | Client Communications Security | ❌ FAIL | COMP-010 — HTTP only |
| V14.4 | HTTP Security Headers | ❌ FAIL | COMP-004 — No helmet |
| V14.5 | HTTP Request Header Validation | ❌ FAIL | COMP-005 — No CORS |

### SOC2-Type2

| Control ID | Description | Status | Finding |
|-----------|-------------|--------|---------|
| CC6.1 | Logical access controls | ❌ FAIL | COMP-001, COMP-008, COMP-009 |
| CC6.2 | User registration & authorization | ❌ FAIL | COMP-001 — No user system |
| CC6.3 | Access revocation | ❌ FAIL | COMP-002, COMP-011 |
| CC7.1 | Detection & monitoring | ⚠️ PARTIAL | Prometheus metrics ✅; audit events `login_attempt`/`permission_denied` absent ❌ (COMP-003) |
| CC8.1 | Change management | ⚠️ PARTIAL | changeHistory tracked ✅; no software/infra change management process |

### Summary

| Metric | Count |
|--------|-------|
| Controls Assessed | 17 |
| ✅ Pass | 3 |
| ⚠️ Partial | 4 |
| ❌ Fail | 10 |
| **Pass Rate (full passes)** | **18%** |
| **Pass Rate (pass + partial)** | **41%** |

**Grade: D** (below 60% minimum compliance pass rate; 0 critical findings but 3 High severity gaps)

---

## Required Audit Events Coverage

| Event | Required | Present | Notes |
|-------|----------|---------|-------|
| `login_attempt` | ✅ | ❌ | No auth system — cannot emit |
| `permission_denied` | ✅ | ❌ | No access control — cannot emit |
| `state_transition` | ✅ | ⚠️ | Logged via logger.info + changeHistory but lacks actor identity |
| `data_export` | ✅ | ❌ | No export functionality exists |

---

## Sensitive Field Encryption Coverage

| Field | In Data Model | Encrypted | Notes |
|-------|-------------|-----------|-------|
| `email` | ❌ Not present | N/A | No user management |
| `password` | ❌ Not present | N/A | No auth system |
| `token` | ❌ Not present | N/A | — |
| `secret` | ❌ Not present | N/A | — |
| `api_key` | ❌ Not present | N/A | — |

> **Note:** None of the declared sensitive fields appear in the WorkItem data model — a positive architectural finding. If authentication is added, credential fields must use bcrypt/argon2 (never plaintext or reversible encryption).

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| 🔴 P1 | COMP-001: Add authentication | High |
| 🔴 P1 | COMP-002: Add authorization/RBAC | High |
| 🔴 P1 | COMP-003: Implement structured audit log | Medium |
| 🟡 P2 | COMP-004: Install helmet (security headers) | Low |
| 🟡 P2 | COMP-005: Configure CORS | Low |
| 🟡 P2 | COMP-006: Add rate limiting | Low |
| 🟡 P2 | COMP-007: Cap pagination limit | Low |
| 🟡 P2 | COMP-008: Protect /metrics endpoint | Low |
| 🟡 P2 | COMP-009: Add persistent encrypted store | High |
| 🟡 P2 | COMP-010: Enforce TLS | Medium |
| 🟢 P3 | COMP-011: Hard delete / data retention | Medium |
| 🟢 P3 | COMP-012: Webhook signature verification | Medium |
| 🟢 P3 | COMP-013: Actor identity in audit entries | Low |

---

**Learnings file updated:** `Teams/TheGuardians/learnings/compliance-auditor.md`
