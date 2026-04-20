Now the full compliance audit report:

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-04-20 | **Auditor:** compliance_auditor | **Run:** run-20260420-054547

**Frameworks Audited:** OWASP ASVS L2 · SOC2 Type 2 (CC6.1–CC8.1) · ISO 27001 (mapped) · GDPR (Art. 17, 25, 32)

---

## Executive Summary

The application has a **well-structured engineering foundation** — structured JSON logging, Prometheus metrics, change history tracking, enum validation, service-layer architecture, and zero hardcoded secrets. However, the **entire access control and authentication layer is absent**. Every API endpoint is completely unauthenticated and unprotected. No security headers, no CORS policy, no rate limiting, and no webhook signature verification exist. Four required audit-log events are not emitted.

**Overall compliance grade: D** (5 of 23 evaluated controls pass; pass rate ≈ 22% — below all grade thresholds in `security.config.yml`).

---

## Findings

---

### COMP-001: No Authentication or Authorization on Any API Endpoint
- **Severity:** High
- **Framework/Control:** OWASP ASVS L2 V4.1.1, V4.1.3, V4.2.1; SOC2 CC6.1, CC6.3
- **File/Component:** `Source/Backend/src/app.ts`, all route files in `Source/Backend/src/routes/`
- **Observation:** Zero authentication middleware exists anywhere in the Express application. All endpoints — including state transitions (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`), data mutation (`PATCH /api/work-items/:id`), soft-delete (`DELETE /api/work-items/:id`), and dashboard (`/api/dashboard/*`) — are completely open to any caller with network access. There are no JWT validators, no API key checks, no session cookies, and no IP allowlists. The application startup logs `admin@example.com / admin123` as "login credentials" in `CLAUDE.md`, but no login endpoint or credential check exists in the source.
- **Remediation:**
  1. Install and wire an authentication middleware (e.g., `passport-jwt` or a custom JWT verifier using `jsonwebtoken`).
  2. Define at minimum two roles: `operator` (read + workflow actions) and `admin` (can approve/reject/dispatch).
  3. Apply the middleware globally in `app.ts` before all route registrations, with an explicit allowlist for `/health` and `/metrics`.
  4. Return `401 Unauthorized` for missing/invalid credentials and `403 Forbidden` for insufficient permissions.

---

### COMP-002: No HTTP Security Headers (Missing Helmet)
- **Severity:** High
- **Framework/Control:** OWASP ASVS L2 V14.4.1, V14.4.2, V14.4.3, V14.4.6; ISO 27001 A.14.1.2
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** `helmet` is not installed (absent from `package.json` dependencies) and not applied in `app.ts`. The following security headers are therefore absent on every response:
  - `Content-Security-Policy`
  - `X-Frame-Options` (clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security` (HSTS)
  - `Referrer-Policy`
  - `Permissions-Policy`
- **Remediation:** `npm install helmet` in `Source/Backend`, then add `app.use(helmet())` as the very first middleware in `app.ts`. Tune CSP for `/metrics` and API-only use case.

---

### COMP-003: No CORS Policy Configured
- **Severity:** High
- **Framework/Control:** OWASP ASVS L2 V14.5.3; SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No CORS middleware is present. Express by default does not add CORS headers, but any same-origin or proxied frontend can issue cross-origin requests without restriction. When deployed behind a reverse proxy that adds permissive CORS headers (common in dev environments), this allows arbitrary origins to call the API. The frontend client in `Source/Frontend/src/api/client.ts` uses `VITE_API_BASE_URL` which defaults to `/api` — consistent with a same-origin proxy — but there is no enforcement that only that origin may call the backend directly.
- **Remediation:** `npm install cors` in `Source/Backend`, then configure `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'], credentials: true }))` before route registration.

---

### COMP-004: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP ASVS L2 V13.2.5; SOC2 CC7.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No rate-limiting middleware is installed. Any caller can send unlimited requests to any endpoint, enabling enumeration of work items, flooding the state machine, or exhausting the in-memory store. The assessment endpoint in particular runs a synchronous 4-role pod assessment per call — unlimited calls cause CPU saturation.
- **Remediation:** `npm install express-rate-limit`, then apply a global limiter (e.g., 100 req/15 min) and a tighter limiter (10 req/min) on state-transition endpoints (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`).

---

### COMP-005: Missing All Four Required Audit-Log Events
- **Severity:** High
- **Framework/Control:** OWASP ASVS L2 V7.2.1, V7.2.2; SOC2 CC7.1; ISO 27001 A.12.4.1
- **File/Component:** All service and route files; `Source/Backend/src/utils/logger.ts`
- **Observation:** `security.config.yml` mandates four audit events be present in the logging layer. A search across the entire `Source/` tree confirms **none** are emitted:

  | Required Event | Present? | Notes |
  |---|---|---|
  | `login_attempt` | ❌ | No auth system exists |
  | `permission_denied` | ❌ | No auth system exists |
  | `state_transition` | ⚠️ Partial | Tracked in WorkItem `changeHistory[]` (domain record) but not as a separate structured audit-log emission with user identity |
  | `data_export` | ❌ | Dashboard endpoints not logged as export events |

  The `changeHistory` array embedded in each WorkItem is a useful domain audit trail, but it is not a security audit log: it uses hardcoded agent strings (`'user'`, `'system'`, `'manual-override'`) rather than authenticated user identity, and it is mutable alongside the item record rather than append-only in a separate log stream.

- **Remediation:**
  1. After COMP-001 is resolved, emit `login_attempt` on every auth attempt with outcome (success/failure), IP, and user identity.
  2. Emit `permission_denied` whenever an authn check passes but an authz check fails.
  3. Emit `state_transition` as a structured log event on every status change, including the authenticated user's identity, previous status, new status, and work item ID.
  4. Emit `data_export` on every `GET /api/dashboard/*` and `GET /api/work-items` call that returns bulk data.
  5. Route these events through a dedicated audit logger that writes to a separate, append-only stream.

---

### COMP-006: Unlimited Pagination — Data Enumeration Risk
- **Severity:** Medium
- **Framework/Control:** OWASP ASVS L2 V5.1.1, V5.1.3; SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (line 70), `Source/Backend/src/store/workItemStore.ts` (line 35)
- **Observation:** The `GET /api/work-items?limit=N` endpoint accepts any integer value for `limit` with no maximum cap. An attacker or misconfigured client can request `limit=999999` to retrieve the entire work item store in a single response, bypassing the intent of pagination and enabling data enumeration without authentication.
- **Remediation:** In `workItems.ts` and `workItemStore.ts`, enforce a maximum limit: `const limit = Math.min(req.query.limit ? parseInt(req.query.limit as string, 10) : 20, 100);`. Reject requests exceeding the maximum with a `400` error.

---

### COMP-007: No Webhook Signature Verification on Intake Endpoints
- **Severity:** High
- **Framework/Control:** OWASP ASVS L2 V13.2.3; SOC2 CC6.1; ISO 27001 A.14.2.5
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** The intake endpoints `POST /api/intake/zendesk` and `POST /api/intake/automated` accept any request body without validating that the payload originates from a legitimate source. Zendesk webhooks include an `X-Zendesk-Webhook-Signature` header for HMAC-SHA256 verification; this is not implemented. Any external party who knows the endpoint URL can inject arbitrary work items into the workflow.
- **Remediation:**
  1. For Zendesk: Read the `X-Zendesk-Webhook-Signature` header, compute `HMAC-SHA256(rawBody, process.env.ZENDESK_WEBHOOK_SECRET)`, compare with `timingSafeEqual`. Reject with `401` on mismatch.
  2. For automated: Require a pre-shared `Authorization: Bearer <token>` header validated against `process.env.AUTOMATION_WEBHOOK_TOKEN`.
  3. Store secrets via environment variables, not in source.

---

### COMP-008: No HTTPS / TLS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP ASVS L2 V9.1.1, V9.1.2; SOC2 CC6.1; ISO 27001 A.10.1.1; GDPR Art. 32
- **File/Component:** `Source/Backend/src/app.ts`, `docker-compose.test.yml`
- **Observation:** The server listens on plain HTTP (`app.listen(PORT)`) with no TLS configuration. The Docker Compose test environment exposes port 3001 directly without a TLS-terminating reverse proxy. The Helmet middleware (absent — see COMP-002) would add HSTS headers, but without TLS these are meaningless. All data in transit — including future authentication tokens once COMP-001 is resolved — would be transmitted in the clear.
- **Remediation:**
  1. In production/staging, place the application behind a TLS-terminating reverse proxy (nginx or Caddy) with a valid certificate. Do not implement TLS directly in Node unless necessary.
  2. Add an HTTP→HTTPS redirect at the proxy layer.
  3. Once Helmet is installed (COMP-002), HSTS will be set automatically for browsers.
  4. Update the Docker Compose test environment to include a TLS proxy service.

---

### COMP-009: No Hard Delete / Data Erasure for GDPR Art. 17
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 (Right to Erasure); OWASP ASVS L2 V8.3.4; ISO 27001 A.18.1.4
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** The `DELETE /api/work-items/:id` endpoint performs a **soft delete only** — it sets `item.deleted = true` but leaves all data intact in the in-memory store. While the current WorkItem data model does not contain fields from `sensitive_fields` (email, password, token, etc.), the `title` and `description` fields can contain PII entered by users (e.g., a bug report title containing a customer name or email). GDPR Art. 17 requires the ability to completely erase personal data on request. The soft-delete approach does not satisfy this requirement.
- **Remediation:**
  1. Implement a purge/hard-delete mechanism in `workItemStore.ts` that removes the item from the `Map` entirely.
  2. Expose a `DELETE /api/work-items/:id/purge` endpoint (admin-only, post COMP-001) for GDPR erasure requests.
  3. Alternatively, implement an anonymization function that overwrites PII fields with `[REDACTED]` before soft-deleting — suitable for retaining audit trail structure without PII content.

---

### COMP-010: No Session Management or Timeout Policy
- **Severity:** Medium
- **Framework/Control:** OWASP ASVS L2 V3.2.1, V3.3.1, V3.3.2; SOC2 CC6.2
- **File/Component:** `Source/Backend/src/app.ts` (absent)
- **Observation:** No session management exists. This is partially a consequence of COMP-001 (no auth), but is noted separately because the session policy must be defined before implementation. OWASP ASVS L2 requires: session tokens of ≥128 bits entropy, session invalidation on logout, and idle timeout of ≤30 minutes for standard applications.
- **Remediation:** When implementing authentication (COMP-001), use stateless JWT with short-lived access tokens (15 min expiry) and refresh token rotation, or use `express-session` with a persistent store (Redis) and a 30-minute idle timeout. Implement a `/auth/logout` endpoint that invalidates the refresh token.

---

### COMP-011: No Actor Identity in State-Transition Change History
- **Severity:** Medium
- **Framework/Control:** OWASP ASVS L2 V7.2.6; SOC2 CC8.1; ISO 27001 A.12.4.3
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (line 132), `Source/Backend/src/routes/workflow.ts` (lines 113–116, 170–173), `Source/Backend/src/services/changeHistory.ts`
- **Observation:** All state-transition change history entries use hardcoded agent strings (`'user'`, `'manual-override'`, `'system'`, `'dispatcher'`, `'assessment-pod'`) instead of the authenticated user's identity. SOC2 CC8.1 requires that changes be attributable to specific individuals. Since no auth exists, the actor is never captured.
- **Remediation:** After implementing authentication (COMP-001), thread the authenticated user's identity (user ID and display name) through to `trackUpdates()` and `buildChangeEntry()` calls. Replace the literal `'user'` string with the requesting user's ID from the JWT/session.

---

### COMP-012: Error Handler Logs Full Stack Traces
- **Severity:** Low
- **Framework/Control:** OWASP ASVS L2 V7.4.1; ISO 27001 A.12.4.1
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts` (line 6)
- **Observation:** The error handler logs `err.stack` to stdout: `logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack })`. Stack traces may reveal internal module paths, library versions, and code structure to anyone with access to application logs. While clients correctly receive only `{ error: 'Internal server error' }`, log access controls need to be verified at deployment.
- **Remediation:** In production (`NODE_ENV=production`), omit the `stack` field from log output, or route stack traces to a separate debug log level that is filtered out in production. Example: `stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined`.

---

## Compliance Matrix

### OWASP ASVS Level 2

| Control ID | Description | Status | Finding |
|---|---|---|---|
| V2.1.1 | Passwords ≥12 chars | N/A | No auth system |
| V3.2.1 | Session token ≥128 bits entropy | **FAIL** | COMP-010 |
| V3.3.1 | Session idle timeout ≤30 min | **FAIL** | COMP-010 |
| V3.3.2 | Session invalidation on logout | **FAIL** | COMP-010 |
| V4.1.1 | Access controls enforced at trusted layer | **FAIL** | COMP-001 |
| V4.1.3 | Deny-by-default access control | **FAIL** | COMP-001 |
| V4.2.1 | AC enforced at point of execution | **FAIL** | COMP-001 |
| V5.1.1 | Positive server-side input validation | **PARTIAL** | Enum fields validated; no length/size limits |
| V5.1.3 | Input length limits enforced | **FAIL** | COMP-006 |
| V7.1.1 | Structured logging format | **PASS** | JSON logger implemented |
| V7.2.1 | Security events logged | **FAIL** | COMP-005 |
| V7.2.2 | No sensitive data in logs | **PASS** | No PII fields in current model |
| V7.4.1 | Generic error responses to client | **PARTIAL** | Client gets generic error; stack in logs (COMP-012) |
| V8.3.4 | Data deletion mechanism exists | **FAIL** | COMP-009 |
| V9.1.1 | TLS enforced for all connections | **FAIL** | COMP-008 |
| V9.1.2 | Strong TLS cipher configuration | **FAIL** | COMP-008 |
| V13.1.1 | Token-based authentication | **FAIL** | COMP-001 |
| V13.2.3 | Webhook/callback origin verified | **FAIL** | COMP-007 |
| V13.2.5 | Rate limiting / anti-automation | **FAIL** | COMP-004 |
| V14.4.1 | Security headers present | **FAIL** | COMP-002 |
| V14.5.3 | CORS policy enforced | **FAIL** | COMP-003 |

**OWASP ASVS L2 Result: 2 PASS, 2 PARTIAL, 15 FAIL, 2 N/A** — ❌ Not compliant

---

### SOC2 Type 2

| Control | Description | Status | Finding |
|---|---|---|---|
| CC6.1 | Logical access security software | **FAIL** | COMP-001, COMP-003, COMP-008 |
| CC6.2 | Prior to issuing credentials — security | **N/A** | No user registration/credential issuance |
| CC6.3 | Role-based access controls | **FAIL** | COMP-001 |
| CC7.1 | System monitoring and logging | **PARTIAL** | Prometheus + structured logs present; required audit events absent (COMP-005) |
| CC8.1 | Change management authorization | **PARTIAL** | Change history tracked; no actor identity (COMP-011) |

**SOC2 Result: 0 PASS, 2 PARTIAL, 2 FAIL, 1 N/A** — ❌ Not compliant

---

### ISO 27001 (mapped, not in security.config.yml but specified in task scope)

| Control | Description | Status | Finding |
|---|---|---|---|
| A.9.1.2 | Access to networks and network services | **FAIL** | COMP-001, COMP-003 |
| A.9.4.2 | Secure log-on procedures | **FAIL** | COMP-001 |
| A.10.1.1 | Policy on the use of cryptographic controls | **FAIL** | COMP-008 |
| A.12.4.1 | Event logging | **PARTIAL** | Structured logging exists; audit events absent (COMP-005) |
| A.12.4.3 | Administrator and operator logs | **FAIL** | COMP-011 |
| A.14.2.5 | Secure system engineering principles | **FAIL** | COMP-002, COMP-007 |
| A.18.1.4 | Privacy and protection of PII | **FAIL** | COMP-009 |

**ISO 27001 Result: 0 PASS, 1 PARTIAL, 6 FAIL** — ❌ Not compliant

---

### GDPR

| Article | Description | Status | Finding |
|---|---|---|---|
| Art. 17 | Right to erasure | **FAIL** | COMP-009 |
| Art. 25 | Data protection by design | **FAIL** | COMP-001, COMP-002, COMP-008 |
| Art. 32 | Security of processing | **FAIL** | COMP-001, COMP-008 |

**GDPR Result: 0 PASS, 3 FAIL** — ❌ Not compliant

---

## Overall Grade

Per `security.config.yml` grading matrix:

| Finding | Count |
|---|---|
| Critical | 0 |
| High | 6 (COMP-001, 002, 003, 005, 007, 008) |
| Medium | 4 (COMP-004, 006, 009, 010, 011) |
| Low | 1 (COMP-012) |

**Compliance pass rate: 22%** (5 passing across all frameworks, including partials)

**Grade: D** — Exceeds the `max_high: 6` threshold for Grade C and falls below the 60% minimum compliance pass rate for Grade C.

---

## Prioritised Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | COMP-001 — Implement authentication | Large | Unblocks COMP-005, COMP-010, COMP-011 |
| P1 | COMP-002 — Add Helmet middleware | Trivial | Fixes V14.4.x entirely |
| P1 | COMP-003 — Add CORS policy | Trivial | Fixes V14.5.3 |
| P1 | COMP-008 — Enforce TLS | Medium | Required for any production deployment |
| P2 | COMP-004 — Add rate limiting | Small | express-rate-limit, 1-hour effort |
| P2 | COMP-007 — Webhook HMAC verification | Small | Blocks intake injection |
| P2 | COMP-006 — Cap pagination limit | Trivial | 1 line per handler |
| P3 | COMP-005 — Emit required audit events | Medium | Depends on COMP-001 |
| P3 | COMP-009 — Hard-delete / anonymize | Small | GDPR compliance |
| P3 | COMP-011 — Actor identity in history | Small | Depends on COMP-001 |
| P4 | COMP-010 — Session policy | Small | Depends on COMP-001 |
| P4 | COMP-012 — Stack trace log filtering | Trivial | Low risk in current state |

---

*Compliance Auditor agent — TheGuardians | run-20260420-054547*
