Dashboard requires a pre-existing run ID; reporting is captured in the learnings file instead. Here is the full compliance audit report:

---

# Compliance Audit Report — dev-crew Source App
**Date:** 2026-09-14  
**Frameworks:** OWASP-ASVS L2 · SOC2-Type2 (CC6.1, CC6.2, CC6.3, CC7.1, CC8.1)  
**Auditor:** compliance_auditor  
**Overall Pass Rate: 23% (3/13 controls) — Grade: F (below all thresholds)**

---

## Findings

---

### COMP-001: No Authentication Layer — All Endpoints Publicly Accessible
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V2.1 (Authentication), SOC2 CC6.1, CC6.2
- **File/Component:** `Source/Backend/src/app.ts`, all route files
- **Observation:** The Express application registers zero authentication middleware. Every endpoint — including sensitive workflow actions such as `/api/work-items/:id/approve`, `/api/work-items/:id/reject`, and `/api/work-items/:id/dispatch` — accepts anonymous requests with no token, session, or API-key validation. `CLAUDE.md` references login credentials (`admin@example.com / admin123`) implying auth was intended, but no implementation exists in the source tree. `package.json` contains no `passport`, `jsonwebtoken`, `express-session`, or equivalent library.
- **Remediation:**  
  1. Add an authentication middleware (JWT bearer token or session cookie) in `app.ts` before all `/api/*` routes.  
  2. Add `jsonwebtoken` (or `express-session` + `passport`) to `package.json`.  
  3. Protect the `/metrics` endpoint with at least bearer-token or network-level controls.  
  4. Document credentials and token lifecycle in a specification.

---

### COMP-002: No Authorization / Role-Based Access Control
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V4.1 (Access Control), SOC2 CC6.3
- **File/Component:** `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/workItems.ts`
- **Observation:** No route handler performs any authorization check. Any caller (once authentication is added) can approve, reject, or dispatch any work item regardless of role. The principle of least privilege is entirely unenforced. The `changeHistory` records an `agent` field as a free string but there is no mechanism to verify or constrain what values are valid.
- **Remediation:**  
  1. Define roles (e.g., `viewer`, `operator`, `admin`) in a shared type.  
  2. Add an `authorize(role[])` middleware to sensitive mutation endpoints (`/approve`, `/reject`, `/dispatch`).  
  3. Derive the actor identity from the authenticated session/token rather than accepting it from the request body.

---

### COMP-003: All Four Required Audit Events Are Missing
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1, OWASP-ASVS V7.2 (Audit Logging)
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route and service files
- **Observation:** `security.config.yml` mandates four audit events: `login_attempt`, `permission_denied`, `state_transition`, and `data_export`. None of these are emitted as structured, typed log entries anywhere in the codebase:
  - **`login_attempt`** — No authentication layer exists, so no login is attempted or recorded.  
  - **`permission_denied`** — No access-control layer exists, so no denial is ever recorded.  
  - **`state_transition`** — Workflow status changes are logged as operational `info` messages (e.g., `"Work item routed"`), but there is no dedicated `audit` log level or event type. These cannot be reliably filtered for compliance review.  
  - **`data_export`** — No data-export mechanism exists; no event is ever emitted.
- **Remediation:**  
  1. Add an `audit` severity level to `utils/logger.ts` that tags entries with `"type": "audit_event"`.  
  2. Emit typed audit events for each required category: `{ event: 'state_transition', workItemId, from, to, actor }`.  
  3. Once authentication exists, emit `login_attempt` (success/failure) and `permission_denied` events.

---

### COMP-004: No Security HTTP Headers (Helmet Missing)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4 (HTTP Security Headers), SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`, `Source/Backend/package.json`
- **Observation:** Neither `helmet` nor any manual header-setting code is present. The API response therefore lacks: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. The frontend (`Source/Frontend`) also has no CSP meta-tag or Vite security plugin configured.
- **Remediation:**  
  1. `npm install helmet` in `Source/Backend`.  
  2. Add `app.use(helmet())` as the first middleware in `app.ts`.  
  3. Configure frontend `vite.config.ts` to emit CSP headers via the dev-server and document production proxy CSP.

---

### COMP-005: No CORS Policy — Cross-Origin Requests Accepted From Any Origin
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.5 (HTTP Request Validation), SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No `cors` middleware is installed or configured. Express's default behaviour allows any origin to make requests to the API, which means a malicious third-party website can issue credentialed cross-origin requests to all workflow endpoints.
- **Remediation:**  
  1. `npm install cors` and `@types/cors`.  
  2. Add `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'], credentials: true }))` before route registration.  
  3. Set `ALLOWED_ORIGINS` in `.env`.

---

### COMP-006: No Rate Limiting — Brute-Force and Enumeration Attacks Unmitigated
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V13.1 (API Security), SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No rate-limiting middleware (`express-rate-limit` or equivalent) is present. All endpoints including the webhook intake (`/api/intake/zendesk`, `/api/intake/automated`) and list endpoints (`GET /api/work-items`) accept unlimited requests per second. The list endpoint's `limit` query parameter has no server-enforced maximum — a caller can pass `?limit=999999` to enumerate the entire dataset in one request.
- **Remediation:**  
  1. `npm install express-rate-limit`.  
  2. Apply a global rate limiter (e.g., 200 req/min per IP) in `app.ts`.  
  3. Apply a tighter limit to intake webhook endpoints (e.g., 20 req/min).  
  4. Cap `limit` query parameter to a maximum of 100 in `workItems.ts` and `dashboard.ts`.

---

### COMP-007: No Data Encryption at Rest — In-Memory Store With No Persistence
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V8.3 (Sensitive Private Data), SOC2 CC6.1
- **File/Component:** `Source/Backend/src/store/workItemStore.ts`
- **Observation:** All application data is stored in a JavaScript `Map` (`let items: Map<string, WorkItem>`). There is no database, no disk persistence, no encryption at rest. Data is lost on process restart. While current `WorkItem` fields do not include PII, the Zendesk intake endpoint accepts arbitrary `body.description` content which may contain user data. No field-level encryption or masking exists.
- **Remediation:**  
  1. Migrate to a persistent database (PostgreSQL, SQLite) with encrypted storage volumes or column-level encryption for any sensitive text fields.  
  2. If a database is out of scope for this phase, document the architectural decision and explicitly limit which data types may be stored.

---

### COMP-008: Soft Delete Does Not Satisfy Right-to-Erasure (GDPR Art. 17)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V8.3, GDPR Art. 17 (Right to Erasure)
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (`softDelete` function)
- **Observation:** The `softDelete` function sets `item.deleted = true` but the record remains in memory (and would remain on disk if persistence were added). The data is still present; it is merely filtered from list queries. There is no mechanism for actual data purge, anonymisation, or any right-to-erasure workflow. The `DELETE /api/work-items/:id` endpoint permanently retains the data.
- **Remediation:**  
  1. Implement a hard-delete function that physically removes the record (or anonymises all PII fields).  
  2. Add a data-retention schedule or TTL policy (e.g., completed/rejected items older than 90 days are purged).  
  3. Document the erasure policy in the specifications.

---

### COMP-009: Error Messages May Leak Internal Details to Clients
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V7.4 (Error Handling)
- **File/Component:** `Source/Backend/src/routes/workflow.ts` (all catch blocks)
- **Observation:** Several route handlers propagate the raw JavaScript `Error.message` directly to the HTTP response body: `res.status(500).json({ error: message })`. If an internal service throws an exception with a detailed message (e.g., a stack trace fragment or SQL error), it will be returned to the client verbatim.
- **Remediation:**  
  1. Classify errors at the service layer into safe user-facing messages vs. internal error codes.  
  2. For unexpected errors (`status 500`), return a generic message (`"An internal error occurred"`) and log the full details server-side only.  
  3. The existing `errorHandler` middleware already does this correctly — ensure all catch blocks call `next(err)` rather than crafting their own 500 responses.

---

### COMP-010: Unauthenticated Prometheus `/metrics` Endpoint
- **Severity:** Medium
- **Framework/Control:** SOC2 CC6.1, OWASP-ASVS V14.2 (Dependency Exposure)
- **File/Component:** `Source/Backend/src/app.ts` (line 34)
- **Observation:** The `/metrics` endpoint is registered without any authentication guard and returns full Prometheus metrics including process memory, CPU, active handles, and custom counters. In a network-accessible environment this discloses internal operational telemetry.
- **Remediation:**  
  1. Add a simple bearer-token check middleware specific to the `/metrics` route, keyed by `METRICS_TOKEN` env var.  
  2. Or bind the metrics endpoint to a separate internal-only port (common prom-client pattern).

---

## Compliance Matrix

| Control ID | Framework | Topic | Status | Finding |
|---|---|---|---|---|
| ASVS V2.1 | OWASP-ASVS L2 | Authentication | ❌ FAIL | COMP-001 |
| ASVS V4.1 | OWASP-ASVS L2 | Access Control | ❌ FAIL | COMP-002 |
| ASVS V7.1 | OWASP-ASVS L2 | Audit Logging | ❌ FAIL | COMP-003 |
| ASVS V7.4 | OWASP-ASVS L2 | Error Handling | ⚠️ PARTIAL | COMP-009 |
| ASVS V8.3 | OWASP-ASVS L2 | Data Protection | ❌ FAIL | COMP-007, COMP-008 |
| ASVS V9.1 | OWASP-ASVS L2 | TLS / Communication | ⚠️ UNVERIFIABLE | Static analysis only — TLS may be at reverse proxy |
| ASVS V13.1 | OWASP-ASVS L2 | API Security / Rate Limiting | ❌ FAIL | COMP-006 |
| ASVS V14.4 | OWASP-ASVS L2 | Security Headers | ❌ FAIL | COMP-004 |
| ASVS V14.5 | OWASP-ASVS L2 | CORS Policy | ❌ FAIL | COMP-005 |
| SOC2 CC6.1 | SOC2-Type2 | Logical Access Controls | ❌ FAIL | COMP-001, COMP-004, COMP-006 |
| SOC2 CC6.2 | SOC2-Type2 | Authentication Mechanisms | ❌ FAIL | COMP-001 |
| SOC2 CC6.3 | SOC2-Type2 | Authorization / Least Privilege | ❌ FAIL | COMP-002 |
| SOC2 CC7.1 | SOC2-Type2 | Monitoring & Audit Logging | ❌ FAIL | COMP-003 |
| SOC2 CC8.1 | SOC2-Type2 | Change Management | ✅ PARTIAL PASS | `changeHistory` array tracks mutations, no actor enforcement |

**Summary:** 3 controls pass or partially pass · 10 controls fail · 1 unverifiable  
**Pass Rate: ~23%** — Below Grade D threshold. Grade: **F**

---

## Priority Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | COMP-001 — Add authentication (JWT/session) | High | Unlocks all other auth controls |
| P1 | COMP-002 — Add RBAC middleware | Medium | Prevents privilege escalation |
| P1 | COMP-003 — Emit typed audit events | Low | Directly satisfies SOC2 CC7.1 |
| P2 | COMP-004 — Install Helmet (security headers) | Very Low | 1-line fix, high compliance value |
| P2 | COMP-005 — Configure CORS policy | Very Low | 1-line fix |
| P2 | COMP-006 — Add rate limiting + cap `limit` param | Low | Prevents enumeration / DoS |
| P3 | COMP-009 — Sanitise error responses | Low | Prevents internal detail leakage |
| P3 | COMP-010 — Protect `/metrics` endpoint | Very Low | 1-line bearer guard |
| P4 | COMP-007 — Migrate to persistent encrypted storage | High | Required for at-rest controls |
| P4 | COMP-008 — Implement hard-delete / erasure | Medium | Required for GDPR Art. 17 |
