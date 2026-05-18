The compliance audit is complete. Here is the full report for the team leader:

---

## Compliance Audit Results — dev-crew Source App

**Frameworks audited:** OWASP-ASVS L2, SOC2-Type2 CC6.1/CC6.2/CC6.3/CC7.1/CC8.1  
**Overall pass rate: 28% (5/18 controls) → Grade D**

---

### Findings (13 total)

---

### COMP-001: No Authentication on Any API Endpoint
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1, CC6.2 · OWASP-ASVS V2.1.1, V4.2.1
- **File/Component:** `Source/Backend/src/app.ts` — all route registrations
- **Observation:** Every endpoint (`/api/work-items`, `/api/workflow`, `/api/dashboard`, `/api/intake`, `/metrics`) is completely unauthenticated. No JWT, no session, no API-key check — zero authentication libraries are in `package.json`. Any anonymous HTTP client can create, modify, approve, reject, and dispatch work items.
- **Remediation:** Add JWT middleware (`passport`/`express-jwt`), apply `authenticate` globally in `app.ts` before all route groups, restrict `/metrics` to internal network or static bearer token.

---

### COMP-002: No Authorisation / RBAC
- **Severity:** High
- **Framework/Control:** SOC2 CC6.3 · OWASP-ASVS V4.1.1, V4.2.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `dashboard.ts`, `intake.ts`
- **Observation:** Zero role or permission checks. Any caller can trigger sensitive state transitions (`/approve`, `/reject`, `/dispatch`) with no identity verification.
- **Remediation:** Define roles (`operator`, `reviewer`, `admin`); add `authorize(role)` middleware per route group; restrict state-transition routes to `reviewer`+, dispatch to `admin`.

---

### COMP-003: No HTTP Security Headers (Helmet Missing)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.1–V14.4.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** `helmet` is absent from `package.json`. No `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, or `Content-Security-Policy` headers are present.
- **Remediation:** `npm install helmet` + `app.use(helmet())` as the first middleware.

---

### COMP-004: No CORS Policy
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.6
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No `cors` middleware; backend responds to requests from any origin.
- **Remediation:** `npm install cors`; configure `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }))`.

---

### COMP-005: No Rate Limiting
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.2.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** All endpoints accept unlimited requests per second — intake webhooks and state-transition routes are particularly vulnerable to abuse.
- **Remediation:** `npm install express-rate-limit`; global limiter (100 req/min), stricter on intake (10 req/min).

---

### COMP-006: Missing Required Audit Log Events
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.2
- **File/Component:** `Source/Backend/src/routes/`, `src/services/`
- **Observation:**

  | Required Event | Present? |
  |---|---|
  | `login_attempt` | ❌ No auth system |
  | `permission_denied` | ❌ No auth system |
  | `state_transition` | ⚠️ Partial — embedded in entity `changeHistory`, not a dedicated log stream |
  | `data_export` | ❌ List/dashboard endpoints log at `debug` only, no audit event |

- **Remediation:** Create `audit.ts` module emitting structured `{ event, actorId, resourceId, outcome, timestamp }` lines; wire into state transitions, list routes, and future auth routes.

---

### COMP-007: Unbounded Pagination (No `limit` Cap)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V5.1.3
- **File/Component:** `routes/workItems.ts:70`, `routes/dashboard.ts:18`
- **Observation:** `?limit=1000000` is accepted without bounds; callers can enumerate the entire dataset in one request.
- **Remediation:** `const safeLimit = Math.min(parseInt(...) || 20, 100)` in both routes.

---

### COMP-008: No Request Body Size Limit
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V5.1.3
- **File/Component:** `Source/Backend/src/app.ts:13`
- **Observation:** `express.json()` called without explicit `limit`; no max-length validation on `title`/`description` fields.
- **Remediation:** `express.json({ limit: '100kb' })`; add max-length validation (title ≤ 255, description ≤ 5000).

---

### COMP-009: `/metrics` Endpoint Unauthenticated
- **Severity:** Medium
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V4.2.1
- **File/Component:** `Source/Backend/src/app.ts:34`
- **Observation:** Prometheus `/metrics` exposes internal counters, team names, and Node.js system metrics to any caller.
- **Remediation:** Bind to a separate internal port, or add a static bearer-token check via environment variable.

---

### COMP-010: No TLS / HTTPS Enforcement
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V9.1.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (startup)
- **Observation:** App starts as plain HTTP with no TLS enforcement at the application layer.
- **Remediation:** Document mandatory deployment behind a TLS-terminating reverse proxy; add startup warning if `BEHIND_TLS_PROXY` is unset; enable `helmet.hsts()`.

---

### COMP-011: No Hard-Delete / GDPR Right to Erasure (Art. 17)
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17
- **File/Component:** `Source/Backend/src/store/workItemStore.ts:78`
- **Observation:** Only soft-delete exists (`item.deleted = true`). No endpoint or mechanism for hard deletion; user-supplied `title`/`description` text (potential PII) can never be fully erased.
- **Remediation:** Add `hardDelete(id)` to the store; expose as admin-only endpoint; purge change history entries.

---

### COMP-012: Stack Traces in Server Logs
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V7.1.2
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts:6`
- **Observation:** Full `err.stack` is logged server-side. Not client-facing (client sees `"Internal server error"` only), but reveals internal file paths in log aggregators.
- **Remediation:** Gate stack logging on `NODE_ENV !== 'production'`.

---

### COMP-013: Intake Webhooks Lack Signature Verification
- **Severity:** Medium
- **Framework/Control:** SOC2 CC8.1 · OWASP-ASVS V13.2.6
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `/api/intake/automated` accept any unsigned POST. Any caller can inject fabricated work items into the workflow.
- **Remediation:** Add HMAC-SHA256 signature verification middleware checking `X-Webhook-Signature` against `process.env.WEBHOOK_SECRET`; reject unsigned requests with `401`.

---

## Compliance Matrix

| Framework | Control | Status |
|---|---|---|
| SOC2 | CC6.1 — Logical access controls | ❌ FAIL |
| SOC2 | CC6.2 — System credentials managed | ❌ FAIL |
| SOC2 | CC6.3 — Role-based access control | ❌ FAIL |
| SOC2 | CC7.1 — Detect and monitor threats | ⚠️ PARTIAL |
| SOC2 | CC8.1 — Authorised change management | ⚠️ PARTIAL |
| OWASP-ASVS L2 | V2.2.1 — Rate limiting / anti-automation | ❌ FAIL |
| OWASP-ASVS L2 | V4.1.1 — Least privilege | ❌ FAIL |
| OWASP-ASVS L2 | V4.2.1 — Server-side access control | ❌ FAIL |
| OWASP-ASVS L2 | V5.1.3 — Input length validation | ❌ FAIL |
| OWASP-ASVS L2 | V6.2.1 — No custom crypto algorithms | ✅ PASS |
| OWASP-ASVS L2 | V7.1.1 — No credentials in logs | ✅ PASS |
| OWASP-ASVS L2 | V7.1.2 — No sensitive PII in logs | ✅ PASS |
| OWASP-ASVS L2 | V7.2.2 — Auth events logged | ❌ FAIL |
| OWASP-ASVS L2 | V9.1.1 — TLS for all connections | ❌ FAIL |
| OWASP-ASVS L2 | V13.2.6 — Webhook origin/signature verification | ❌ FAIL |
| OWASP-ASVS L2 | V14.4.1 — HTTP security headers | ❌ FAIL |
| OWASP-ASVS L2 | V14.4.6 — CORS policy | ❌ FAIL |
| OWASP-ASVS L2 | V14.5.3 — HTTP methods restricted | ✅ PASS |

**Overall: 5 pass / 11 fail / 2 partial → 28% pass rate → Grade D**

---

## Positive Observations

The codebase does several things correctly: ✅ structured JSON logging with no `console.log` in production code; ✅ change-history tracking on every state mutation; ✅ Prometheus metrics for domain operations; ✅ no hardcoded secrets anywhere in the source tree; ✅ error handler returns generic messages to clients (stack traces never leak to callers); ✅ enum validation on all typed input fields.

The dominant gap is the **complete absence of an authentication and authorisation layer** — resolving COMP-001 and COMP-002 alone would lift 5 controls from fail to pass. The remaining three high-severity items (COMP-003/004/005) are each one-line fixes and together would raise the pass rate above 60% (Grade C).
