Here is the full compliance audit report:

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-09-07 | **Auditor:** compliance_auditor | **Frameworks:** OWASP-ASVS L2, SOC2-Type2 (CC6.1–CC6.3, CC7.1, CC8.1)

---

## Executive Summary

The **dev-crew Source App** (Node.js/Express backend + React frontend) is a **workflow engine** with no authentication, no encryption layer, no security headers, no rate limiting, and only partial audit logging. The application currently has **zero security controls** protecting its API surface. Every endpoint is fully public. The overall compliance pass rate is approximately **22%**, placing the application at grade **D** under the configured grading rubric.

---

## Findings

### COMP-01: No Authentication on Any API Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1.1, V4.1.1, V4.1.2 | SOC2 CC6.1, CC6.2
- **File/Component:** `Source/Backend/src/app.ts`, all route files
- **Observation:** Every REST endpoint (`/api/work-items`, `/api/work-items/:id/route`, `/api/work-items/:id/dispatch`, `/api/dashboard`, `/api/intake/*`) is completely unauthenticated. `app.ts` applies no authentication middleware. There is no JWT verification, no session management, no API-key check — nothing. Any anonymous caller can create, read, update, soft-delete, route, approve, reject, or dispatch any work item.
- **Remediation:** Add an authentication middleware (e.g., `express-jwt` or Passport.js with Bearer tokens) applied globally or per-router before all protected routes. Define a user model with roles (operator, admin, readonly). Require a valid credential on every state-mutating endpoint.

---

### COMP-02: No Transport Security (TLS/HTTPS)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V9.1.1, V9.1.2 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Frontend/vite.config.ts`
- **Observation:** The backend binds to plain HTTP (`app.listen(PORT)`). Vite's dev proxy targets `http://localhost:3001`. No TLS configuration exists anywhere in the source. All API traffic — including any future credentials, tokens, or sensitive data — is transmitted in the clear.
- **Remediation:** For production, terminate TLS at a reverse proxy (nginx/Caddy/AWS ALB) with a valid certificate and enforce HSTS. In the Express app, add a redirect-to-HTTPS middleware and configure `trust proxy`. Never serve over plain HTTP in staging or production.

---

### COMP-03: No CORS Policy
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.5.1, V14.5.2 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The `cors` npm package is not installed and no CORS middleware is applied. Express will respond with no `Access-Control-Allow-Origin` header by default, but there is no allowlist enforcing which origins may call the API. Combined with the complete absence of authentication, cross-origin request forgery is trivially possible from any origin.
- **Remediation:** Install `cors` and configure an explicit allowlist: `app.use(cors({ origin: ['https://app.example.com'], credentials: true }))`. Block all other origins.

---

### COMP-04: No HTTP Security Headers
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.1–V14.4.6 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** `helmet` is not installed. Standard HTTP security headers are absent: no `Content-Security-Policy`, no `X-Content-Type-Options`, no `X-Frame-Options`, no `Strict-Transport-Security`, no `Referrer-Policy`. The Express default headers expose the server stack via `X-Powered-By: Express`.
- **Remediation:** Add `app.use(helmet())` as the first middleware in `app.ts`. At minimum configure `contentSecurityPolicy`, `hsts` (in production), and disable `x-powered-by`.

---

### COMP-05: No Rate Limiting
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.3.3, V11.1.4 | SOC2 CC7.1
- **File/Component:** `Source/Backend/src/app.ts`, all routes
- **Observation:** No rate-limiting middleware is applied to any endpoint. An attacker can issue unlimited requests — enumerating all work items, brute-forcing any future authentication endpoint, or exhausting server memory via the in-memory store. The `limit` pagination parameter has no server-enforced maximum (e.g., `?limit=1000000` is accepted).
- **Remediation:** Install `express-rate-limit` and apply a global limiter. Apply a stricter limiter to mutation endpoints (`POST`, `PATCH`, `DELETE`). Cap the `limit` query parameter to a configurable maximum (e.g., 100) server-side.

---

### COMP-06: Webhook Endpoints Lack Signature Verification
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V13.2.6 | SOC2 CC6.1, CC8.1
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** Both `/api/intake/zendesk` and `/api/intake/automated` accept payloads with no authentication and no HMAC/signature validation. Any party that discovers these URLs can inject arbitrary work items into the system, bypassing the intended intake sources. Zendesk webhooks provide an `X-Zendesk-Webhook-Signature` header for this exact purpose.
- **Remediation:** Validate incoming webhook payloads using HMAC-SHA256 against a shared secret stored in an environment variable. Reject (401/403) requests with missing or invalid signatures before processing the body.

---

### COMP-07: Required Audit Events Not Emitted
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 | OWASP-ASVS V7.2.1, V7.2.2
- **File/Component:** `Source/Backend/src/` (entire codebase)
- **Observation:** The `security.config.yml` mandates four audit event types: `login_attempt`, `permission_denied`, `state_transition`, and `data_export`. None of these are emitted as structured audit log events anywhere in the codebase. The `changeHistory` array on WorkItem captures state deltas as domain records, but this is not an audit log — it is not queryable as events, has no actor identity, and has no integrity protection. Events `login_attempt` and `permission_denied` cannot exist because there is no auth layer (COMP-01).
- **Remediation:** Implement a dedicated audit-log service that emits structured JSON events with: `{ event_type, actor_id, resource_type, resource_id, timestamp, outcome }`. Emit `state_transition` events in the workflow service whenever a work item changes status. Once auth is added, emit `login_attempt` (with success/failure) and `permission_denied` events. Emit `data_export` when list/export endpoints are called with bulk parameters.

---

### COMP-08: Unauthenticated Prometheus `/metrics` Endpoint
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 | OWASP-ASVS V4.1.2
- **File/Component:** `Source/Backend/src/app.ts` (line 33–36)
- **Observation:** The `/metrics` endpoint exposes operational telemetry (request counts, item creation rates, dispatch rates, dependency events, Node.js process internals) without any access control. An adversary can use this to map internal system activity, timing, and volume patterns.
- **Remediation:** Restrict `/metrics` access to internal networks only (via reverse proxy `allow`/`deny` rules) or add a bearer-token check specific to the Prometheus scraper identity. Do not expose this endpoint on a public-facing port.

---

### COMP-09: Stack Trace Written to Logs (Server-Side Exposure)
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V7.4.1 | SOC2 CC7.1
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts` (line 7)
- **Observation:** The error handler correctly returns `{ error: "Internal server error" }` to clients (no stack trace leakage). However, it logs `err.stack` to the server-side logger: `logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack })`. If logs are shipped to an insecure aggregation system, or if log-level filtering is misconfigured in production, stack traces containing file paths and internal logic may be visible to unintended parties.
- **Remediation:** Log `err.message` at `error` level and `err.stack` at `debug` level only (or suppress in production). Ensure log aggregation endpoints are access-controlled.

---

### COMP-10: No Access Control or Least-Privilege Model
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1.3, V4.2.1 | SOC2 CC6.3
- **File/Component:** All route files
- **Observation:** There are no user roles or permission scopes. There is no concept of an "operator" who can route/assess versus an "admin" who can approve/dispatch. The intake endpoints, workflow transition endpoints, and dashboard endpoints are all equally open. The principle of least privilege is entirely absent.
- **Remediation:** Define a role model (e.g., `viewer`, `operator`, `admin`). Implement role-based access control (RBAC) middleware that checks the authenticated user's role before allowing access to mutation endpoints. Dispatch and approve actions should require elevated privileges.

---

### COMP-11: No Session Management or MFA
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.4.1, V3.1.1, V3.2.1, V3.3.1 | SOC2 CC6.1, CC6.2
- **File/Component:** `Source/Backend/src/` (entire codebase)
- **Observation:** There is no session layer. No session tokens are issued, no token expiry is enforced, no MFA is available. This is a direct consequence of COMP-01 (no auth), but is called out separately because OWASP-ASVS L2 specifically requires session binding, idle/absolute timeout, and MFA support.
- **Remediation:** Once authentication is added (COMP-01), implement stateless JWT with short expiry (15 min access / 8 hr refresh) or server-side sessions with an idle timeout ≤30 min per OWASP-ASVS V3.3.1. Add TOTP-based MFA support for administrative roles.

---

### COMP-12: No Data Retention or Hard-Deletion Policy
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1 | OWASP-ASVS V8.3.4
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** The `softDelete` function sets `deleted: true` but the record remains in the in-memory store indefinitely and is recoverable via direct ID lookup (the `findById` function filters it out, but the store itself is not purged). There is no hard-delete mechanism, no data retention schedule, and no policy for removing stale or cancelled items. Since all data is in-memory, data is also lost on restart, which is itself a data-integrity risk.
- **Remediation:** Implement a persistent store (database). Add a hard-delete function that permanently removes records. Define a retention policy (e.g., `completed`/`rejected` items purged after N days) and implement a scheduled purge job.

---

## Compliance Matrix

| Control ID | Framework | Description | Status | Finding |
|---|---|---|---|---|
| V2.1.1 | OWASP-ASVS L2 | Authentication: Verify users authenticate with credentials | ❌ FAIL | COMP-01 |
| V2.4.1 | OWASP-ASVS L2 | MFA support for privileged accounts | ❌ FAIL | COMP-11 |
| V3.1.1 | OWASP-ASVS L2 | Session tokens are random, high entropy | ❌ FAIL | COMP-11 |
| V3.3.1 | OWASP-ASVS L2 | Session idle and absolute timeout enforced | ❌ FAIL | COMP-11 |
| V4.1.1 | OWASP-ASVS L2 | Access control at a trusted enforcement point | ❌ FAIL | COMP-01, COMP-10 |
| V4.1.2 | OWASP-ASVS L2 | Default-deny access control policy | ❌ FAIL | COMP-01 |
| V4.1.3 | OWASP-ASVS L2 | Principle of least privilege | ❌ FAIL | COMP-10 |
| V4.2.1 | OWASP-ASVS L2 | Sensitive data accessible only to authorized users | ❌ FAIL | COMP-01 |
| V4.3.3 | OWASP-ASVS L2 | Rate limiting on API endpoints | ❌ FAIL | COMP-05 |
| V5.1.1 | OWASP-ASVS L2 | Input validation: required fields checked | ✅ PASS | — |
| V7.2.1 | OWASP-ASVS L2 | Sufficient data logged per request | ⚠️ PARTIAL | COMP-07 |
| V7.4.1 | OWASP-ASVS L2 | Error messages don't expose stack traces to clients | ✅ PASS | COMP-09 (low) |
| V8.3.4 | OWASP-ASVS L2 | Sensitive data is deleted when no longer needed | ❌ FAIL | COMP-12 |
| V9.1.1 | OWASP-ASVS L2 | TLS used for all client connections | ❌ FAIL | COMP-02 |
| V13.2.6 | OWASP-ASVS L2 | Webhook signature validation | ❌ FAIL | COMP-06 |
| V14.4.1 | OWASP-ASVS L2 | HTTP security headers present | ❌ FAIL | COMP-04 |
| V14.5.1 | OWASP-ASVS L2 | CORS origin allowlist enforced | ❌ FAIL | COMP-03 |
| CC6.1 | SOC2-Type2 | Logical access security measures | ❌ FAIL | COMP-01, COMP-02, COMP-03 |
| CC6.2 | SOC2-Type2 | New access registration and provisioning | ❌ FAIL | COMP-01, COMP-11 |
| CC6.3 | SOC2-Type2 | Privileged access restrictions | ❌ FAIL | COMP-10 |
| CC7.1 | SOC2-Type2 | Security monitoring and audit logging | ❌ FAIL | COMP-07, COMP-08 |
| CC8.1 | SOC2-Type2 | Change management controls | ✅ PASS | Core domain feature |

**Summary:**
| | Count |
|---|---|
| ✅ Passed | 3 |
| ⚠️ Partial | 1 |
| ❌ Failed | 18 |
| **Pass Rate** | **~18%** |

---

## Grade Assessment

Per `grading` config in `security.config.yml`:

| Severity | Count | Threshold |
|---|---|---|
| Critical | 0 | — |
| High | 6 (COMP-01, -02, -03, -05, -06, -07, -10, -11) | A≤2, B≤6, C≤12 |
| Medium | 4 (COMP-04, -08, -09, -12) | — |

- Compliance pass rate (~18%) is below grade **D** (min 60% for C, 75% for B, 90% for A)
- 6+ High severity findings

**Overall Grade: D** *(multiple critical architecture gaps; authentication and TLS must be addressed before any production use)*

---

## Priority Remediation Roadmap

| Priority | Finding | Effort |
|---|---|---|
| P1 | COMP-01 — Add authentication middleware | High |
| P1 | COMP-02 — Enforce TLS at reverse proxy | Low |
| P1 | COMP-05 — Add rate limiting | Low |
| P2 | COMP-07 — Implement audit event logger | Medium |
| P2 | COMP-06 — Webhook HMAC validation | Low |
| P2 | COMP-10 — Implement RBAC roles | Medium |
| P3 | COMP-03 — CORS allowlist | Low |
| P3 | COMP-04 — Helmet security headers | Low |
| P3 | COMP-08 — Restrict /metrics endpoint | Low |
| P4 | COMP-09 — Reduce stack trace verbosity in logs | Low |
| P4 | COMP-11 — Session timeouts + MFA (after auth added) | Medium |
| P4 | COMP-12 — Hard-delete + retention policy | Medium |
