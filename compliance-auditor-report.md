---

## Compliance Audit Report — dev-crew Source App
**Date:** 2026-08-24 | **Frameworks:** OWASP-ASVS L2 · SOC2-Type2 · GDPR Art. 32/17 · ISO27001 A.9

---

### COMP-001: No Authentication or Authorization Layer
- **Severity:** High
- **Framework/Control:** SOC2 CC6.1 · SOC2 CC6.2 · SOC2 CC6.3 · OWASP-ASVS V2.1 · OWASP-ASVS V4.1 · ISO27001 A.9.1
- **File/Component:** `Source/Backend/src/app.ts` — all routes
- **Observation:** The Express application registers no authentication middleware. Every endpoint — including create, update, delete, approve, reject, dispatch, and all workflow transitions — is callable by any unauthenticated caller with network access. There is no JWT verification, API-key check, session validation, or any other identity mechanism. `Source/Backend/src/routes/intake.ts` additionally accepts Zendesk and automated webhook payloads with no shared-secret or HMAC signature verification, meaning any party can inject arbitrary work items.
- **Remediation:** (1) Add an authentication middleware (e.g., JWT via `express-jwt` or an API-key check) to the Express app before all API routes. (2) Implement role-based access control: at minimum distinguish read-only consumers from write/dispatch operators. (3) Add HMAC signature validation (`X-Hub-Signature-256`) to both intake endpoints, verifying a `ZENDESK_WEBHOOK_SECRET` and `INTAKE_WEBHOOK_SECRET` env var. (4) Protect `/metrics` with IP allowlist or HTTP Basic auth.

---

### COMP-002: No TLS/HTTPS Enforcement
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V9.1.1 · GDPR Art. 32(1)(a) · ISO27001 A.10.1 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts` (line 46-52), `Source/Frontend/vite.config.ts`
- **Observation:** The backend listens on plain HTTP (`http://localhost:3001`). There is no TLS termination in code, no HTTP→HTTPS redirect, and no HSTS header. The Vite dev proxy also points to plain HTTP. In a production deployment all traffic — including any future sensitive payloads — travels unencrypted.
- **Remediation:** (1) Terminate TLS at a reverse proxy (nginx/Caddy) in front of the Node process, or enable `https` in Express using `tls.createServer`. (2) Add an HTTP→HTTPS redirect. (3) Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` via Helmet once Helmet is added (COMP-003).

---

### COMP-003: No Security Headers (Helmet Missing)
- **Severity:** High
- **Framework/Control:** OWASP-ASVS V14.4.1 · OWASP-ASVS V14.4.3 · ISO27001 A.14.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No Helmet.js or equivalent is applied. The application emits no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers. A browser-facing XSS payload can execute without CSP blocking; the app can be embedded in foreign frames (clickjacking).
- **Remediation:** Add `import helmet from 'helmet'; app.use(helmet());` as the first middleware in `app.ts`. Configure a strict `Content-Security-Policy` for the frontend (Vite `server.headers`). Add `helmet` to `package.json` dependencies.

---

### COMP-004: No CORS Policy Configured
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.4.2
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** Express emits no `Access-Control-Allow-Origin` header and has no CORS middleware. The API relies on browser same-origin defaults for the proxied dev setup, but in any production deployment with a separate origin this is either entirely open or entirely blocked — neither is correct. Without an explicit allowlist, a malicious page on another origin can make credentialed cross-origin requests if the frontend ever adds session cookies.
- **Remediation:** Add `cors` middleware with an explicit `origin` allowlist: `app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(','), credentials: true }))`.

---

### COMP-005: Missing Required Audit Log Events
- **Severity:** High
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.2.1
- **File/Component:** `Source/Backend/src/utils/logger.ts`, all route handlers
- **Observation:** `security.config.yml` mandates four audit events: `login_attempt`, `permission_denied`, `state_transition`, `data_export`. None are emitted as structured audit records:
  - `login_attempt` — impossible; no authentication layer exists.
  - `permission_denied` — impossible; no access-control layer exists.
  - `state_transition` — work-item status changes are written to `changeHistory` in the data model but are **not** emitted as a structured log event with the canonical event name `state_transition` and required context (actor, from_status, to_status, item_id).
  - `data_export` — no data-export feature exists and no audit event would fire if one did.
  Additionally, the logger has no concept of a dedicated audit log channel or immutable audit trail; all logs go to stdout equally, making it impossible to separate security-relevant events from debug noise.
- **Remediation:** (1) Create an `auditLogger` in `utils/logger.ts` that writes structured events with `event_type`, `actor`, `resource_id`, `timestamp`, and outcome fields. (2) Once authentication exists, emit `login_attempt` and `permission_denied` from auth middleware. (3) Emit `state_transition` events in all workflow action handlers (`workflow.ts`, `assessment.ts`). (4) Emit `data_export` events from any endpoint that bulk-serialises records.

---

### COMP-006: No Rate Limiting
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V13.2.6 · SOC2 CC6.1
- **File/Component:** `Source/Backend/src/app.ts`
- **Observation:** No rate-limiting middleware (`express-rate-limit` or equivalent) is applied to any route. The intake webhook endpoints in particular accept unlimited POST requests; a single client can flood the in-memory store, causing unbounded memory growth. The pagination `limit` query parameter is also unconstrained — a caller may request `?limit=999999` and receive the entire dataset in one response.
- **Remediation:** (1) Add `express-rate-limit` globally and with tighter limits on the `/api/intake/*` routes. (2) Cap the pagination `limit` parameter at a maximum value (e.g., 100) in `workItems.ts` route handler with a `Math.min(limit, 100)` guard.

---

### COMP-007: Prometheus Metrics Endpoint Unauthenticated
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V14.3.1 · SOC2 CC6.1 · ISO27001 A.12.4
- **File/Component:** `Source/Backend/src/app.ts` (line 34-37)
- **Observation:** `GET /metrics` returns Prometheus operational telemetry (item counts, route labels, Node.js process stats) to any unauthenticated caller. This leaks internal operational data that could aid targeted attacks (e.g., identifying high-value state transitions, understanding team names).
- **Remediation:** Protect `/metrics` via IP allowlist (restrict to the Prometheus scrape server's IP), or add HTTP Basic auth middleware before the route. The endpoint must not be publicly accessible.

---

### COMP-008: Soft-Delete Only — No Hard Deletion (GDPR Art. 17)
- **Severity:** Medium
- **Framework/Control:** GDPR Art. 17 (Right to Erasure) · ISO27001 A.18.1.4
- **File/Component:** `Source/Backend/src/store/workItemStore.ts` (softDelete function), all routes
- **Observation:** The `softDelete` function sets `item.deleted = true` but leaves the record in the in-memory `Map`. There is no `hardDelete` or purge operation. While the current data model has no PII fields, if user-identifiable data is ever added to work items (e.g., reporter email, Zendesk user ID) there will be no mechanism to satisfy a Right to be Forgotten request.
- **Remediation:** (1) Add a `purgeWorkItem(id)` export to `workItemStore.ts` that calls `items.delete(id)`. (2) Expose a privileged `DELETE /api/work-items/:id/purge` endpoint (admin-role only once auth exists). (3) Document the data lifecycle policy specifying how long soft-deleted records are retained before automatic purge.

---

### COMP-009: Stack Trace Logged at Error Level — Internal Leakage Risk
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V7.4.1 · SOC2 CC7.1
- **File/Component:** `Source/Backend/src/middleware/errorHandler.ts` (line 6)
- **Observation:** `logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack })` — full stack traces are logged to stdout. The error is not returned to the client (generic `Internal server error` message is correctly returned). The risk is that stdout is often shipped to centralised log aggregators and may be stored in plaintext with broad access. In a future configuration where logs are forwarded to a third-party SaaS (Datadog, Splunk), stack traces could inadvertently reveal internal path structure and library versions.
- **Remediation:** Log full stack traces only at `debug` level or under a `NODE_ENV !== 'production'` guard. In production emit only the error message and a correlation ID.

---

### COMP-010: No Input Sanitization on Free-Text Fields (XSS Potential)
- **Severity:** Medium
- **Framework/Control:** OWASP-ASVS V5.3.3 · OWASP-ASVS V5.2.1
- **File/Component:** `Source/Backend/src/routes/workItems.ts`, `intake.ts`
- **Observation:** `title` and `description` fields are accepted from request bodies and stored verbatim without HTML encoding or sanitization. If any future view renders these fields as raw HTML (or if an XSS vulnerability exists in the frontend), stored cross-site scripting is possible. Currently the React frontend renders values via JSX (auto-escaped) so the attack surface is low, but there is no server-side defence layer.
- **Remediation:** Validate and strip/escape HTML from free-text inputs using a library such as `dompurify` (server-side via `isomorphic-dompurify`) or `validator.js` `escape()` before storing. Add a `Content-Security-Policy` (see COMP-003) as a defence-in-depth layer.

---

### COMP-011: No Correlation / Trace IDs in Logs
- **Severity:** Low
- **Framework/Control:** SOC2 CC7.1 · OWASP-ASVS V7.1.1
- **File/Component:** `Source/Backend/src/utils/logger.ts`, `app.ts`
- **Observation:** The structured logger emits `timestamp`, `level`, `message`, and `context` but no request correlation ID or OpenTelemetry trace ID. Despite CLAUDE.md requiring W3C `traceparent` header propagation and OpenTelemetry spans, neither is implemented. This means audit events for a single user request cannot be correlated across log lines, making incident reconstruction impossible.
- **Remediation:** Add a request-ID middleware that generates a `uuid` per request and stores it in `AsyncLocalStorage`. Inject this ID into every `logger` call via the context. Propagate `W3C traceparent` inbound and outbound as specified in the architecture rules.

---

### COMP-012: `pino` Dependency Listed but Custom Logger Used
- **Severity:** Low
- **Framework/Control:** OWASP-ASVS V14.2.1 (dependency hygiene)
- **File/Component:** `Source/Backend/package.json`, `Source/Backend/src/utils/logger.ts`
- **Observation:** `pino` is listed as a runtime dependency in `package.json` but the codebase uses a hand-rolled JSON logger (`utils/logger.ts`) that writes to `process.stdout`. `pino` is unused, adding an unnecessary dependency to the build footprint. Unused dependencies increase the attack surface (supply chain risk).
- **Remediation:** Either (a) migrate `utils/logger.ts` to use `pino` directly (gaining async I/O, child loggers, and redaction of sensitive fields), or (b) remove `pino` from `package.json`. Option (a) is strongly preferred as `pino`'s built-in `redact` feature would address sensitive-field masking for future PII fields.

---

## Compliance Matrix

| Control ID | Framework | Description | Status | Finding |
|---|---|---|---|---|
| CC6.1 | SOC2-Type2 | Logical access controls & authentication | ❌ FAIL | COMP-001, COMP-002 |
| CC6.2 | SOC2-Type2 | Access provisioning & user identity | ❌ FAIL | COMP-001 |
| CC6.3 | SOC2-Type2 | Role-based access restrictions | ❌ FAIL | COMP-001 |
| CC7.1 | SOC2-Type2 | System monitoring & audit logging | ⚠️ PARTIAL | COMP-005, COMP-011 |
| CC8.1 | SOC2-Type2 | Change management controls | ⚠️ PARTIAL | changeHistory present; no code-change audit |
| ASVS V2.1 | OWASP-ASVS L2 | Authentication architecture | ❌ FAIL | COMP-001 |
| ASVS V3.1 | OWASP-ASVS L2 | Session management fundamentals | ❌ FAIL | COMP-001 |
| ASVS V4.1 | OWASP-ASVS L2 | General access control design | ❌ FAIL | COMP-001 |
| ASVS V5.2 | OWASP-ASVS L2 | Input sanitization | ⚠️ PARTIAL | COMP-010 |
| ASVS V5.3 | OWASP-ASVS L2 | Output encoding | ⚠️ PARTIAL | COMP-010 (frontend JSX auto-escapes) |
| ASVS V7.1 | OWASP-ASVS L2 | Log content | ⚠️ PARTIAL | COMP-011 |
| ASVS V7.2 | OWASP-ASVS L2 | Log processing (audit events) | ❌ FAIL | COMP-005 |
| ASVS V7.4 | OWASP-ASVS L2 | Error handling | ⚠️ PARTIAL | COMP-009 |
| ASVS V9.1 | OWASP-ASVS L2 | Client communication (TLS) | ❌ FAIL | COMP-002 |
| ASVS V13.2 | OWASP-ASVS L2 | RESTful web service security | ⚠️ PARTIAL | COMP-006 |
| ASVS V14.2 | OWASP-ASVS L2 | Dependency hygiene | ⚠️ PARTIAL | COMP-012 |
| ASVS V14.3 | OWASP-ASVS L2 | Unintended security disclosure | ❌ FAIL | COMP-007 |
| ASVS V14.4 | OWASP-ASVS L2 | HTTP security headers | ❌ FAIL | COMP-003, COMP-004 |
| GDPR Art. 17 | GDPR | Right to erasure | ❌ FAIL | COMP-008 |
| GDPR Art. 32 | GDPR | Security of processing (encryption) | ❌ FAIL | COMP-002 |
| ISO27001 A.9 | ISO27001 | Access control | ❌ FAIL | COMP-001 |
| ISO27001 A.10 | ISO27001 | Cryptography | ❌ FAIL | COMP-002 |
| ISO27001 A.12.4 | ISO27001 | Logging and monitoring | ⚠️ PARTIAL | COMP-005, COMP-007 |
| ISO27001 A.14.1 | ISO27001 | Security in development | ❌ FAIL | COMP-003 |

**Controls passed (✅):** 0 of 24  
**Controls partially passed (⚠️):** 8 of 24 (33%)  
**Controls failed (❌):** 16 of 24 (67%)  
**Overall pass rate:** ~17% (full passes only) | ~50% (pass + partial)

**Grading per `security.config.yml`:** **F / D** — The 0% full-pass rate and `min_compliance_pass_rate: 90` threshold for grade A means the application does not currently meet any grading tier due to the complete absence of an authentication layer, which is the root cause cascading across the majority of failed controls.

---

## Priority Remediation Roadmap

| Priority | Finding | Effort | Impact |
|---|---|---|---|
| P1 | COMP-001 — Add authentication (JWT + RBAC) | High | Unblocks CC6.1/2/3, enables audit events |
| P1 | COMP-002 — TLS/HTTPS enforcement | Medium | GDPR Art. 32, OWASP V9 |
| P1 | COMP-005 — Implement required audit events | Medium | CC7.1, OWASP V7.2 |
| P2 | COMP-003 — Add Helmet.js | Low | OWASP V14.4 (one line of code) |
| P2 | COMP-004 — Configure CORS | Low | OWASP V14.4 |
| P2 | COMP-006 — Rate limiting + pagination cap | Low | OWASP V13.2 |
| P2 | COMP-007 — Protect /metrics | Low | OWASP V14.3 |
| P3 | COMP-008 — Hard delete / purge | Medium | GDPR Art. 17 |
| P3 | COMP-010 — Input sanitization | Low | OWASP V5 |
| P3 | COMP-011 — Correlation IDs | Medium | SOC2 CC7.1 |
| P4 | COMP-009 — Stack trace guard | Low | OWASP V7.4 |
| P4 | COMP-012 — Remove/use pino | Low | Supply-chain hygiene |
