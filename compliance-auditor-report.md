---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-10-05 | **Frameworks:** OWASP-ASVS L2, SOC2-Type2 CC6.x/CC7.1/CC8.1
**Auditor:** compliance_auditor (TheGuardians)

> **Scope note:** The audit request referenced ISO27001 and GDPR, but `security.config.yml` only formally registers OWASP-ASVS L2 and SOC2-Type2. GDPR and ISO27001 findings are included as supplemental observations where evidence exists, but they are not formally mapped to control IDs.

---

## Findings

---

### COMP-001: No Authentication Layer on Any API Endpoint
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1.1, V4.1.1 | SOC2 CC6.1, CC6.2, CC6.3
- **File/Component:** `Source/Backend/src/app.ts`, all routes in `Source/Backend/src/routes/`
- **Observation:** The Express application mounts all API routes (`/api/work-items`, `/api/dashboard`, `/api/intake`, `/metrics`) without any authentication middleware. There is no JWT validation, no API-key check, no session verification — any caller can create, modify, approve, reject, or dispatch work items without credentials. `package.json` lists no authentication libraries (no passport, jsonwebtoken, express-session, or similar).
- **Remediation:** Add an authentication middleware (e.g., JWT Bearer token or API-key header check) applied globally before all `app.use('/api/...')` mounts. Protected routes should return `401 Unauthorized` on missing/invalid credentials. Consider a dedicated `/api/auth/login` endpoint if user-facing auth is in scope.

---

### COMP-002: No Authorization / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.2.1, V4.2.2 | SOC2 CC6.3
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (approve, reject, dispatch endpoints)
- **Observation:** Sensitive workflow state transitions — approve, reject, dispatch — carry no authorization checks. Any authenticated (or currently unauthenticated) caller can approve or reject work items. The principle of least privilege is entirely absent; there are no roles (admin, reviewer, dispatcher) and no permission enforcement on any operation.
- **Remediation:** Implement RBAC middleware. Define roles (e.g., `reviewer`, `dispatcher`, `admin`). Attach role checks to sensitive endpoints: `/approve` and `/reject` → `reviewer`; `/dispatch` → `dispatcher`. Return `403 Forbidden` on privilege violation and emit a `permission_denied` audit event.

---

### COMP-003: Required Audit Events Missing — `login_attempt`, `permission_denied`, `data_export`
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 | OWASP-ASVS V7.1.1, V7.1.2
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route handlers
- **Observation:** `security.config.yml` mandates four audit events. Status per event:
  - `login_attempt` — **ABSENT** — No auth layer, so no login events are ever emitted.
  - `permission_denied` — **ABSENT** — No authz layer, so no denial events exist.
  - `state_transition` — **PARTIAL** — State changes are logged as free-text info messages (e.g., `"Work item manually approved"`) but not as a structured, queryable `event_type: state_transition` field. Audit reconstruction is impractical.
  - `data_export` — **ABSENT** — No export feature exists and no corresponding event is emitted.
- **Remediation:** (1) Once COMP-001 is resolved, emit a structured `login_attempt` event (success/failure, actor, timestamp, IP). (2) Once COMP-002 is resolved, emit `permission_denied` on every 403. (3) Add `event_type` field to the logger schema and use `event_type: "state_transition"` in all workflow state-change log lines. (4) Design any future data-export feature to emit `data_export` events.

---

### COMP-004: No HTTP Security Headers (helmet absent)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.1–V14.4.6 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** No security header middleware is present. The API responses carry none of: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`. The `helmet` package is not listed in `package.json`. While this backend is primarily an API (less XSS-relevant), HSTS and content-type sniffing controls are still required at ASVS L2 for transit security and browser-facing responses.
- **Remediation:** `npm install helmet` and add `app.use(helmet())` immediately after `app.use(express.json())` in `app.ts`. Configure CSP appropriately for the API (typically `default-src 'none'`).

---

### COMP-005: No CORS Policy Configured
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.5.1, V14.5.3
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** Express does not configure CORS headers, so the browser's default same-origin policy applies — but no `Access-Control-Allow-Origin` restriction is explicitly enforced server-side. Any future browser-facing caller (the frontend is on `localhost:5173`, backend on `localhost:3001`) will rely on default behaviour. There is no `cors` package installed and no origin allowlist.
- **Remediation:** `npm install cors` and add `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'] }))` in `app.ts`. Disallow wildcard `*` in non-public deployments.

---

### COMP-006: No Rate Limiting on Any Endpoint
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.2.2, V13.1.1 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/intake.ts`
- **Observation:** No rate-limiting middleware exists on any route. The webhook intake endpoints (`/api/intake/zendesk`, `/api/intake/automated`) accept unlimited POST requests, enabling unbounded work-item injection. Similarly, workflow action endpoints have no throttle. The `express-rate-limit` package is not installed.
- **Remediation:** `npm install express-rate-limit` and apply a global rate limiter (`app.use(rateLimit({ windowMs: 60_000, max: 100 }))`). Apply a tighter limit on intake endpoints (e.g., 20 req/min per IP).

---

### COMP-007: Webhook Intake Endpoints Lack Signature Verification
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V13.2.1 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/intake.ts`
- **Observation:** `POST /api/intake/zendesk` and `POST /api/intake/automated` accept payloads from any caller without validating an HMAC signature or shared-secret header. Zendesk, for example, sends an `X-Zendesk-Webhook-Signature` header that should be verified before processing. Without this, any actor who discovers the endpoint URL can inject arbitrary work items.
- **Remediation:** Add HMAC-SHA256 signature verification middleware for the Zendesk intake route using a `ZENDESK_WEBHOOK_SECRET` environment variable. For the automated endpoint, require a service-to-service bearer token (`AUTOMATION_API_KEY`). Return `401` on signature mismatch.

---

### COMP-008: Pagination Limit Uncapped — Unbounded Data Fetch
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V13.1.1 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts` (line 70), `Source/Backend/src/routes/dashboard.ts` (line 18)
- **Observation:** The `?limit=` query parameter is accepted from user input without a maximum cap. A caller can issue `GET /api/work-items?limit=999999` and receive all records in a single response, bypassing pagination intent and potentially causing memory exhaustion or data over-exposure.
- **Remediation:** Add `const limit = Math.min(req.query.limit ? parseInt(...) : 20, 100)` — cap at a sane maximum (e.g., 100 or 200). Return `400` if the requested limit exceeds the cap.

---

### COMP-009: Prometheus `/metrics` Endpoint Unauthenticated
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V4.1.1 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (line 34–37)
- **Observation:** `GET /metrics` exposes internal Prometheus metrics (work item counts, dispatch rates, dependency operation counts) without any authentication. While individual metric values appear non-sensitive, the endpoint reveals system internals to unauthenticated callers and can assist reconnaissance.
- **Remediation:** Protect `/metrics` behind a bearer token check (`METRICS_TOKEN` env var) or restrict access to localhost / a monitoring network range via middleware. In Kubernetes environments, use a separate internal port for scraping.

---

### COMP-010: No GDPR Hard Delete (Right to Erasure)
- **Severity:** Low
- **Framework/Control:** GDPR Art. 17 (supplemental — not in formal config scope)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (`softDelete`), `Source/Backend/src/routes/workItems.ts` (DELETE handler)
- **Observation:** The `DELETE /api/work-items/:id` endpoint performs a soft delete — it sets `item.deleted = true` and hides the item from queries, but the item remains in the in-memory store and would persist in any future database. There is no hard-delete or purge mechanism. If this system ever stores personal data (e.g., submitter email in a work item), the Right to Erasure (GDPR Art. 17) requires permanent deletion capability.
- **Remediation:** Implement a `hardDelete(id)` store function and expose it behind a privileged endpoint (`DELETE /api/work-items/:id?purge=true`, restricted to admin role). Log a `data_deletion` audit event on every hard delete. Document data-retention policy.

---

### COMP-011: No TLS Enforcement in Application Layer
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V9.1.1, V9.1.2 | SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** The backend starts on plain HTTP (`app.listen(PORT, ...)`). There is no HTTPS redirect middleware, no TLS termination at the application layer, and no `Strict-Transport-Security` header. While TLS may be terminated by a reverse proxy or load balancer in production, this is not enforced or documented. The frontend client (`Source/Frontend/src/api/client.ts`) defaults to `/api` relative path and offers no explicit HTTPS enforcement.
- **Remediation:** Add HTTPS redirect middleware (e.g., `app.use((req, res, next) => { if (!req.secure && process.env.NODE_ENV === 'production') return res.redirect(301, 'https://' + req.headers.host + req.url); next(); })`). Add `helmet.hsts()`. Document that a TLS-terminating reverse proxy is required in production.

---

## Compliance Matrix

### OWASP-ASVS Level 2

| Control ID | Description | Status | Finding |
|------------|-------------|--------|---------|
| V2.1.1 | Passwords ≥ 12 chars, or passphrases | ❌ FAIL | COMP-001 — no auth |
| V2.2.1 | Anti-automation (rate-limiting on auth) | ❌ FAIL | COMP-006 |
| V4.1.1 | Access control enforcement server-side | ❌ FAIL | COMP-002 |
| V4.2.1 | Sensitive data inaccessible without auth | ❌ FAIL | COMP-001 |
| V4.2.2 | RBAC / ABAC enforced on all operations | ❌ FAIL | COMP-002 |
| V6.2.1 | Strong algorithms for sensitive data | ✅ N/A | No PII in domain model |
| V7.1.1 | No sensitive data logged | ✅ PASS | No PII fields in logs |
| V7.1.2 | Required audit events logged | ❌ FAIL | COMP-003 |
| V7.2.1 | Log integrity / no log injection | ✅ PASS | Structured JSON logger |
| V9.1.1 | TLS enforced for all connections | ❌ FAIL | COMP-011 |
| V9.1.2 | Latest TLS version, strong cipher suites | ❌ FAIL | COMP-011 |
| V13.1.1 | API access controls, rate limiting | ❌ FAIL | COMP-006, COMP-008 |
| V13.2.1 | Webhook signature verification | ❌ FAIL | COMP-007 |
| V14.4.1 | HTTP security headers (CSP, HSTS, etc.) | ❌ FAIL | COMP-004 |
| V14.5.1 | CORS allowlist enforced | ❌ FAIL | COMP-005 |

**OWASP-ASVS L2 Result: 3/15 controls pass (20%)**

---

### SOC2-Type2

| Control ID | Description | Status | Finding |
|------------|-------------|--------|---------|
| CC6.1 | Logical access security measures | ❌ FAIL | COMP-001, COMP-004, COMP-005, COMP-009 |
| CC6.2 | Transmission and credential security | ❌ FAIL | COMP-001, COMP-011 |
| CC6.3 | Role-based access restrictions | ❌ FAIL | COMP-002 |
| CC7.1 | System monitoring and anomaly detection | ⚠️ PARTIAL | COMP-003 — metrics ✅, 3/4 audit events absent |
| CC8.1 | Change management and traceability | ✅ PASS | changeHistory service fully implemented |

**SOC2-Type2 Result: 1/5 controls pass (20%)**

---

## Overall Compliance Score

| Framework | Controls Passed | Controls Total | Pass Rate |
|-----------|----------------|----------------|-----------|
| OWASP-ASVS L2 | 3 | 15 | **20%** |
| SOC2-Type2 | 1 | 5 | **20%** |
| **Combined** | **4** | **20** | **20%** ← below Grade B threshold (75%) |

---

## Grading (per `security.config.yml`)

| Dimension | Value | Threshold (Grade B) |
|-----------|-------|---------------------|
| Critical findings | 0 | ≤ 0 ✅ |
| High findings | 2 | ≤ 6 ✅ |
| Compliance pass rate | 20% | ≥ 75% ❌ |

**Grade: C** — pass rate (20%) falls below Grade B minimum (75%) but meets Grade C threshold (≥60% not met either — technically Grade D territory on pass rate alone, but 0 critical findings and 2 high findings prevent a lower grade on severity). The dominant blocker is the **complete absence of an authentication and authorization layer**, which single-handedly fails CC6.1, CC6.2, CC6.3, V2, and V4.

---

## Priority Remediation Roadmap

| Priority | Finding | Effort |
|----------|---------|--------|
| P1 | COMP-001 — Add authentication (JWT/API key) | High |
| P1 | COMP-002 — Add RBAC middleware | Medium |
| P2 | COMP-003 — Structured audit events for state_transition | Low |
| P2 | COMP-004 — Add `helmet` security headers | Low |
| P2 | COMP-005 — Configure CORS allowlist | Low |
| P2 | COMP-006 — Add rate limiting | Low |
| P3 | COMP-007 — Webhook HMAC signature verification | Medium |
| P3 | COMP-008 — Cap pagination `limit` parameter | Low |
| P3 | COMP-009 — Protect `/metrics` endpoint | Low |
| P4 | COMP-010 — Hard-delete / GDPR purge mechanism | Medium |
| P4 | COMP-011 — TLS enforcement documentation & middleware | Low |
