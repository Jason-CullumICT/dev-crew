# Compliance Audit Report — dev-crew Source App
**Date:** 2026-05-18  
**Auditor:** compliance_auditor (TheGuardians)  
**Frameworks:** OWASP-ASVS L2, SOC2-Type2 CC6.x/CC7.1/CC8.1  
**Scope:** `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`

---

## Executive Summary

The application is a workflow-engine backend (Express/TypeScript) with a React frontend. It manages work items through a state machine and has **no authentication, no authorisation, and no security headers**. The codebase has a solid foundation for structured logging and change-history tracking, but critical access-control controls are entirely absent. Overall compliance pass rate: **28%** (5 of 18 assessed controls pass).

---

## Findings

---

### COMP-001: No Authentication on Any API Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1, SOC2 CC6.2, OWASP-ASVS V2.1.1, V2.2.1, V4.2.1
- **File/Component:** `Source/Backend/src/app.ts` — all route registrations
- **Observation:** Every endpoint (`/api/work-items`, `/api/workflow`, `/api/dashboard`, `/api/intake`, `/metrics`, `/health`) is completely unauthenticated. There is no JWT middleware, no session middleware, no API-key check, and no authentication library in `package.json` (`express`, `prom-client`, `uuid`, `pino` only). Any anonymous HTTP client can create, update, delete, route, approve, reject, and dispatch work items without supplying any credential.
- **Remediation:**
  1. Add an authentication library (`passport`, `express-jwt`, or similar) and issue JWT bearer tokens on login.
  2. Apply an `authenticate` middleware globally in `app.ts` before all route groups (or selectively allowing `/health` to be public).
  3. Protect `/metrics` with at least a static bearer token or network-level restriction.

---

### COMP-002: No Authorisation / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3, OWASP-ASVS V4.1.1, V4.2.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `dashboard.ts`, `intake.ts`
- **Observation:** Zero role or permission checks exist. Any authenticated user (once auth is added) would be able to perform any action — including sensitive state transitions (`/approve`, `/reject`, `/dispatch`) and administrative operations. The `assignedTeam` field (`TheATeam` / `TheFixer`) is user-supplied in dispatch requests with only an enum check; no requester identity is validated.
- **Remediation:**
  1. Define roles (e.g., `operator`, `reviewer`, `admin`) in a roles table or JWT claim.
  2. Add `authorize(role)` middleware to each route group.
  3. Apply least-privilege: `GET` routes to all authenticated users; state-transition routes to `reviewer`+; `dispatch` to `admin` only.

---

### COMP-003: No HTTP Security Headers (Missing Helmet)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.1, V14.4.2, V14.4.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** `helmet` (or any security-header middleware) is absent from both `package.json` and `app.ts`. The API responses carry no `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, or `X-XSS-Protection` headers. The frontend (`vite.config.ts`) also has no CSP meta-tag configuration.
- **Remediation:**
  1. `npm install helmet` in the backend.
  2. Add `app.use(helmet())` as the first middleware in `app.ts`.
  3. For the frontend production build, configure CSP via a reverse proxy or Vite plugin.

---

### COMP-004: No CORS Policy
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No `cors` middleware is configured. The backend will respond to cross-origin requests from any origin. In development the Vite proxy masks this, but in production the API is directly exposed without origin restrictions.
- **Remediation:**
  1. `npm install cors @types/cors`.
  2. Configure `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }))` with an explicit allowlist.
  3. Set `credentials: true` only if cookies are used.

---

### COMP-005: No Rate Limiting on Any Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.2.1, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No rate-limiting middleware (`express-rate-limit` or similar) is present. All endpoints — including the intake webhooks (`/api/intake/zendesk`, `/api/intake/automated`) and state-transition routes — accept unlimited requests per second from a single IP. This allows credential-stuffing attacks once auth is added, as well as denial-of-service via write amplification.
- **Remediation:**
  1. `npm install express-rate-limit`.
  2. Apply a global limiter (e.g., 100 req/min per IP) in `app.ts`.
  3. Apply a stricter limiter on auth and intake routes (e.g., 10 req/min per IP).

---

### COMP-006: Missing Required Audit Log Events
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1, OWASP-ASVS V7.2.2
- **File/Component:** `Source/Backend/src/routes/`, `Source/Backend/src/services/`
- **Observation:** The `security.config.yml` mandates four audit events. Status of each:

  | Required Event | Present | Notes |
  |---|---|---|
  | `login_attempt` | ❌ No | No auth system; event is entirely absent |
  | `permission_denied` | ❌ No | No authz; event is entirely absent |
  | `state_transition` | ⚠️ Partial | `changeHistory` records transitions in the work-item object, but no dedicated structured log line with `event: "state_transition"` is emitted |
  | `data_export` | ❌ No | No structured log emitted when listing/exporting work items; dashboard and list endpoints log only at `debug` level |

  Three of four required audit events are completely missing, and the one that is partially present is embedded in entity history rather than a queryable audit log stream.
- **Remediation:**
  1. Create an `audit.ts` module that emits structured JSON log lines with `event`, `actorId`, `resourceId`, `outcome`, and `timestamp` fields.
  2. Call `audit.emit('state_transition', ...)` from every state-machine transition point.
  3. Call `audit.emit('data_export', ...)` from `GET /api/work-items` and `/api/dashboard/*` list routes.
  4. Once auth exists, call `audit.emit('login_attempt', ...)` and `audit.emit('permission_denied', ...)`.

---

### COMP-007: Unbounded Pagination — No Maximum `limit` Cap
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V5.1.3, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts:70`, `routes/dashboard.ts:18`
- **Observation:** The `limit` query parameter is parsed with `parseInt` and passed directly to the store with no upper bound check. A caller can request `?limit=1000000` and retrieve the entire in-memory dataset in a single response, bypassing the intent of pagination and enabling data enumeration without authentication.
- **Remediation:**
  1. Add `const safeLimit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);` in both routes.
  2. Document the maximum in the API contract (`Source/Shared/api-contracts.md`).

---

### COMP-008: No Request Body Size Limit
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V5.1.3
- **File/Component:** `Source/Backend/src/app.ts:13`
- **Observation:** `app.use(express.json())` is called without a `limit` option. Express defaults to 100 KB, which may be acceptable, but there is no explicit configuration ensuring this is intentional. Large `description` fields in work items are accepted without length validation at the route level either, and the default can be overridden by deployers who don't know the intent.
- **Remediation:**
  1. Explicitly set `app.use(express.json({ limit: '100kb' }))`.
  2. Add max-length validation for `title` (e.g., 255 chars) and `description` (e.g., 5000 chars) in `workItems.ts` and `intake.ts`.

---

### COMP-009: `/metrics` Endpoint Exposed Without Authentication
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1, OWASP-ASVS V4.2.1
- **File/Component:** `Source/Backend/src/app.ts:34`
- **Observation:** The Prometheus `/metrics` endpoint is publicly accessible. It exposes internal operational data (item counts, routing counters, dispatch team names, default Node.js metrics including memory, CPU, and open file descriptors). This constitutes information disclosure that can assist an attacker in reconnaissance.
- **Remediation:**
  1. Restrict `/metrics` to internal network or add a static bearer-token check via an environment variable.
  2. Alternatively, expose metrics on a separate port bound only to `localhost` or a management network.

---

### COMP-010: No TLS / HTTPS Enforcement
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V9.1.1, SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (server startup), `Source/Frontend/src/api/client.ts`
- **Observation:** The backend starts a plain HTTP server with no TLS termination or `https` enforcement. The frontend API base URL defaults to `/api` (relative path, inheriting whatever scheme the page is served over). There is no redirect from HTTP to HTTPS in the application layer. If deployed behind a load balancer that handles TLS, this is mitigated, but the application itself has no enforcement.
- **Remediation:**
  1. Document and enforce that the application must only be deployed behind a TLS-terminating reverse proxy.
  2. Add an environment-variable check on startup (`if (!process.env.BEHIND_TLS_PROXY) warn loudly`).
  3. For production, add HSTS header via Helmet (`helmet.hsts()`).

---

### COMP-011: No Hard-Delete / GDPR Right to Erasure
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 (Right to Erasure)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts:78`
- **Observation:** Only a soft-delete mechanism exists (`item.deleted = true`). The item remains in memory (and, if persistence were added, in storage) indefinitely. GDPR Art. 17 requires that personal data be erased on request. While current work items do not have explicit PII fields, the `title`, `description`, and `changeHistory` entries can contain user-supplied text that may constitute personal data. There is no endpoint or mechanism to perform a hard delete.
- **Remediation:**
  1. Add a `hardDelete(id)` function to the store that removes the record entirely.
  2. Expose it as an admin-only endpoint (`DELETE /api/work-items/:id?permanent=true` or a separate endpoint).
  3. Ensure change history entries referencing the deleted item are also removed.

---

### COMP-012: Stack Traces Logged at Server Level
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V7.1.2
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts:6`
- **Observation:** `logger.error({ ..., stack: err.stack })` logs full stack traces. These are emitted server-side only (not returned to the client — the client receives `{ error: 'Internal server error' }`), which is correct. However, if the log pipeline ships to a log aggregator accessible to a wider audience, stack traces reveal internal file paths, module names, and code structure. This is a low-severity, defence-in-depth concern.
- **Remediation:**
  1. Gate stack trace logging on `NODE_ENV`: log full stacks in `development`, log only `err.message` in `production`.
  2. Ensure the log aggregator access is role-gated.

---

### COMP-013: Intake Webhooks Have No Signature Verification
- **Severity:** Medium
- **Framework/Control:** SOC2 CC8.1, OWASP-ASVS V13.2.6
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** The Zendesk (`POST /api/intake/zendesk`) and automated (`POST /api/intake/automated`) webhook endpoints accept any HTTP POST without verifying an HMAC signature or shared secret. Any caller on the network can fabricate work items by posting to these endpoints. This is a change-management integrity failure — untrusted external sources can inject data into the workflow without verification.
- **Remediation:**
  1. Add webhook signature verification middleware that validates an HMAC-SHA256 signature header (e.g., `X-Zendesk-Webhook-Signature`) against `process.env.ZENDESK_WEBHOOK_SECRET`.
  2. Reject unsigned requests with `401 Unauthorized`.
  3. Store the secret in environment variables, never in source.

---

## Compliance Matrix

### SOC2-Type2 Controls

| Control ID | Description | Status | Finding |
|---|---|---|---|
| CC6.1 | Restrict logical and physical access to authorised users | ❌ FAIL | COMP-001, COMP-005 |
| CC6.2 | System credentials issued and managed securely | ❌ FAIL | COMP-001 |
| CC6.3 | Role-based access; permissions removed when no longer needed | ❌ FAIL | COMP-002 |
| CC7.1 | Detect and monitor threats; sufficient monitoring and alerting | ⚠️ PARTIAL | COMP-006, COMP-009 (metrics exist; audit events incomplete; /metrics unprotected) |
| CC8.1 | Changes authorised and managed (change management) | ⚠️ PARTIAL | COMP-013 (change history tracking exists ✓; webhook intake unverified ✗) |

### OWASP-ASVS L2 Controls (Authentication, Access Control, Data Protection)

| Control ID | Description | Status | Finding |
|---|---|---|---|
| V2.1.1 | Passwords ≥ 12 chars enforced | ❌ N/A | COMP-001 (no auth system) |
| V2.2.1 | Anti-automation / rate limiting on auth | ❌ FAIL | COMP-005 |
| V2.2.2 | Active sessions invalidated after logout | ❌ N/A | COMP-001 (no sessions) |
| V4.1.1 | Least privilege applied to all roles | ❌ FAIL | COMP-002 |
| V4.2.1 | Access control enforced on trusted server | ❌ FAIL | COMP-002 |
| V5.1.3 | Input length validation on all user input | ❌ FAIL | COMP-007, COMP-008 |
| V6.2.1 | No custom cryptographic algorithms | ✅ PASS | (no crypto used; no custom algo) |
| V7.1.1 | No passwords or credentials in log files | ✅ PASS | (no credential fields exist) |
| V7.1.2 | No sensitive PII in log files at excessive level | ✅ PASS | (no PII fields in current schema) |
| V7.2.2 | Authentication events logged with sufficient context | ❌ FAIL | COMP-006 |
| V9.1.1 | TLS used for all client connections | ❌ FAIL | COMP-010 |
| V13.2.6 | Origin verification / CSRF protection on state-changing requests | ❌ FAIL | COMP-013 |
| V14.4.1 | HTTP security headers present (Helmet) | ❌ FAIL | COMP-003 |
| V14.4.6 | CORS policy restricted to allowed origins | ❌ FAIL | COMP-004 |
| V14.5.3 | HTTP methods restricted per resource | ✅ PASS | (router defines specific verbs per endpoint) |

### Summary

| Framework | Controls Assessed | Pass | Partial | Fail | Pass Rate |
|---|---|---|---|---|---|
| SOC2-Type2 | 5 | 0 | 2 | 3 | 0% (full) / 20% (with partial) |
| OWASP-ASVS L2 | 13 | 4 | 0 | 9 | 31% |
| **Overall** | **18** | **5** | **2** | **11** | **28%** |

---

## Grading

Per `security.config.yml` grading thresholds:
- **Grade A**: compliance pass rate ≥ 90% → Not achieved
- **Grade B**: compliance pass rate ≥ 75% → Not achieved
- **Grade C**: compliance pass rate ≥ 60% → Not achieved
- **Grade D**: < 60%, ≤ 2 critical findings → **Current grade: D**

The application has 0 cryptographic failures on sensitive fields (because no sensitive fields exist yet), but the complete absence of authentication and authorisation places the system at **Grade D** — one confirmed red-team breach of a critical objective away from Grade F.

---

## Positive Observations (Controls Met)

1. **Structured JSON logging** — `utils/logger.ts` correctly uses `process.stdout.write` for JSON output; `console.log` is explicitly prohibited and not used anywhere in production code.
2. **Change history tracking** — Every state transition and field mutation is recorded in `changeHistory` with agent, timestamp, old/new values, and reason. This partially satisfies SOC2 CC8.1.
3. **Prometheus metrics** — Domain-significant operations (items created, routed, assessed, dispatched, dependency events) are metered and exposed at `/metrics`.
4. **No hardcoded secrets** — No credentials, API keys, or tokens appear anywhere in the source tree. Configuration uses `process.env`.
5. **Soft delete** — Work items are soft-deleted rather than hard-deleted, preserving audit trail integrity (though GDPR hard-delete is missing as noted in COMP-011).
6. **Error response hygiene** — The error handler returns `{ error: 'Internal server error' }` to clients; stack traces are never sent to callers.
7. **Input enum validation** — All enum-typed fields (`type`, `priority`, `source`, `complexity`) are validated against allowlists before storage.
